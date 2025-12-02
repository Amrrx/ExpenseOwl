package storage

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// validateExpense validates expense data
func validateExpense(expense Expense) error {
	if strings.TrimSpace(expense.Name) == "" {
		return errors.New("expense name cannot be empty")
	}
	if expense.Amount == 0 {
		return errors.New("expense amount cannot be zero")
	}
	if strings.TrimSpace(expense.Category) == "" {
		return errors.New("expense category cannot be empty")
	}
	if expense.Date.IsZero() {
		return errors.New("expense date cannot be empty")
	}
	return nil
}

// validateRecurringExpense validates recurring expense data
func validateRecurringExpense(expense RecurringExpense) error {
	if strings.TrimSpace(expense.Name) == "" {
		return errors.New("recurring expense name cannot be empty")
	}
	if expense.Amount == 0 {
		return errors.New("recurring expense amount cannot be zero")
	}
	if strings.TrimSpace(expense.Category) == "" {
		return errors.New("recurring expense category cannot be empty")
	}
	if expense.Occurrences < 2 {
		return errors.New("recurring expense must have at least 2 occurrences")
	}
	validIntervals := map[string]bool{"daily": true, "weekly": true, "monthly": true, "yearly": true}
	if !validIntervals[expense.Interval] {
		return errors.New("invalid interval type, must be: daily, weekly, monthly, or yearly")
	}
	return nil
}

// PostgresStore implements Storage interface with PostgreSQL backend
type PostgresStore struct {
	db     *sql.DB
	userID string // Current user context
}

// NewPostgresStore creates a new PostgreSQL storage instance for a specific user
func NewPostgresStore(db *sql.DB, userID string) *PostgresStore {
	return &PostgresStore{
		db:     db,
		userID: userID,
	}
}

// Close closes the database connection
func (s *PostgresStore) Close() error {
	// Don't close the shared DB connection
	return nil
}

// GetConfig retrieves user configuration
func (s *PostgresStore) GetConfig() (*Config, error) {
	var config Config

	err := s.db.QueryRow(`
		SELECT categories, currency, start_date
		FROM user_configs
		WHERE user_id = $1
	`, s.userID).Scan(pq.Array(&config.Categories), &config.Currency, &config.StartDate)

	if err == sql.ErrNoRows {
		// Return default config if not found
		return &Config{
			Categories: []string{"Food", "Groceries", "Travel", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping", "Miscellaneous", "Income"},
			Currency:   "usd",
			StartDate:  1,
		}, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	// Get recurring expenses
	recurringExpenses, err := s.GetRecurringExpenses()
	if err != nil {
		// Log but don't fail
		config.RecurringExpenses = []RecurringExpense{}
	} else {
		config.RecurringExpenses = recurringExpenses
	}

	return &config, nil
}

// GetCategories retrieves user categories
func (s *PostgresStore) GetCategories() ([]string, error) {
	var categories []string
	err := s.db.QueryRow(`
		SELECT categories FROM user_configs WHERE user_id = $1
	`, s.userID).Scan(pq.Array(&categories))

	if err == sql.ErrNoRows {
		return []string{"Food", "Groceries", "Travel", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping", "Miscellaneous", "Income"}, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}

	return categories, nil
}

// UpdateCategories updates user categories
func (s *PostgresStore) UpdateCategories(categories []string) error {
	_, err := s.db.Exec(`
		INSERT INTO user_configs (user_id, categories, currency, start_date, updated_at)
		VALUES ($1, $2, 'usd', 1, $3)
		ON CONFLICT (user_id) DO UPDATE SET categories = $2, updated_at = $3
	`, s.userID, pq.Array(categories), time.Now())

	return err
}

// GetCurrency retrieves user currency
func (s *PostgresStore) GetCurrency() (string, error) {
	var currency string
	err := s.db.QueryRow(`
		SELECT currency FROM user_configs WHERE user_id = $1
	`, s.userID).Scan(&currency)

	if err == sql.ErrNoRows {
		return "usd", nil
	}

	return currency, err
}

// UpdateCurrency updates user currency
func (s *PostgresStore) UpdateCurrency(currency string) error {
	_, err := s.db.Exec(`
		INSERT INTO user_configs (user_id, categories, currency, start_date, updated_at)
		VALUES ($1, ARRAY['Food', 'Groceries', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Miscellaneous', 'Income'], $2, 1, $3)
		ON CONFLICT (user_id) DO UPDATE SET currency = $2, updated_at = $3
	`, s.userID, currency, time.Now())

	return err
}

// GetStartDate retrieves user start date
func (s *PostgresStore) GetStartDate() (int, error) {
	var startDate int
	err := s.db.QueryRow(`
		SELECT start_date FROM user_configs WHERE user_id = $1
	`, s.userID).Scan(&startDate)

	if err == sql.ErrNoRows {
		return 1, nil
	}

	return startDate, err
}

// UpdateStartDate updates user start date
func (s *PostgresStore) UpdateStartDate(startDate int) error {
	_, err := s.db.Exec(`
		INSERT INTO user_configs (user_id, categories, currency, start_date, updated_at)
		VALUES ($1, ARRAY['Food', 'Groceries', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Miscellaneous', 'Income'], 'usd', $2, $3)
		ON CONFLICT (user_id) DO UPDATE SET start_date = $2, updated_at = $3
	`, s.userID, startDate, time.Now())

	return err
}

// GetAIConfig retrieves AI configuration (stored in user_configs for now)
func (s *PostgresStore) GetAIConfig() (*AIConfig, error) {
	// For now, AI config is not in the database schema
	// Return empty config
	return &AIConfig{
		Enabled:  false,
		Provider: "",
		APIKey:   "",
		Model:    "",
	}, nil
}

// UpdateAIConfig updates AI configuration
func (s *PostgresStore) UpdateAIConfig(aiConfig AIConfig) error {
	// AI config not yet in database schema
	// This would require schema migration
	return nil
}

// GetAllExpenses retrieves all expenses for the user
func (s *PostgresStore) GetAllExpenses() ([]Expense, error) {
	rows, err := s.db.Query(`
		SELECT id, recurring_id, name, tags, category, amount, currency, date, created_at
		FROM expenses
		WHERE user_id = $1 AND is_deleted = false
		ORDER BY date DESC
	`, s.userID)

	if err != nil {
		return nil, fmt.Errorf("failed to query expenses: %w", err)
	}
	defer rows.Close()

	var expenses []Expense
	for rows.Next() {
		var exp Expense
		var tagsJSON string
		var recurringID sql.NullString
		var createdAt time.Time

		err := rows.Scan(
			&exp.ID,
			&recurringID,
			&exp.Name,
			&tagsJSON,
			&exp.Category,
			&exp.Amount,
			&exp.Currency,
			&exp.Date,
			&createdAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan expense: %w", err)
		}

		if recurringID.Valid {
			exp.RecurringID = recurringID.String
		}

		// Parse tags JSON
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &exp.Tags); err != nil {
				exp.Tags = []string{}
			}
		} else {
			exp.Tags = []string{}
		}

		expenses = append(expenses, exp)
	}

	if expenses == nil {
		expenses = []Expense{}
	}

	return expenses, nil
}

// GetExpense retrieves a single expense
func (s *PostgresStore) GetExpense(id string) (Expense, error) {
	var exp Expense
	var tagsJSON string
	var recurringID sql.NullString
	var createdAt time.Time

	err := s.db.QueryRow(`
		SELECT id, recurring_id, name, tags, category, amount, currency, date, created_at
		FROM expenses
		WHERE id = $1 AND user_id = $2 AND is_deleted = false
	`, id, s.userID).Scan(
		&exp.ID,
		&recurringID,
		&exp.Name,
		&tagsJSON,
		&exp.Category,
		&exp.Amount,
		&exp.Currency,
		&exp.Date,
		&createdAt,
	)

	if err == sql.ErrNoRows {
		return exp, errors.New("expense not found")
	}

	if err != nil {
		return exp, fmt.Errorf("failed to get expense: %w", err)
	}

	if recurringID.Valid {
		exp.RecurringID = recurringID.String
	}

	// Parse tags
	if tagsJSON != "" {
		if err := json.Unmarshal([]byte(tagsJSON), &exp.Tags); err != nil {
			exp.Tags = []string{}
		}
	} else {
		exp.Tags = []string{}
	}

	return exp, nil
}

// AddExpense adds a new expense
func (s *PostgresStore) AddExpense(expense Expense) error {
	// Generate ID if not provided
	if expense.ID == "" {
		expense.ID = uuid.New().String()
	}

	// Validate expense
	if err := validateExpense(expense); err != nil {
		return err
	}

	// Ensure tags is not nil
	if expense.Tags == nil {
		expense.Tags = []string{}
	}

	var recurringID sql.NullString
	if expense.RecurringID != "" {
		recurringID.String = expense.RecurringID
		recurringID.Valid = true
	}

	_, err := s.db.Exec(`
		INSERT INTO expenses (id, user_id, recurring_id, name, tags, category, amount, currency, date, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, expense.ID, s.userID, recurringID, expense.Name, pq.Array(expense.Tags), expense.Category, expense.Amount, expense.Currency, expense.Date, time.Now())

	if err != nil {
		return fmt.Errorf("failed to insert expense: %w", err)
	}

	return nil
}

// UpdateExpense updates an existing expense
func (s *PostgresStore) UpdateExpense(id string, expense Expense) error {
	// Validate expense
	if err := validateExpense(expense); err != nil {
		return err
	}

	// Ensure tags is not nil
	if expense.Tags == nil {
		expense.Tags = []string{}
	}


	var recurringID sql.NullString
	if expense.RecurringID != "" {
		recurringID.String = expense.RecurringID
		recurringID.Valid = true
	}

	result, err := s.db.Exec(`
		UPDATE expenses
		SET name = $1, tags = $2, category = $3, amount = $4, currency = $5, date = $6,
		    recurring_id = $7, last_modified_at = $8
		WHERE id = $9 AND user_id = $10 AND is_deleted = false
	`, expense.Name, pq.Array(expense.Tags), expense.Category, expense.Amount, expense.Currency, expense.Date,
		recurringID, time.Now(), id, s.userID)

	if err != nil {
		return fmt.Errorf("failed to update expense: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("expense not found or already deleted")
	}

	return nil
}

// RemoveExpense soft deletes an expense
func (s *PostgresStore) RemoveExpense(id string) error {
	result, err := s.db.Exec(`
		UPDATE expenses
		SET is_deleted = true, last_modified_at = $1
		WHERE id = $2 AND user_id = $3
	`, time.Now(), id, s.userID)

	if err != nil {
		return fmt.Errorf("failed to delete expense: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("expense not found")
	}

	return nil
}

// AddMultipleExpenses adds multiple expenses
func (s *PostgresStore) AddMultipleExpenses(expenses []Expense) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO expenses (id, user_id, recurring_id, name, tags, category, amount, currency, date, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, expense := range expenses {
		if expense.ID == "" {
			expense.ID = uuid.New().String()
		}

		if err := validateExpense(expense); err != nil {
			return err
		}


		var recurringID sql.NullString
		if expense.RecurringID != "" {
			recurringID.String = expense.RecurringID
			recurringID.Valid = true
		}

		_, err = stmt.Exec(expense.ID, s.userID, recurringID, expense.Name, pq.Array(expense.Tags),
			expense.Category, expense.Amount, expense.Currency, expense.Date, time.Now())

		if err != nil {
			return fmt.Errorf("failed to insert expense %s: %w", expense.ID, err)
		}
	}

	return tx.Commit()
}

// RemoveMultipleExpenses soft deletes multiple expenses
func (s *PostgresStore) RemoveMultipleExpenses(ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	// Build query with placeholders
	query := `UPDATE expenses SET is_deleted = true, last_modified_at = $1 WHERE user_id = $2 AND id IN (`
	args := []interface{}{time.Now(), s.userID}

	for i, id := range ids {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("$%d", i+3)
		args = append(args, id)
	}
	query += ")"

	_, err := s.db.Exec(query, args...)
	return err
}

// GetRecurringExpenses retrieves all recurring expenses for the user
func (s *PostgresStore) GetRecurringExpenses() ([]RecurringExpense, error) {
	rows, err := s.db.Query(`
		SELECT id, name, amount, currency, tags, category, start_date, interval_type, occurrences
		FROM recurring_expenses
		WHERE user_id = $1 AND is_deleted = false
		ORDER BY created_at DESC
	`, s.userID)

	if err != nil {
		return nil, fmt.Errorf("failed to query recurring expenses: %w", err)
	}
	defer rows.Close()

	var expenses []RecurringExpense
	for rows.Next() {
		var exp RecurringExpense
		var tagsJSON string

		err := rows.Scan(
			&exp.ID,
			&exp.Name,
			&exp.Amount,
			&exp.Currency,
			&tagsJSON,
			&exp.Category,
			&exp.StartDate,
			&exp.Interval,
			&exp.Occurrences,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan recurring expense: %w", err)
		}

		// Parse tags
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &exp.Tags); err != nil {
				exp.Tags = []string{}
			}
		} else {
			exp.Tags = []string{}
		}

		expenses = append(expenses, exp)
	}

	if expenses == nil {
		expenses = []RecurringExpense{}
	}

	return expenses, nil
}

// GetRecurringExpense retrieves a single recurring expense
func (s *PostgresStore) GetRecurringExpense(id string) (RecurringExpense, error) {
	var exp RecurringExpense
	var tagsJSON string

	err := s.db.QueryRow(`
		SELECT id, name, amount, currency, tags, category, start_date, interval_type, occurrences
		FROM recurring_expenses
		WHERE id = $1 AND user_id = $2 AND is_deleted = false
	`, id, s.userID).Scan(
		&exp.ID,
		&exp.Name,
		&exp.Amount,
		&exp.Currency,
		&tagsJSON,
		&exp.Category,
		&exp.StartDate,
		&exp.Interval,
		&exp.Occurrences,
	)

	if err == sql.ErrNoRows {
		return exp, errors.New("recurring expense not found")
	}

	if err != nil {
		return exp, fmt.Errorf("failed to get recurring expense: %w", err)
	}

	// Parse tags
	if tagsJSON != "" {
		if err := json.Unmarshal([]byte(tagsJSON), &exp.Tags); err != nil {
			exp.Tags = []string{}
		}
	} else {
		exp.Tags = []string{}
	}

	return exp, nil
}

// AddRecurringExpense adds a new recurring expense
func (s *PostgresStore) AddRecurringExpense(recurringExpense RecurringExpense) error {
	if recurringExpense.ID == "" {
		recurringExpense.ID = uuid.New().String()
	}

	if err := validateRecurringExpense(recurringExpense); err != nil {
		return err
	}

	// Ensure tags is not nil
	if recurringExpense.Tags == nil {
		recurringExpense.Tags = []string{}
	}

	_, err := s.db.Exec(`
		INSERT INTO recurring_expenses (id, user_id, name, amount, currency, tags, category, start_date, interval_type, occurrences, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, recurringExpense.ID, s.userID, recurringExpense.Name, recurringExpense.Amount, recurringExpense.Currency,
		pq.Array(recurringExpense.Tags), recurringExpense.Category, recurringExpense.StartDate, recurringExpense.Interval,
		recurringExpense.Occurrences, time.Now())

	if err != nil {
		return fmt.Errorf("failed to insert recurring expense: %w", err)
	}

	return nil
}

// UpdateRecurringExpense updates a recurring expense
func (s *PostgresStore) UpdateRecurringExpense(id string, recurringExpense RecurringExpense, updateAll bool) error {
	if err := validateRecurringExpense(recurringExpense); err != nil {
		return err
	}

	// Ensure tags is not nil
	if recurringExpense.Tags == nil {
		recurringExpense.Tags = []string{}
	}

	// Update the recurring expense template
	result, err := s.db.Exec(`
		UPDATE recurring_expenses
		SET name = $1, amount = $2, currency = $3, tags = $4, category = $5,
		    start_date = $6, interval_type = $7, occurrences = $8, last_modified_at = $9
		WHERE id = $10 AND user_id = $11 AND is_deleted = false
	`, recurringExpense.Name, recurringExpense.Amount, recurringExpense.Currency, pq.Array(recurringExpense.Tags),
		recurringExpense.Category, recurringExpense.StartDate, recurringExpense.Interval,
		recurringExpense.Occurrences, time.Now(), id, s.userID)

	if err != nil {
		return fmt.Errorf("failed to update recurring expense: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("recurring expense not found")
	}

	// If updateAll is true, update all generated expenses
	if updateAll {
		_, err = s.db.Exec(`
			UPDATE expenses
			SET name = $1, amount = $2, currency = $3, tags = $4, category = $5, last_modified_at = $6
			WHERE recurring_id = $7 AND user_id = $8 AND is_deleted = false
		`, recurringExpense.Name, recurringExpense.Amount, recurringExpense.Currency, pq.Array(recurringExpense.Tags),
			recurringExpense.Category, time.Now(), id, s.userID)

		if err != nil {
			return fmt.Errorf("failed to update generated expenses: %w", err)
		}
	}

	return nil
}

// RemoveRecurringExpense removes a recurring expense
func (s *PostgresStore) RemoveRecurringExpense(id string, removeAll bool) error {
	// Soft delete the recurring expense
	result, err := s.db.Exec(`
		UPDATE recurring_expenses
		SET is_deleted = true, last_modified_at = $1
		WHERE id = $2 AND user_id = $3
	`, time.Now(), id, s.userID)

	if err != nil {
		return fmt.Errorf("failed to delete recurring expense: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("recurring expense not found")
	}

	// If removeAll is true, also delete all generated expenses
	if removeAll {
		_, err = s.db.Exec(`
			UPDATE expenses
			SET is_deleted = true, last_modified_at = $1
			WHERE recurring_id = $2 AND user_id = $3
		`, time.Now(), id, s.userID)

		if err != nil {
			return fmt.Errorf("failed to delete generated expenses: %w", err)
		}
	}

	return nil
}
