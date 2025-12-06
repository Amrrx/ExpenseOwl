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
	AudioData          []byte    `json:"audioData"`
	Categories         []string  `json:"categories"`
	Currency           string    `json:"currency"`
	Today              time.Time `json:"today"`
	TranslateToEnglish bool      `json:"translateToEnglish"` // Translate expense names to English
}

// ReceiptParseRequest contains the context for receipt image parsing
type ReceiptParseRequest struct {
	ImageData          []byte    `json:"imageData"`
	ImageMIMEType      string    `json:"imageMimeType"` // image/jpeg, image/png, etc.
	Categories         []string  `json:"categories"`
	Currency           string    `json:"currency"`
	Today              time.Time `json:"today"`
	TranslateToEnglish bool      `json:"translateToEnglish"`
}

// ReceiptParseResponse contains the parsed expense from a receipt
type ReceiptParseResponse struct {
	Expense     *ExpenseParseResult `json:"expense"`
	Merchant    string              `json:"merchant"`    // Original merchant name from receipt
	ReceiptDate string              `json:"receiptDate"` // Date as shown on receipt (for display)
	Items       []ReceiptItem       `json:"items"`       // Line items (for reference)
	NeedsReview bool                `json:"needsReview"`
	Message     string              `json:"message"` // Any notes/warnings from parsing
}

// ReceiptItem represents a line item on a receipt
type ReceiptItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Amount      float64 `json:"amount"`
}

// AIProvider defines the interface for AI expense parsing providers
type AIProvider interface {
	ParseVoiceExpense(req VoiceParseRequest) (*VoiceParseResponse, error)
	ParseReceiptImage(req ReceiptParseRequest) (*ReceiptParseResponse, error)
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
