package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/tanq16/expenseowl/internal/storage"
)

// PostgresHandler handles API requests with PostgreSQL backend and user authentication
type PostgresHandler struct {
	db *sql.DB
}

// NewPostgresHandler creates a new PostgreSQL handler
func NewPostgresHandler(db *sql.DB) *PostgresHandler {
	return &PostgresHandler{db: db}
}

// getUserStorage creates a user-scoped storage instance
func (h *PostgresHandler) getUserStorage(r *http.Request) (storage.Storage, error) {
	userID, ok := GetUserID(r)
	if !ok {
		return nil, http.ErrNoCookie // Reusing error for "no user context"
	}
	return storage.NewPostgresStore(h.db, userID), nil
}

// GetConfig returns user configuration
func (h *PostgresHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	config, err := store.GetConfig()
	if err != nil {
		http.Error(w, "Failed to get config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// GetCategories returns user categories
func (h *PostgresHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	categories, err := store.GetCategories()
	if err != nil {
		http.Error(w, "Failed to get categories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// UpdateCategories updates user categories
func (h *PostgresHandler) UpdateCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var categories []string
	if err := json.NewDecoder(r.Body).Decode(&categories); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateCategories(categories); err != nil {
		http.Error(w, "Failed to update categories", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetCurrency returns user currency
func (h *PostgresHandler) GetCurrency(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	currency, err := store.GetCurrency()
	if err != nil {
		http.Error(w, "Failed to get currency", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(currency))
}

// UpdateCurrency updates user currency
func (h *PostgresHandler) UpdateCurrency(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var currency string
	if err := json.NewDecoder(r.Body).Decode(&currency); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateCurrency(currency); err != nil {
		http.Error(w, "Failed to update currency", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetStartDate returns user start date
func (h *PostgresHandler) GetStartDate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	startDate, err := store.GetStartDate()
	if err != nil {
		http.Error(w, "Failed to get start date", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(startDate)
}

// UpdateStartDate updates user start date
func (h *PostgresHandler) UpdateStartDate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var startDate int
	if err := json.NewDecoder(r.Body).Decode(&startDate); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateStartDate(startDate); err != nil {
		http.Error(w, "Failed to update start date", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetExpenses returns all user expenses
func (h *PostgresHandler) GetExpenses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	expenses, err := store.GetAllExpenses()
	if err != nil {
		http.Error(w, "Failed to get expenses", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

// AddExpense adds a new expense
func (h *PostgresHandler) AddExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var expense storage.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.AddExpense(expense); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}

// EditExpense updates an existing expense
func (h *PostgresHandler) EditExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing expense ID", http.StatusBadRequest)
		return
	}

	var expense storage.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateExpense(id, expense); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteExpense deletes a single expense
func (h *PostgresHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing expense ID", http.StatusBadRequest)
		return
	}

	if err := store.RemoveExpense(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteMultipleExpenses deletes multiple expenses
func (h *PostgresHandler) DeleteMultipleExpenses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.RemoveMultipleExpenses(req.IDs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetRecurringExpenses returns all recurring expenses
func (h *PostgresHandler) GetRecurringExpenses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	expenses, err := store.GetRecurringExpenses()
	if err != nil {
		http.Error(w, "Failed to get recurring expenses", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

// AddRecurringExpense adds a new recurring expense
func (h *PostgresHandler) AddRecurringExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var expense storage.RecurringExpense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.AddRecurringExpense(expense); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}

// UpdateRecurringExpense updates a recurring expense
func (h *PostgresHandler) UpdateRecurringExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing recurring expense ID", http.StatusBadRequest)
		return
	}

	updateAll := r.URL.Query().Get("updateAll") == "true"

	var expense storage.RecurringExpense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateRecurringExpense(id, expense, updateAll); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteRecurringExpense deletes a recurring expense
func (h *PostgresHandler) DeleteRecurringExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing recurring expense ID", http.StatusBadRequest)
		return
	}

	removeAll := r.URL.Query().Get("removeAll") == "true"

	if err := store.RemoveRecurringExpense(id, removeAll); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Note: CSV Import/Export, Voice Parsing, and AI features not yet implemented for PostgreSQL
// These would require additional implementation
