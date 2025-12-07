package database

import (
	"database/sql"
	"errors"
	"os"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"github.com/tanq16/expenseowl/internal/auth"
	"github.com/tanq16/expenseowl/internal/logging"
	"github.com/tanq16/expenseowl/migrations"
)

func RunMigrations(db *sql.DB) error {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return err
	}

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithInstance("iofs", source, "postgres", driver)
	if err != nil {
		return err
	}

	version, dirty, _ := m.Version()
	logging.Info("migration_status", "current_version", version, "dirty", dirty)

	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}

	if errors.Is(err, migrate.ErrNoChange) {
		logging.Info("migrations_up_to_date")
	} else {
		newVersion, _, _ := m.Version()
		logging.Info("migrations_applied", "new_version", newVersion)
	}

	return nil
}

func SeedInitialUser(db *sql.DB) error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		logging.Debug("seed_skipped", "reason", "users already exist")
		return nil
	}

	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")

	if email == "" || password == "" {
		logging.Warn("seed_skipped", "reason", "ADMIN_EMAIL or ADMIN_PASSWORD not set")
		return nil
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}

	userID := uuid.New().String()
	now := time.Now()

	_, err = db.Exec(`
		INSERT INTO users (id, email, password_hash, full_name, is_active, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, 'Admin', true, true, $4, $4)
	`, userID, email, passwordHash, now)

	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO user_configs (user_id, categories, currency, start_date)
		VALUES ($1, $2, 'usd', 1)
	`, userID, `{"Food","Groceries","Travel","Rent","Utilities","Entertainment","Healthcare","Shopping","Miscellaneous","Income"}`)

	if err != nil {
		logging.Warn("seed_config_failed", "error", err)
	}

	logging.Info("seed_user_created", "email", email)
	return nil
}
