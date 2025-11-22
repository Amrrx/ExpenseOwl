package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type SyncHandler struct {
	db *sql.DB
}

func NewSyncHandler(db *sql.DB) *SyncHandler {
	return &SyncHandler{db: db}
}

type SyncPullRequest struct {
	LastSyncTime *time.Time `json:"last_sync_time"` // nil means full sync
}

type SyncPullResponse struct {
	Expenses          []SyncExpense          `json:"expenses"`
	RecurringExpenses []SyncRecurringExpense `json:"recurring_expenses"`
	Config            *SyncConfig            `json:"config"`
	ServerTime        time.Time              `json:"server_time"`
	IsFullSync        bool                   `json:"is_full_sync"`
}

type SyncExpense struct {
	ID          string     `json:"id"`
	RecurringID *string    `json:"recurring_id,omitempty"`
	Name        string     `json:"name"`
	Tags        []string   `json:"tags"`
	Category    string     `json:"category"`
	Amount      float64    `json:"amount"`
	Currency    string     `json:"currency"`
	Date        time.Time  `json:"date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type SyncRecurringExpense struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	Currency    string    `json:"currency"`
	Tags        []string  `json:"tags"`
	Category    string    `json:"category"`
	StartDate   time.Time `json:"start_date"`
	Interval    string    `json:"interval"`
	Occurrences int       `json:"occurrences"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SyncConfig struct {
	Categories []string `json:"categories"`
	Currency   string   `json:"currency"`
	StartDate  int      `json:"start_date"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type SyncPushRequest struct {
	Expenses          []SyncExpense          `json:"expenses"`
	RecurringExpenses []SyncRecurringExpense `json:"recurring_expenses"`
	Config            *SyncConfig            `json:"config,omitempty"`
	ClientTime        time.Time              `json:"client_time"`
}

type SyncPushResponse struct {
	Success       bool                `json:"success"`
	Conflicts     []SyncConflict      `json:"conflicts,omitempty"`
	ServerTime    time.Time           `json:"server_time"`
	ProcessedIDs  SyncProcessedIDs    `json:"processed_ids"`
}

type SyncConflict struct {
	Type       string    `json:"type"` // "expense", "recurring_expense", "config"
	ID         string    `json:"id"`
	ClientData any       `json:"client_data"`
	ServerData any       `json:"server_data"`
	Resolution string    `json:"resolution"` // "server_wins", "client_wins"
}

type SyncProcessedIDs struct {
	Expenses          []string `json:"expenses"`
	RecurringExpenses []string `json:"recurring_expenses"`
}

// Pull gets all changes since last sync
func (h *SyncHandler) Pull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SyncPullRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	serverTime := time.Now()
	isFullSync := req.LastSyncTime == nil

	// Get expenses
	expenses, err := h.getExpensesSince(userID, req.LastSyncTime)
	if err != nil {
		log.Printf("Failed to get expenses: %v", err)
		http.Error(w, "Failed to get expenses", http.StatusInternalServerError)
		return
	}

	// Get recurring expenses
	recurringExpenses, err := h.getRecurringExpensesSince(userID, req.LastSyncTime)
	if err != nil {
		log.Printf("Failed to get recurring expenses: %v", err)
		http.Error(w, "Failed to get recurring expenses", http.StatusInternalServerError)
		return
	}

	// Get config
	config, err := h.getConfig(userID)
	if err != nil {
		log.Printf("Failed to get config: %v", err)
		http.Error(w, "Failed to get config", http.StatusInternalServerError)
		return
	}

	// Update last sync time
	if err := h.updateSyncState(userID, serverTime); err != nil {
		log.Printf("Failed to update sync state: %v", err)
	}

	response := SyncPullResponse{
		Expenses:          expenses,
		RecurringExpenses: recurringExpenses,
		Config:            config,
		ServerTime:        serverTime,
		IsFullSync:        isFullSync,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Push sends local changes to server
func (h *SyncHandler) Push(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SyncPushRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	serverTime := time.Now()
	conflicts := []SyncConflict{}
	processedIDs := SyncProcessedIDs{
		Expenses:          []string{},
		RecurringExpenses: []string{},
	}

	// Process expenses
	for _, expense := range req.Expenses {
		conflict, err := h.syncExpense(userID, expense)
		if err != nil {
			log.Printf("Failed to sync expense %s: %v", expense.ID, err)
			continue
		}
		if conflict != nil {
			conflicts = append(conflicts, *conflict)
		}
		processedIDs.Expenses = append(processedIDs.Expenses, expense.ID)
	}

	// Process recurring expenses
	for _, recurringExpense := range req.RecurringExpenses {
		conflict, err := h.syncRecurringExpense(userID, recurringExpense)
		if err != nil {
			log.Printf("Failed to sync recurring expense %s: %v", recurringExpense.ID, err)
			continue
		}
		if conflict != nil {
			conflicts = append(conflicts, *conflict)
		}
		processedIDs.RecurringExpenses = append(processedIDs.RecurringExpenses, recurringExpense.ID)
	}

	// Process config
	if req.Config != nil {
		if err := h.syncConfig(userID, req.Config); err != nil {
			log.Printf("Failed to sync config: %v", err)
		}
	}

	// Update last sync time
	if err := h.updateSyncState(userID, serverTime); err != nil {
		log.Printf("Failed to update sync state: %v", err)
	}

	response := SyncPushResponse{
		Success:      true,
		Conflicts:    conflicts,
		ServerTime:   serverTime,
		ProcessedIDs: processedIDs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getExpensesSince retrieves expenses modified since lastSyncTime
func (h *SyncHandler) getExpensesSince(userID string, lastSyncTime *time.Time) ([]SyncExpense, error) {
	query := `
		SELECT id, recurring_id, name, tags, category, amount, currency, date, created_at, updated_at
		FROM expenses
		WHERE user_id = $1
	`
	args := []interface{}{userID}

	if lastSyncTime != nil {
		query += " AND updated_at > $2"
		args = append(args, *lastSyncTime)
	}

	query += " ORDER BY updated_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expenses := []SyncExpense{}
	for rows.Next() {
		var e SyncExpense
		var recurringID sql.NullString
		var tags []string

		err := rows.Scan(
			&e.ID,
			&recurringID,
			&e.Name,
			pq.Array(&tags),
			&e.Category,
			&e.Amount,
			&e.Currency,
			&e.Date,
			&e.CreatedAt,
			&e.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if recurringID.Valid {
			e.RecurringID = &recurringID.String
		}
		e.Tags = tags

		expenses = append(expenses, e)
	}

	return expenses, nil
}

// getRecurringExpensesSince retrieves recurring expenses modified since lastSyncTime
func (h *SyncHandler) getRecurringExpensesSince(userID string, lastSyncTime *time.Time) ([]SyncRecurringExpense, error) {
	query := `
		SELECT id, name, amount, currency, tags, category, start_date, interval, occurrences, created_at, updated_at
		FROM recurring_expenses
		WHERE user_id = $1
	`
	args := []interface{}{userID}

	if lastSyncTime != nil {
		query += " AND updated_at > $2"
		args = append(args, *lastSyncTime)
	}

	query += " ORDER BY updated_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recurringExpenses := []SyncRecurringExpense{}
	for rows.Next() {
		var re SyncRecurringExpense
		var tags []string

		err := rows.Scan(
			&re.ID,
			&re.Name,
			&re.Amount,
			&re.Currency,
			pq.Array(&tags),
			&re.Category,
			&re.StartDate,
			&re.Interval,
			&re.Occurrences,
			&re.CreatedAt,
			&re.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		re.Tags = tags
		recurringExpenses = append(recurringExpenses, re)
	}

	return recurringExpenses, nil
}

// getConfig retrieves user configuration
func (h *SyncHandler) getConfig(userID string) (*SyncConfig, error) {
	var config SyncConfig
	var categories []string

	err := h.db.QueryRow(`
		SELECT categories, currency, start_date, updated_at
		FROM user_configs
		WHERE user_id = $1
	`, userID).Scan(pq.Array(&categories), &config.Currency, &config.StartDate, &config.UpdatedAt)

	if err != nil {
		return nil, err
	}

	config.Categories = categories
	return &config, nil
}

// syncExpense syncs a single expense, returns conflict if any
func (h *SyncHandler) syncExpense(userID string, expense SyncExpense) (*SyncConflict, error) {
	// Check if expense exists
	var existingUpdatedAt time.Time
	err := h.db.QueryRow(`
		SELECT updated_at FROM expenses WHERE id = $1 AND user_id = $2
	`, expense.ID, userID).Scan(&existingUpdatedAt)

	if err == sql.ErrNoRows {
		// New expense, insert
		return nil, h.insertExpense(userID, expense)
	} else if err != nil {
		return nil, err
	}

	// Expense exists, check for conflicts (last-write-wins)
	if existingUpdatedAt.After(expense.UpdatedAt) {
		// Server has newer version, return conflict
		serverExpense, err := h.getExpenseByID(userID, expense.ID)
		if err != nil {
			return nil, err
		}
		return &SyncConflict{
			Type:       "expense",
			ID:         expense.ID,
			ClientData: expense,
			ServerData: serverExpense,
			Resolution: "server_wins",
		}, nil
	}

	// Client version is newer or same, update
	return nil, h.updateExpense(userID, expense)
}

// syncRecurringExpense syncs a single recurring expense
func (h *SyncHandler) syncRecurringExpense(userID string, re SyncRecurringExpense) (*SyncConflict, error) {
	var existingUpdatedAt time.Time
	err := h.db.QueryRow(`
		SELECT updated_at FROM recurring_expenses WHERE id = $1 AND user_id = $2
	`, re.ID, userID).Scan(&existingUpdatedAt)

	if err == sql.ErrNoRows {
		return nil, h.insertRecurringExpense(userID, re)
	} else if err != nil {
		return nil, err
	}

	if existingUpdatedAt.After(re.UpdatedAt) {
		serverRE, err := h.getRecurringExpenseByID(userID, re.ID)
		if err != nil {
			return nil, err
		}
		return &SyncConflict{
			Type:       "recurring_expense",
			ID:         re.ID,
			ClientData: re,
			ServerData: serverRE,
			Resolution: "server_wins",
		}, nil
	}

	return nil, h.updateRecurringExpense(userID, re)
}

// syncConfig syncs user configuration
func (h *SyncHandler) syncConfig(userID string, config *SyncConfig) error {
	_, err := h.db.Exec(`
		UPDATE user_configs
		SET categories = $1, currency = $2, start_date = $3, updated_at = $4
		WHERE user_id = $5
	`, pq.Array(config.Categories), config.Currency, config.StartDate, time.Now(), userID)
	return err
}

// Helper functions for database operations
func (h *SyncHandler) insertExpense(userID string, expense SyncExpense) error {
	if expense.Tags == nil {
		expense.Tags = []string{}
	}

	var recurringID *string
	if expense.RecurringID != nil {
		recurringID = expense.RecurringID
	}

	_, err := h.db.Exec(`
		INSERT INTO expenses (id, user_id, recurring_id, name, tags, category, amount, currency, date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, expense.ID, userID, recurringID, expense.Name, pq.Array(expense.Tags), expense.Category, expense.Amount, expense.Currency, expense.Date, expense.CreatedAt, expense.UpdatedAt)
	return err
}

func (h *SyncHandler) updateExpense(userID string, expense SyncExpense) error {
	if expense.Tags == nil {
		expense.Tags = []string{}
	}

	var recurringID *string
	if expense.RecurringID != nil {
		recurringID = expense.RecurringID
	}

	_, err := h.db.Exec(`
		UPDATE expenses
		SET recurring_id = $1, name = $2, tags = $3, category = $4, amount = $5, currency = $6, date = $7, updated_at = $8
		WHERE id = $9 AND user_id = $10
	`, recurringID, expense.Name, pq.Array(expense.Tags), expense.Category, expense.Amount, expense.Currency, expense.Date, expense.UpdatedAt, expense.ID, userID)
	return err
}

func (h *SyncHandler) insertRecurringExpense(userID string, re SyncRecurringExpense) error {
	if re.Tags == nil {
		re.Tags = []string{}
	}

	_, err := h.db.Exec(`
		INSERT INTO recurring_expenses (id, user_id, name, amount, currency, tags, category, start_date, interval, occurrences, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, re.ID, userID, re.Name, re.Amount, re.Currency, pq.Array(re.Tags), re.Category, re.StartDate, re.Interval, re.Occurrences, re.CreatedAt, re.UpdatedAt)
	return err
}

func (h *SyncHandler) updateRecurringExpense(userID string, re SyncRecurringExpense) error {
	if re.Tags == nil {
		re.Tags = []string{}
	}

	_, err := h.db.Exec(`
		UPDATE recurring_expenses
		SET name = $1, amount = $2, currency = $3, tags = $4, category = $5, start_date = $6, interval = $7, occurrences = $8, updated_at = $9
		WHERE id = $10 AND user_id = $11
	`, re.Name, re.Amount, re.Currency, pq.Array(re.Tags), re.Category, re.StartDate, re.Interval, re.Occurrences, re.UpdatedAt, re.ID, userID)
	return err
}

func (h *SyncHandler) getExpenseByID(userID, expenseID string) (*SyncExpense, error) {
	var e SyncExpense
	var recurringID sql.NullString
	var tags []string

	err := h.db.QueryRow(`
		SELECT id, recurring_id, name, tags, category, amount, currency, date, created_at, updated_at
		FROM expenses
		WHERE id = $1 AND user_id = $2
	`, expenseID, userID).Scan(
		&e.ID,
		&recurringID,
		&e.Name,
		pq.Array(&tags),
		&e.Category,
		&e.Amount,
		&e.Currency,
		&e.Date,
		&e.CreatedAt,
		&e.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if recurringID.Valid {
		e.RecurringID = &recurringID.String
	}
	e.Tags = tags

	return &e, nil
}

func (h *SyncHandler) getRecurringExpenseByID(userID, reID string) (*SyncRecurringExpense, error) {
	var re SyncRecurringExpense
	var tags []string

	err := h.db.QueryRow(`
		SELECT id, name, amount, currency, tags, category, start_date, interval, occurrences, created_at, updated_at
		FROM recurring_expenses
		WHERE id = $1 AND user_id = $2
	`, reID, userID).Scan(
		&re.ID,
		&re.Name,
		&re.Amount,
		&re.Currency,
		pq.Array(&tags),
		&re.Category,
		&re.StartDate,
		&re.Interval,
		&re.Occurrences,
		&re.CreatedAt,
		&re.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	re.Tags = tags
	return &re, nil
}

// updateSyncState updates last sync timestamp for user
func (h *SyncHandler) updateSyncState(userID string, syncTime time.Time) error {
	_, err := h.db.Exec(`
		INSERT INTO sync_state (id, user_id, client_id, last_sync_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, client_id)
		DO UPDATE SET last_sync_at = $4
	`, uuid.New().String(), userID, "web", syncTime)
	return err
}

// GetSyncStatus returns the last sync time for a user
func (h *SyncHandler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var lastSyncAt time.Time

	err := h.db.QueryRow(`
		SELECT last_sync_at
		FROM sync_state
		WHERE user_id = $1 AND client_id = $2
	`, userID, "web").Scan(&lastSyncAt)

	if err == sql.ErrNoRows {
		// No sync state yet
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"has_synced":     false,
			"last_sync_time": nil,
		})
		return
	} else if err != nil {
		log.Printf("Failed to get sync status: %v", err)
		http.Error(w, "Failed to get sync status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"has_synced":     true,
		"last_sync_time": lastSyncAt,
	})
}
