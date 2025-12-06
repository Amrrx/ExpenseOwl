package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GeminiProvider implements AIProvider for Google Gemini
type GeminiProvider struct {
	apiKey string
	model  string
}

// NewGeminiProvider creates a new Gemini provider
func NewGeminiProvider(apiKey, model string) (*GeminiProvider, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("gemini API key is required")
	}
	if model == "" {
		model = "gemini-1.5-flash" // Default model with audio support
	}
	return &GeminiProvider{
		apiKey: apiKey,
		model:  model,
	}, nil
}

// Name returns the provider name
func (g *GeminiProvider) Name() string {
	return "gemini"
}

// ValidateConfig validates the API key and model
func (g *GeminiProvider) ValidateConfig(apiKey, model string) error {
	if apiKey == "" {
		return fmt.Errorf("API key is required")
	}
	// Quick validation by attempting to create a client
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("invalid API key: %v", err)
	}
	defer client.Close()
	return nil
}

// ParseVoiceExpense parses audio input into structured expenses
func (g *GeminiProvider) ParseVoiceExpense(req VoiceParseRequest) (*VoiceParseResponse, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(g.apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel(g.model)

	// Configure model for structured output
	model.SetTemperature(0.2) // Lower temperature for more consistent parsing
	model.ResponseMIMEType = "application/json"

	// Build the prompt
	prompt := g.buildPrompt(req)

	// Create audio part from audio data
	audioPart := genai.Blob{
		MIMEType: "audio/webm", // WebM is common for browser recording
		Data:     req.AudioData,
	}

	// Send request
	resp, err := model.GenerateContent(ctx, genai.Text(prompt), audioPart)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %v", err)
	}

	// Parse response
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from gemini")
	}

	// Extract JSON from response
	textPart, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return nil, fmt.Errorf("unexpected response format")
	}

	// Parse the JSON response
	var geminiResp struct {
		Transcript string `json:"transcript"`
		Expenses   []struct {
			Name       string   `json:"name"`
			Amount     float64  `json:"amount"`
			Category   string   `json:"category"`
			Tags       []string `json:"tags,omitempty"`
			DateOffset int      `json:"dateOffset"` // Days from today (0=today, -1=yesterday)
			Confidence float64  `json:"confidence"`
			Ambiguous  bool     `json:"ambiguous"`
		} `json:"expenses"`
	}

	if err := json.Unmarshal([]byte(textPart), &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse gemini response: %v", err)
	}

	// Convert to our response format
	response := &VoiceParseResponse{
		Transcript:  geminiResp.Transcript,
		NeedsReview: false,
		Expenses:    make([]ExpenseParseResult, 0, len(geminiResp.Expenses)),
	}

	for _, exp := range geminiResp.Expenses {
		// Calculate actual date from offset
		expenseDate := req.Today.AddDate(0, 0, exp.DateOffset)

		// Mark for review if confidence is low
		if exp.Confidence < 0.7 || exp.Ambiguous {
			response.NeedsReview = true
		}

		response.Expenses = append(response.Expenses, ExpenseParseResult{
			Name:       exp.Name,
			Amount:     exp.Amount,
			Category:   exp.Category,
			Tags:       exp.Tags,
			Date:       expenseDate,
			Confidence: exp.Confidence,
			Ambiguous:  exp.Ambiguous,
		})
	}

	return response, nil
}

// buildPrompt creates the prompt for expense parsing
func (g *GeminiProvider) buildPrompt(req VoiceParseRequest) string {
	categoriesList := strings.Join(req.Categories, ", ")
	todayStr := req.Today.Format("2006-01-02")

	// Add translation instruction if enabled
	nameInstruction := `- name: Brief description in the same language as spoken (e.g., "Coffee", "Lunch", "قهوة")`
	if req.TranslateToEnglish {
		nameInstruction = `- name: Brief description translated to English (e.g., if spoken in Arabic "قهوة", output "Coffee")`
	}

	return fmt.Sprintf(`You are an expense tracking assistant. Parse the audio input to extract ALL expenses mentioned.

User's available categories: [%s]
User's currency: %s
Today's date: %s

For each expense found, extract:
%s
- amount: MUST be NEGATIVE for expenses (e.g., -20.50), POSITIVE for income
- category: MUST match one from the user's category list. If unsure, use "Miscellaneous"
- tags: Optional array of relevant tags
- dateOffset: Days relative to today (0 = today, -1 = yesterday, -7 = week ago). Default to 0 if not mentioned.
- confidence: 0.0 to 1.0, how certain you are about this expense
- ambiguous: true if the expense is unclear or might need user review

Handle natural language dates:
- "yesterday" → dateOffset: -1
- "last week" → dateOffset: -7
- "two days ago" → dateOffset: -2
- no mention → dateOffset: 0

Return valid JSON with this structure:
{
  "transcript": "the full transcription of what was said",
  "expenses": [
    {
      "name": "Coffee",
      "amount": -5.50,
      "category": "Food",
      "tags": ["morning"],
      "dateOffset": 0,
      "confidence": 0.95,
      "ambiguous": false
    }
  ]
}

IMPORTANT:
- Extract EVERY expense mentioned, even if multiple in one sentence
- Amounts are NEGATIVE for spending, POSITIVE for income
- If you hear "fifty on coffee and groceries", that's TWO expenses
- Category MUST be from the provided list or "Miscellaneous"
- If amount is ambiguous (e.g., "about fifty"), set ambiguous: true and confidence < 0.7`,
		categoriesList, req.Currency, todayStr, nameInstruction)
}

// ParseReceiptImage parses a receipt image into a structured expense
func (g *GeminiProvider) ParseReceiptImage(req ReceiptParseRequest) (*ReceiptParseResponse, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(g.apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel(g.model)

	// Configure model for structured output
	model.SetTemperature(0.2)
	model.ResponseMIMEType = "application/json"

	// Build the receipt parsing prompt
	prompt := g.buildReceiptPrompt(req)

	// Create image part from image data
	imagePart := genai.Blob{
		MIMEType: req.ImageMIMEType,
		Data:     req.ImageData,
	}

	// Send request
	resp, err := model.GenerateContent(ctx, genai.Text(prompt), imagePart)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %v", err)
	}

	// Parse response
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from gemini")
	}

	textPart, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return nil, fmt.Errorf("unexpected response format")
	}

	// Parse the JSON response
	var geminiResp struct {
		Merchant    string  `json:"merchant"`
		Total       float64 `json:"total"`
		Date        string  `json:"date"`        // YYYY-MM-DD format
		Category    string  `json:"category"`
		Confidence  float64 `json:"confidence"`
		Currency    string  `json:"currency"`    // Detected currency code
		Items       []struct {
			Description string  `json:"description"`
			Quantity    int     `json:"quantity"`
			Amount      float64 `json:"amount"`
		} `json:"items"`
		Message     string `json:"message"`
		IsReceipt   bool   `json:"isReceipt"`
	}

	if err := json.Unmarshal([]byte(textPart), &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse gemini response: %v", err)
	}

	// Handle non-receipt images
	if !geminiResp.IsReceipt {
		return &ReceiptParseResponse{
			Expense:     nil,
			NeedsReview: true,
			Message:     geminiResp.Message,
		}, nil
	}

	// Parse the date from receipt
	var expenseDate time.Time
	if geminiResp.Date != "" {
		parsed, err := time.Parse("2006-01-02", geminiResp.Date)
		if err == nil {
			expenseDate = parsed
		} else {
			expenseDate = req.Today
		}
	} else {
		expenseDate = req.Today
	}

	// Build expense name from merchant
	expenseName := geminiResp.Merchant
	if req.TranslateToEnglish && expenseName != "" {
		// Merchant names are usually already in local form, keep as-is
		// Translation would be handled by a separate prompt if needed
	}

	// Convert items
	items := make([]ReceiptItem, 0, len(geminiResp.Items))
	for _, item := range geminiResp.Items {
		items = append(items, ReceiptItem{
			Description: item.Description,
			Quantity:    item.Quantity,
			Amount:      item.Amount,
		})
	}

	// Create expense (amount is negative for expenses)
	expense := &ExpenseParseResult{
		Name:       expenseName,
		Amount:     -geminiResp.Total, // Negative for expense
		Category:   geminiResp.Category,
		Date:       expenseDate,
		Confidence: geminiResp.Confidence,
		Ambiguous:  geminiResp.Confidence < 0.7,
	}

	return &ReceiptParseResponse{
		Expense:     expense,
		Merchant:    geminiResp.Merchant,
		ReceiptDate: geminiResp.Date,
		Items:       items,
		NeedsReview: geminiResp.Confidence < 0.7,
		Message:     geminiResp.Message,
	}, nil
}

// buildReceiptPrompt creates the prompt for receipt image parsing
func (g *GeminiProvider) buildReceiptPrompt(req ReceiptParseRequest) string {
	categoriesList := strings.Join(req.Categories, ", ")
	todayStr := req.Today.Format("2006-01-02")

	return fmt.Sprintf(`You are a receipt scanning assistant. Analyze the receipt image and extract expense information.

User's available categories: [%s]
User's preferred currency: %s
Today's date: %s

Extract the following from the receipt:
1. **Merchant/Store Name**: The business name at the top of the receipt
2. **Total Amount**: The FINAL TOTAL (after tax, tips, discounts). Look for "TOTAL", "GRAND TOTAL", "AMOUNT DUE"
3. **Date**: The transaction date. Parse any format and output as YYYY-MM-DD
4. **Category**: Match to one of the user's categories based on merchant type:
   - Restaurants/cafes → Food
   - Supermarkets → Groceries
   - Gas stations → Travel
   - Pharmacies → Healthcare
   - Retail stores → Shopping
   - If unsure, use "Miscellaneous"
5. **Currency**: Detect from symbol ($, €, £, ¥) or text. Use user's preferred if unclear
6. **Line Items**: List of purchased items (optional, for reference)

Return valid JSON with this structure:
{
  "isReceipt": true,
  "merchant": "Store Name",
  "total": 45.99,
  "date": "2024-12-05",
  "category": "Food",
  "currency": "usd",
  "confidence": 0.95,
  "items": [
    {"description": "Coffee", "quantity": 1, "amount": 4.50},
    {"description": "Sandwich", "quantity": 1, "amount": 8.99}
  ],
  "message": ""
}

IMPORTANT RULES:
- If image is NOT a receipt: {"isReceipt": false, "message": "This doesn't appear to be a receipt"}
- Total should be the FINAL amount paid (including tax/tip)
- If total is unclear, sum the visible items and set confidence < 0.7
- Amount must be POSITIVE (we negate it on our end for expenses)
- Date should be the receipt date, not today (unless receipt has no date)
- If parts are illegible, set confidence lower and note in message
- Handle receipts in any language - extract amounts regardless of text language
- Category MUST be from the provided list or "Miscellaneous"`, categoriesList, req.Currency, todayStr)
}

// MaskAPIKey returns a masked version of the API key for display
func MaskAPIKey(apiKey string) string {
	if len(apiKey) <= 8 {
		return "***"
	}
	return apiKey[:4] + "..." + apiKey[len(apiKey)-4:]
}

// DecodeBase64Audio decodes base64-encoded audio data
func DecodeBase64Audio(base64Data string) ([]byte, error) {
	// Remove data URL prefix if present
	if strings.Contains(base64Data, ",") {
		parts := strings.SplitN(base64Data, ",", 2)
		if len(parts) == 2 {
			base64Data = parts[1]
		}
	}
	return base64.StdEncoding.DecodeString(base64Data)
}
