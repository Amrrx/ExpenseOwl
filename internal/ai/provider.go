package ai

import (
	"fmt"
	"time"
)

// ExpenseParseResult represents a single parsed expense from voice input
type ExpenseParseResult struct {
	Name       string    `json:"name"`
	Amount     float64   `json:"amount"`
	Category   string    `json:"category"`
	Tags       []string  `json:"tags,omitempty"`
	Date       time.Time `json:"date"`
	Confidence float64   `json:"confidence"` // 0-1, show warning if < 0.7
	Ambiguous  bool      `json:"ambiguous"`  // triggers "ask user"
}

// VoiceParseResponse contains the parsed expenses and metadata
type VoiceParseResponse struct {
	Expenses    []ExpenseParseResult `json:"expenses"`
	Transcript  string               `json:"transcript"`  // for debugging/display
	NeedsReview bool                 `json:"needsReview"` // confidence issues
}

// VoiceParseRequest contains the context needed for parsing
type VoiceParseRequest struct {
	AudioData  []byte    `json:"audioData"`
	Categories []string  `json:"categories"`
	Currency   string    `json:"currency"`
	Today      time.Time `json:"today"`
}

// AIProvider defines the interface for AI expense parsing providers
type AIProvider interface {
	ParseVoiceExpense(req VoiceParseRequest) (*VoiceParseResponse, error)
	Name() string
	ValidateConfig(apiKey, model string) error
}

// ProviderType represents supported AI providers
type ProviderType string

const (
	ProviderGemini    ProviderType = "gemini"
	ProviderAnthropic ProviderType = "anthropic"
	ProviderOpenAI    ProviderType = "openai"
)

// NewProvider creates a new AI provider instance
func NewProvider(providerType ProviderType, apiKey, model string) (AIProvider, error) {
	switch providerType {
	case ProviderGemini:
		return NewGeminiProvider(apiKey, model)
	case ProviderAnthropic:
		return nil, fmt.Errorf("anthropic provider not yet implemented")
	case ProviderOpenAI:
		return nil, fmt.Errorf("openai provider not yet implemented")
	default:
		return nil, fmt.Errorf("unsupported provider: %s", providerType)
	}
}
