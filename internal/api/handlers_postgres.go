package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/tanq16/expenseowl/internal/ai"
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

// GetAIConfig returns AI configuration for the user
func (h *PostgresHandler) GetAIConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	aiConfig, err := store.GetAIConfig()
	if err != nil {
		http.Error(w, "Failed to get AI config", http.StatusInternalServerError)
		return
	}

	// Mask the API key for security
	maskedConfig := struct {
		Enabled   bool   `json:"enabled"`
		Provider  string `json:"provider"`
		APIKey    string `json:"apiKey"`
		Model     string `json:"model"`
		HasAPIKey bool   `json:"hasApiKey"`
	}{
		Enabled:   aiConfig.Enabled,
		Provider:  aiConfig.Provider,
		APIKey:    maskAPIKey(aiConfig.APIKey),
		Model:     aiConfig.Model,
		HasAPIKey: aiConfig.APIKey != "",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maskedConfig)
}

// UpdateAIConfig updates AI configuration for the user
func (h *PostgresHandler) UpdateAIConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var newConfig storage.AIConfig
	if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateAIConfig(newConfig); err != nil {
		http.Error(w, "Failed to save AI config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// TestAIConnection tests the AI provider connection
func (h *PostgresHandler) TestAIConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	aiConfig, err := store.GetAIConfig()
	if err != nil {
		http.Error(w, "Failed to get AI config", http.StatusInternalServerError)
		return
	}

	if aiConfig.APIKey == "" {
		http.Error(w, "API key not configured", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Connection successful"})
}

// ParseVoiceExpense handles voice input parsing with multipart/form-data
func (h *PostgresHandler) ParseVoiceExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if AI is enabled
	aiConfig, err := store.GetAIConfig()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
		log.Printf("API ERROR: Failed to get AI config: %v\n", err)
		return
	}

	if !aiConfig.Enabled {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "AI features are not enabled. Please configure AI settings first."})
		return
	}

	if aiConfig.APIKey == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "AI API key not configured"})
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Failed to parse form data"})
		return
	}

	file, _, err := r.FormFile("audio")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Audio file is required"})
		return
	}
	defer file.Close()

	audioBytes, err := io.ReadAll(file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to read audio file"})
		return
	}

	// Get user's categories and currency
	categories, err := store.GetCategories()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get categories"})
		log.Printf("API ERROR: Failed to get categories: %v\n", err)
		return
	}

	currency, err := store.GetCurrency()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get currency"})
		log.Printf("API ERROR: Failed to get currency: %v\n", err)
		return
	}

	// Create AI provider
	provider, err := ai.NewProvider(ai.ProviderType(aiConfig.Provider), aiConfig.APIKey, aiConfig.Model)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to create AI provider: %v", err)})
		log.Printf("API ERROR: Failed to create AI provider: %v\n", err)
		return
	}

	// Parse voice expense
	parseReq := ai.VoiceParseRequest{
		AudioData:  audioBytes,
		Categories: categories,
		Currency:   currency,
		Today:      time.Now(),
	}

	response, err := provider.ParseVoiceExpense(parseReq)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to parse voice: %v", err)})
		log.Printf("API ERROR: Failed to parse voice: %v\n", err)
		return
	}

	// Return parsed expenses for review
	writeJSON(w, http.StatusOK, response)
	log.Printf("HTTP: Successfully parsed %d expenses from voice input\n", len(response.Expenses))
}

// ParseVoiceExpenseBase64 handles voice input parsing with JSON base64 encoded audio
func (h *PostgresHandler) ParseVoiceExpenseBase64(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if AI is enabled
	aiConfig, err := store.GetAIConfig()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
		return
	}

	if !aiConfig.Enabled || aiConfig.APIKey == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "AI features are not enabled"})
		return
	}

	// Parse JSON request with base64 audio
	var req struct {
		AudioData string `json:"audioData"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	audioBytes, err := base64.StdEncoding.DecodeString(req.AudioData)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid base64 audio data"})
		return
	}

	categories, _ := store.GetCategories()
	currency, _ := store.GetCurrency()

	provider, err := ai.NewProvider(ai.ProviderType(aiConfig.Provider), aiConfig.APIKey, aiConfig.Model)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to create AI provider"})
		return
	}

	response, err := provider.ParseVoiceExpense(ai.VoiceParseRequest{
		AudioData:  audioBytes,
		Categories: categories,
		Currency:   currency,
		Today:      time.Now(),
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to parse voice: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, response)
}

// maskAPIKey masks an API key for display
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}
