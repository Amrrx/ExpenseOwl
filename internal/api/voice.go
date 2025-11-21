package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/tanq16/expenseowl/internal/ai"
	"github.com/tanq16/expenseowl/internal/storage"
)

// VoiceParseRequest is the HTTP request for voice parsing
type VoiceParseRequest struct {
	AudioData string `json:"audioData"` // Base64 encoded audio
}

// ParseVoiceExpense handles voice input parsing
func (h *Handler) ParseVoiceExpense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	// Check if AI is enabled
	aiConfig, err := h.storage.GetAIConfig()
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

	// Parse request body
	var req VoiceParseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	if req.AudioData == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Audio data is required"})
		return
	}

	// Decode audio data
	audioBytes, err := ai.DecodeBase64Audio(req.AudioData)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Failed to decode audio: %v", err)})
		return
	}

	// Get user's categories and currency
	categories, err := h.storage.GetCategories()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get categories"})
		log.Printf("API ERROR: Failed to get categories: %v\n", err)
		return
	}

	currency, err := h.storage.GetCurrency()
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

// GetAIConfig returns the AI configuration (with masked API key)
func (h *Handler) GetAIConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	aiConfig, err := h.storage.GetAIConfig()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
		log.Printf("API ERROR: Failed to get AI config: %v\n", err)
		return
	}

	// Mask the API key for security
	maskedConfig := struct {
		Enabled    bool   `json:"enabled"`
		Provider   string `json:"provider"`
		APIKey     string `json:"apiKey"`
		Model      string `json:"model"`
		HasAPIKey  bool   `json:"hasApiKey"` // Indicates if key is set
	}{
		Enabled:   aiConfig.Enabled,
		Provider:  aiConfig.Provider,
		APIKey:    ai.MaskAPIKey(aiConfig.APIKey),
		Model:     aiConfig.Model,
		HasAPIKey: aiConfig.APIKey != "",
	}

	writeJSON(w, http.StatusOK, maskedConfig)
}

// UpdateAIConfig updates the AI configuration
func (h *Handler) UpdateAIConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	var newConfig storage.AIConfig
	if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Validate provider
	validProviders := map[string]bool{
		"gemini":    true,
		"anthropic": true,
		"openai":    true,
	}

	if !validProviders[newConfig.Provider] {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid AI provider"})
		return
	}

	// If enabled, validate API key
	if newConfig.Enabled {
		if newConfig.APIKey == "" {
			writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "API key is required when AI is enabled"})
			return
		}

		// Optionally validate the API key by testing connection
		provider, err := ai.NewProvider(ai.ProviderType(newConfig.Provider), newConfig.APIKey, newConfig.Model)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Invalid provider config: %v", err)})
			return
		}

		if err := provider.ValidateConfig(newConfig.APIKey, newConfig.Model); err != nil {
			writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("API key validation failed: %v", err)})
			return
		}
	}

	// Save configuration
	if err := h.storage.UpdateAIConfig(newConfig); err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to save AI config"})
		log.Printf("API ERROR: Failed to save AI config: %v\n", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
	log.Println("HTTP: AI configuration updated successfully")
}

// TestAIConnection tests the AI provider connection
func (h *Handler) TestAIConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, ErrorResponse{Error: "Method not allowed"})
		return
	}

	// Get current AI config
	aiConfig, err := h.storage.GetAIConfig()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to get AI config"})
		return
	}

	if aiConfig.APIKey == "" {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "API key not configured"})
		return
	}

	// Create provider and test
	provider, err := ai.NewProvider(ai.ProviderType(aiConfig.Provider), aiConfig.APIKey, aiConfig.Model)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Failed to create provider: %v", err)})
		return
	}

	if err := provider.ValidateConfig(aiConfig.APIKey, aiConfig.Model); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Connection test failed: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success", "message": "Connection successful"})
}
