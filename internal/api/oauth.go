package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/tanq16/expenseowl/internal/auth"
	"github.com/tanq16/expenseowl/internal/logging"
	"google.golang.org/api/idtoken"
)

type OAuthHandler struct {
	db              *sql.DB
	jwtManager      *auth.JWTManager
	googleClientID  string
	appleClientID   string
	appleTeamID     string
	appleKeyID      string
	appleKeyPath    string
}

type user struct {
	ID        string
	Email     string
	FullName  string
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewOAuthHandler(db *sql.DB, jwtManager *auth.JWTManager, googleClientID, appleClientID, appleTeamID, appleKeyID, appleKeyPath string) *OAuthHandler {
	return &OAuthHandler{
		db:             db,
		jwtManager:     jwtManager,
		googleClientID: googleClientID,
		appleClientID:  appleClientID,
		appleTeamID:    appleTeamID,
		appleKeyID:     appleKeyID,
		appleKeyPath:   appleKeyPath,
	}
}

type OAuthVerifyRequest struct {
	IDToken string `json:"id_token"`
}

type OAuthVerifyResponse struct {
	User         UserInfo       `json:"user"`
	AccessToken  string         `json:"access_token"`
	RefreshToken string         `json:"refresh_token"`
	ExpiresIn    int64          `json:"expires_in"`
	IsNewUser    bool           `json:"is_new_user"`
}

// GoogleVerify verifies Google ID token and creates/links OAuth account
func (h *OAuthHandler) GoogleVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OAuthVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.IDToken == "" {
		http.Error(w, "ID token is required", http.StatusBadRequest)
		return
	}

	// Verify Google ID token
	payload, err := idtoken.Validate(context.Background(), req.IDToken, h.googleClientID)
	if err != nil {
		logging.Warn("google_oauth_invalid_token", "error", err)
		http.Error(w, "Invalid ID token", http.StatusUnauthorized)
		return
	}

	// Extract claims
	email, _ := payload.Claims["email"].(string)
	emailVerified, _ := payload.Claims["email_verified"].(bool)
	name, _ := payload.Claims["name"].(string)
	providerUserID := payload.Subject

	if email == "" || !emailVerified {
		logging.Warn("google_oauth_email_not_verified", "email", email)
		http.Error(w, "Email not verified", http.StatusBadRequest)
		return
	}

	// Find or create user and OAuth account
	user, isNewUser, err := h.findOrCreateOAuthUser("google", providerUserID, email, name, req.IDToken, "")
	if err != nil {
		logging.Error("google_oauth_user_error", "email", email, "error", err)
		http.Error(w, "Failed to process OAuth login", http.StatusInternalServerError)
		return
	}

	// Generate JWT tokens
	tokens, err := h.jwtManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		logging.Error("google_oauth_token_error", "user_id", user.ID, "error", err)
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	// Store refresh token
	if err := h.storeRefreshToken(user.ID, tokens.RefreshToken); err != nil {
		logging.Error("google_oauth_store_token_error", "user_id", user.ID, "error", err)
		http.Error(w, "Failed to store refresh token", http.StatusInternalServerError)
		return
	}

	logging.Info("google_oauth_login", "user_id", user.ID, "email", user.Email, "is_new_user", isNewUser)

	// Return response
	response := OAuthVerifyResponse{
		User: UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FullName:  user.FullName,
			CreatedAt: user.CreatedAt,
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
		IsNewUser:    isNewUser,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// AppleVerify verifies Apple ID token and creates/links OAuth account
func (h *OAuthHandler) AppleVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OAuthVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.IDToken == "" {
		http.Error(w, "ID token is required", http.StatusBadRequest)
		return
	}

	// TODO: Implement Apple ID token verification
	// For now, return not implemented error
	// When implementing, you'll need to:
	// 1. Parse JWT (Apple ID token is a JWT)
	// 2. Verify signature using Apple's public keys
	// 3. Validate claims (aud, iss, exp, etc.)
	// 4. Extract user info (sub, email, email_verified)

	http.Error(w, "Apple Sign-In not yet implemented - requires Apple Developer account setup", http.StatusNotImplemented)
}

// findOrCreateOAuthUser finds existing user by OAuth account or email, or creates new user
func (h *OAuthHandler) findOrCreateOAuthUser(provider, providerUserID, email, fullName, accessToken, refreshToken string) (*user, bool, error) {
	tx, err := h.db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	// Check if OAuth account exists
	var userID string
	err = tx.QueryRow(`
		SELECT user_id FROM oauth_accounts
		WHERE provider = $1 AND provider_user_id = $2
	`, provider, providerUserID).Scan(&userID)

	if err == nil {
		// OAuth account exists, get user
		var u user
		err = tx.QueryRow(`
			SELECT id, email, full_name, is_active, created_at, updated_at
			FROM users WHERE id = $1
		`, userID).Scan(&u.ID, &u.Email, &u.FullName, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)

		if err != nil {
			return nil, false, err
		}

		// Update OAuth tokens
		_, err = tx.Exec(`
			UPDATE oauth_accounts
			SET access_token = $1, refresh_token = $2, updated_at = $3
			WHERE provider = $4 AND provider_user_id = $5
		`, accessToken, refreshToken, time.Now(), provider, providerUserID)

		if err != nil {
			return nil, false, err
		}

		if err := tx.Commit(); err != nil {
			return nil, false, err
		}

		return &u, false, nil
	}

	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	// OAuth account doesn't exist, check if user exists by email
	var existingUserID string
	err = tx.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&existingUserID)

	isNewUser := false
	if errors.Is(err, sql.ErrNoRows) {
		// User doesn't exist, create new user
		existingUserID = uuid.New().String()
		_, err = tx.Exec(`
			INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, existingUserID, email, "", fullName, true, time.Now(), time.Now())

		if err != nil {
			return nil, false, err
		}

		// Create default config for new user
		configID := uuid.New().String()
		defaultCategories := []string{"Food", "Groceries", "Travel", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping", "Miscellaneous", "Income"}
		_, err = tx.Exec(`
			INSERT INTO user_configs (id, user_id, categories, currency, start_date, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, configID, existingUserID, defaultCategories, "usd", 1, time.Now(), time.Now())

		if err != nil {
			return nil, false, err
		}

		isNewUser = true
	} else if err != nil {
		return nil, false, err
	}

	// Link OAuth account to user
	oauthAccountID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, access_token, refresh_token, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, oauthAccountID, existingUserID, provider, providerUserID, email, accessToken, refreshToken, time.Now(), time.Now())

	if err != nil {
		return nil, false, err
	}

	// Get the user
	var u user
	err = tx.QueryRow(`
		SELECT id, email, full_name, is_active, created_at, updated_at
		FROM users WHERE id = $1
	`, existingUserID).Scan(&u.ID, &u.Email, &u.FullName, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return nil, false, err
	}

	if err := tx.Commit(); err != nil {
		return nil, false, err
	}

	return &u, isNewUser, nil
}

// storeRefreshToken stores refresh token in database
func (h *OAuthHandler) storeRefreshToken(userID, token string) error {
	tokenID := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, tokenID, userID, token, time.Now().Add(7*24*time.Hour), time.Now())
	return err
}
