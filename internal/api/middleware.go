package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/tanq16/expenseowl/internal/auth"
)

type contextKey string

const (
	UserIDContextKey  contextKey = "userID"
	EmailContextKey   contextKey = "email"
	ClaimsContextKey  contextKey = "claims"
)

// AuthMiddleware validates JWT tokens and extracts user info
func AuthMiddleware(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			// Check for "Bearer " prefix
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Validate token
			claims, err := jwtManager.ValidateToken(tokenString, auth.AccessToken)
			if err != nil {
				if err == auth.ErrExpiredToken {
					http.Error(w, "Token has expired", http.StatusUnauthorized)
					return
				}
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Add user info to request context
			ctx := context.WithValue(r.Context(), UserIDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, EmailContextKey, claims.Email)
			ctx = context.WithValue(ctx, ClaimsContextKey, claims)

			// Call next handler with updated context
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts the user ID from request context
func GetUserID(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(UserIDContextKey).(string)
	return userID, ok
}

// GetEmail extracts the email from request context
func GetEmail(r *http.Request) (string, bool) {
	email, ok := r.Context().Value(EmailContextKey).(string)
	return email, ok
}

// GetClaims extracts the full claims from request context
func GetClaims(r *http.Request) (*auth.Claims, bool) {
	claims, ok := r.Context().Value(ClaimsContextKey).(*auth.Claims)
	return claims, ok
}

// CORS middleware for development
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
