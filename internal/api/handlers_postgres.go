package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/tanq16/expenseowl/internal/ai"
	"github.com/tanq16/expenseowl/internal/logging"
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

	userID, _ := GetUserID(r)
	store, err := h.getUserStorage(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var expense storage.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		logging.Warn("expense_add_invalid_body", "user_id", userID, "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.AddExpense(expense); err != nil {
		logging.Error("expense_add_error", "user_id", userID, "error", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logging.Info("expense_added", "user_id", userID, "expense_id", expense.ID, "amount", expense.Amount)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}

// EditExpense updates an existing expense
func (h *PostgresHandler) EditExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserID(r)
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
		logging.Warn("expense_edit_invalid_body", "user_id", userID, "expense_id", id, "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.UpdateExpense(id, expense); err != nil {
		logging.Error("expense_edit_error", "user_id", userID, "expense_id", id, "error", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logging.Info("expense_updated", "user_id", userID, "expense_id", id)
	w.WriteHeader(http.StatusOK)
}

// DeleteExpense deletes a single expense
func (h *PostgresHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := GetUserID(r)
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
		logging.Error("expense_delete_error", "user_id", userID, "expense_id", id, "error", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logging.Info("expense_deleted", "user_id", userID, "expense_id", id)
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
		logging.Error("voice_parse_ai_config_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
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
		logging.Error("voice_parse_categories_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get categories"})
		return
	}

	currency, err := store.GetCurrency()
	if err != nil {
		logging.Error("voice_parse_currency_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get currency"})
		return
	}

	// Create AI provider
	provider, err := ai.NewProvider(ai.ProviderType(aiConfig.Provider), aiConfig.APIKey, aiConfig.Model)
	if err != nil {
		logging.Error("voice_parse_provider_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to create AI provider: %v", err)})
		return
	}

	// Parse voice expense
	parseReq := ai.VoiceParseRequest{
		AudioData:          audioBytes,
		Categories:         categories,
		Currency:           currency,
		Today:              time.Now(),
		TranslateToEnglish: aiConfig.TranslateToEnglish,
	}

	response, err := provider.ParseVoiceExpense(parseReq)
	if err != nil {
		logging.Error("voice_parse_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to parse voice: %v", err)})
		return
	}

	logging.Info("voice_parsed", "expense_count", len(response.Expenses))
	writeJSON(w, http.StatusOK, response)
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

// ParseReceiptExpense handles receipt image parsing with JSON base64 encoded image
func (h *PostgresHandler) ParseReceiptExpense(w http.ResponseWriter, r *http.Request) {
	logging.Debug("receipt_parse_request")
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
		logging.Error("receipt_parse_ai_config_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
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

	// Parse JSON request with base64 image
	var req struct {
		ImageData string `json:"imageData"`
		MIMEType  string `json:"mimeType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	if req.ImageData == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Image data is required"})
		return
	}

	// Default MIME type to JPEG if not specified
	mimeType := req.MIMEType
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	imageBytes, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid base64 image data"})
		return
	}

	// Get user's categories and currency
	categories, err := store.GetCategories()
	if err != nil {
		logging.Error("receipt_parse_categories_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get categories"})
		return
	}

	currency, err := store.GetCurrency()
	if err != nil {
		logging.Error("receipt_parse_currency_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get currency"})
		return
	}

	// Create AI provider
	provider, err := ai.NewProvider(ai.ProviderType(aiConfig.Provider), aiConfig.APIKey, aiConfig.Model)
	if err != nil {
		logging.Error("receipt_parse_provider_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to create AI provider: %v", err)})
		return
	}

	// Parse receipt image
	parseReq := ai.ReceiptParseRequest{
		ImageData:          imageBytes,
		ImageMIMEType:      mimeType,
		Categories:         categories,
		Currency:           currency,
		Today:              time.Now(),
		TranslateToEnglish: aiConfig.TranslateToEnglish,
	}

	logging.Debug("receipt_parse_calling_ai", "size_bytes", len(imageBytes), "mime_type", mimeType)
	response, err := provider.ParseReceiptImage(parseReq)
	if err != nil {
		logging.Error("receipt_parse_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: fmt.Sprintf("Failed to parse receipt: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, response)
	if response.Expense != nil {
		logging.Info("receipt_parsed", "merchant", response.Merchant, "amount", response.Expense.Amount)
	} else {
		logging.Warn("receipt_parse_no_expense", "message", response.Message)
	}
}

// maskAPIKey masks an API key for display
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}

// GetUserPreferences returns user preferences (no AI config exposed)
func (h *PostgresHandler) GetUserPreferences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	aiConfig, err := store.GetAIConfig()
	if err != nil {
		logging.Error("preferences_get_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get preferences"})
		return
	}

	prefs := UserPreferences{
		TranslateToEnglish: aiConfig.TranslateToEnglish,
	}

	writeJSON(w, http.StatusOK, prefs)
}

// UpdateUserPreferences updates user preferences
func (h *PostgresHandler) UpdateUserPreferences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	store, err := h.getUserStorage(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	var prefs UserPreferences
	if err := json.NewDecoder(r.Body).Decode(&prefs); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Get current AI config and update only user preferences
	aiConfig, err := store.GetAIConfig()
	if err != nil {
		logging.Error("preferences_update_get_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get current config"})
		return
	}

	aiConfig.TranslateToEnglish = prefs.TranslateToEnglish

	if err := store.UpdateAIConfig(*aiConfig); err != nil {
		logging.Error("preferences_save_error", "error", err)
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to save preferences"})
		return
	}

	logging.Info("preferences_updated")
	writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}
