package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tanq16/expenseowl/internal/auth"
	"github.com/tanq16/expenseowl/internal/storage"
)

type AuthHandler struct {
	db         *sql.DB
	jwtManager *auth.JWTManager
}

func NewAuthHandler(db *sql.DB, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtManager: jwtManager,
	}
}

// RegisterRequest is the request body for user registration
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// LoginRequest is the request body for user login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RefreshRequest is the request body for token refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// AuthResponse is the response for successful authentication
type AuthResponse struct {
	User         UserInfo          `json:"user"`
	Tokens       *auth.TokenPair   `json:"tokens"`
}

type UserInfo struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	CreatedAt time.Time `json:"created_at"`
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FullName = storage.SanitizeString(req.FullName)

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 8 {
		http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "User with this email already exists", http.StatusConflict)
		return
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Create user
	userID := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(`
		INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, $5, $5)
	`, userID, req.Email, passwordHash, req.FullName, now)

	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Create default config for the user
	_, err = h.db.Exec(`
		INSERT INTO user_configs (user_id, categories, currency, start_date)
		VALUES ($1, $2, $3, $4)
	`, userID, `["Food", "Groceries", "Travel", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping", "Miscellaneous", "Income"]`, "usd", 1)

	if err != nil {
		// Log error but don't fail registration
		// User can set config later
	}

	// Generate tokens
	tokens, err := h.jwtManager.GenerateTokenPair(userID, req.Email)
	if err != nil {
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	// Store refresh token
	err = h.storeRefreshToken(userID, tokens.RefreshToken)
	if err != nil {
		log.Printf("Failed to store refresh token: %v", err)
		http.Error(w, fmt.Sprintf("Failed to store refresh token: %v", err), http.StatusInternalServerError)
		return
	}

	// Return user info and tokens
	response := AuthResponse{
		User: UserInfo{
			ID:        userID,
			Email:     req.Email,
			FullName:  req.FullName,
			CreatedAt: now,
		},
		Tokens: tokens,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Login handles user authentication
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	// Get user from database
	var user struct {
		ID           string
		Email        string
		PasswordHash string
		FullName     string
		IsActive     bool
		CreatedAt    time.Time
	}

	err := h.db.QueryRow(`
		SELECT id, email, password_hash, full_name, is_active, created_at
		FROM users
		WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.IsActive, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if !user.IsActive {
		http.Error(w, "Account is deactivated", http.StatusForbidden)
		return
	}

	// Check password
	if err := auth.CheckPassword(req.Password, user.PasswordHash); err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate tokens
	tokens, err := h.jwtManager.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	// Store refresh token
	err = h.storeRefreshToken(user.ID, tokens.RefreshToken)
	if err != nil {
		http.Error(w, "Failed to store refresh token", http.StatusInternalServerError)
		return
	}

	// Return user info and tokens
	response := AuthResponse{
		User: UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FullName:  user.FullName,
			CreatedAt: user.CreatedAt,
		},
		Tokens: tokens,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate refresh token
	claims, err := h.jwtManager.ValidateToken(req.RefreshToken, auth.RefreshToken)
	if err != nil {
		http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	// Check if refresh token exists in database and is not revoked
	var exists bool
	err = h.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM refresh_tokens
			WHERE user_id = $1 AND token = $2 AND revoked = false
		)
	`, claims.UserID, req.RefreshToken).Scan(&exists)

	if err != nil || !exists {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	// Generate new token pair
	tokens, err := h.jwtManager.GenerateTokenPair(claims.UserID, claims.Email)
	if err != nil {
		http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
		return
	}

	// Revoke old refresh token
	_, err = h.db.Exec(`
		UPDATE refresh_tokens
		SET revoked = true, revoked_at = $1
		WHERE user_id = $2 AND token = $3
	`, time.Now(), claims.UserID, req.RefreshToken)

	if err != nil {
		// Log error but continue
	}

	// Store new refresh token
	err = h.storeRefreshToken(claims.UserID, tokens.RefreshToken)
	if err != nil {
		http.Error(w, "Failed to store refresh token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokens)
}

// Logout handles user logout by revoking refresh token
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate refresh token to get user ID
	claims, err := h.jwtManager.ValidateToken(req.RefreshToken, auth.RefreshToken)
	if err != nil {
		// Even if token is invalid, return success for logout
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
		return
	}

	// Revoke refresh token
	_, err = h.db.Exec(`
		UPDATE refresh_tokens
		SET revoked = true, revoked_at = $1
		WHERE user_id = $2 AND token = $3 AND revoked = false
	`, time.Now(), claims.UserID, req.RefreshToken)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}

// storeRefreshToken stores a refresh token in the database
func (h *AuthHandler) storeRefreshToken(userID, token string) error {
	// Refresh tokens expire in 7 days (matching JWT config)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	_, err := h.db.Exec(`
		INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
		VALUES ($1, $2, $3, $4)
	`, userID, token, expiresAt, time.Now())

	return err
}

// hashToken creates a simple hash of the token for storage
// In production, use a proper cryptographic hash
func hashToken(token string) string {
	// For now, just use a substring as a simple identifier
	// In production, use SHA-256 or similar
	if len(token) > 32 {
		return token[len(token)-32:]
	}
	return token
}
