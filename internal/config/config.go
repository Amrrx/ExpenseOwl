package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret              string
	JWTAccessTokenExpiry   time.Duration
	JWTRefreshTokenExpiry  time.Duration

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string

	AppleClientID        string
	AppleTeamID          string
	AppleKeyID           string
	ApplePrivateKeyPath  string
	AppleRedirectURI     string

	ServerPort string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "expenseowl"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "expenseowl"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:              getEnv("JWT_SECRET", "change-this-in-production"),
		JWTAccessTokenExpiry:   parseDuration(getEnv("JWT_ACCESS_TOKEN_EXPIRY", "15m"), 15*time.Minute),
		JWTRefreshTokenExpiry:  parseDuration(getEnv("JWT_REFRESH_TOKEN_EXPIRY", "7d"), 7*24*time.Hour),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/auth/google/callback"),

		AppleClientID:       getEnv("APPLE_CLIENT_ID", ""),
		AppleTeamID:         getEnv("APPLE_TEAM_ID", ""),
		AppleKeyID:          getEnv("APPLE_KEY_ID", ""),
		ApplePrivateKeyPath: getEnv("APPLE_PRIVATE_KEY_PATH", ""),
		AppleRedirectURI:    getEnv("APPLE_REDIRECT_URI", "http://localhost:8080/api/auth/apple/callback"),

		ServerPort: getEnv("PORT", "8080"),
	}

	if cfg.JWTSecret == "change-this-in-production" || cfg.JWTSecret == "change-this-to-a-random-secret-key-in-production" {
		fmt.Println("⚠️  WARNING: Using default JWT secret. Change JWT_SECRET in production!")
	}

	return cfg, nil
}

// ConnectionString returns the PostgreSQL connection string
func (c *Config) ConnectionString() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseDuration(str string, defaultDuration time.Duration) time.Duration {
	// Parse duration strings like "15m", "7d", "24h"
	if str == "" {
		return defaultDuration
	}

	// Handle day suffix
	if len(str) > 1 && str[len(str)-1] == 'd' {
		days := str[:len(str)-1]
		if d, err := time.ParseDuration(days + "h"); err == nil {
			return d * 24
		}
	}

	if d, err := time.ParseDuration(str); err == nil {
		return d
	}

	return defaultDuration
}
