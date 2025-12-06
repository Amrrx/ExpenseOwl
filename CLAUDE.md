# CLAUDE.md - ExpenseOwl Codebase Guide

## Project Overview

ExpenseOwl is a self-hosted expense tracking application with a Go backend API and React Native mobile app. It supports both single-user (JSON storage) and multi-user (PostgreSQL with authentication) modes.

**Philosophy**: Simple expense tracking with visual categorization. No complex budgeting - just fast, visual expense management.

## Tech Stack

- **Backend**: Go 1.23+ (pure API server, no UI serving)
- **Mobile App**: React Native with Expo (serves mobile and web)
- **Storage**: JSON files (single-user) or PostgreSQL (multi-user)
- **Authentication**: JWT tokens with refresh flow, OAuth (Google, Apple)
- **AI**: Voice expense parsing via Gemini/OpenAI/Anthropic
- **Dependencies**:
  - `github.com/google/uuid` - UUID generation
  - `github.com/lib/pq` - PostgreSQL driver
  - `github.com/joho/godotenv` - Environment loading
- **Deployment**: Docker (Alpine-based), Kubernetes manifests available

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────┐
│  React Native   │────▶│         Go Backend API           │
│  Mobile App     │     │  (Pure API - no UI serving)      │
│  (mobile + web) │     └──────────────────────────────────┘
└─────────────────┘                    │
                                       ▼
                        ┌──────────────────────────────────┐
                        │   PostgreSQL (multi-user)        │
                        │   or JSON files (single-user)    │
                        └──────────────────────────────────┘
```

## Directory Structure

```
ExpenseOwl/
├── cmd/expenseowl/
│   └── main.go              # Entry point, HTTP routes, two server modes
├── internal/
│   ├── ai/                  # AI providers for voice parsing
│   │   ├── gemini.go        # Google Gemini integration
│   │   └── provider.go      # AI provider interface
│   ├── api/
│   │   ├── handlers.go      # Single-user mode handlers
│   │   ├── handlers_postgres.go  # Multi-user mode handlers
│   │   ├── auth.go          # Authentication handlers & middleware
│   │   ├── oauth.go         # OAuth (Google, Apple) handlers
│   │   ├── sync.go          # Mobile sync handlers
│   │   ├── voice.go         # Voice parsing handlers
│   │   └── import-export.go # CSV import/export
│   ├── auth/
│   │   └── jwt.go           # JWT token management
│   ├── config/
│   │   └── config.go        # Environment configuration loader
│   └── storage/
│       ├── storage.go       # Storage interface, data types
│       ├── jsonStore.go     # JSON file storage (single-user)
│       ├── postgresStore.go # PostgreSQL storage (multi-user)
│       └── databaseStore.go # Legacy PostgreSQL storage
├── mobile/                  # React Native app (Expo)
│   ├── app/                 # Expo Router screens
│   ├── components/          # Reusable UI components
│   ├── services/            # API client
│   ├── stores/              # Zustand state management
│   └── types/               # TypeScript types
├── migrations/              # PostgreSQL migrations
├── kubernetes/              # K8s deployment manifests
├── assets/                  # Screenshots for README
├── Dockerfile
├── go.mod / go.sum
└── README.md
```

## Server Modes

### Single-User Mode (default)
```bash
./expenseowl                    # JSON storage, no auth
./expenseowl -port 3000         # Custom port
```

### Multi-User Mode (--auth flag)
```bash
./expenseowl --auth             # PostgreSQL + JWT auth
```

Requires PostgreSQL and environment variables (see below).

## Key Data Models

### Expense
```go
type Expense struct {
    ID          string    `json:"id"`
    RecurringID string    `json:"recurringID"`
    Name        string    `json:"name"`
    Tags        []string  `json:"tags"`
    Category    string    `json:"category"`
    Amount      float64   `json:"amount"`       // Negative = expense, Positive = income
    Currency    string    `json:"currency"`
    Date        time.Time `json:"date"`
}
```

### RecurringExpense
```go
type RecurringExpense struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Amount      float64   `json:"amount"`
    Currency    string    `json:"currency"`
    Tags        []string  `json:"tags"`
    Category    string    `json:"category"`
    StartDate   time.Time `json:"startDate"`
    Interval    string    `json:"interval"`     // daily, weekly, monthly, yearly
    Occurrences int       `json:"occurrences"`
}
```

### AIConfig
```go
type AIConfig struct {
    Enabled            bool   `json:"enabled"`
    Provider           string `json:"provider"`           // gemini, anthropic, openai
    APIKey             string `json:"apiKey"`
    Model              string `json:"model"`
    TranslateToEnglish bool   `json:"translateToEnglish"` // Per-user preference
}
```

## API Endpoints

### Single-User Mode (no `/api` prefix, no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/version` | Server version |
| GET | `/config` | Get full config |
| GET/PUT | `/categories`, `/categories/edit` | Manage categories |
| GET/PUT | `/currency`, `/currency/edit` | Manage currency |
| GET/PUT | `/startdate`, `/startdate/edit` | Manage start date |
| PUT | `/expense` | Add expense |
| GET | `/expenses` | Get all expenses |
| PUT | `/expense/edit?id=` | Edit expense |
| DELETE | `/expense/delete?id=` | Delete expense |
| DELETE | `/expenses/delete` | Delete multiple |
| PUT | `/recurring-expense` | Add recurring |
| GET | `/recurring-expenses` | Get all recurring |
| PUT | `/recurring-expense/edit?id=&updateAll=` | Update recurring |
| DELETE | `/recurring-expense/delete?id=&removeAll=` | Delete recurring |
| GET | `/export/csv` | Export CSV |
| POST | `/import/csv` | Import CSV |

### Multi-User Mode (`/api` prefix, requires Bearer token)

**Public (no auth):**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/google/verify` | Google OAuth |
| POST | `/api/auth/apple/verify` | Apple OAuth |

**Protected (requires Bearer token):**
- Same endpoints as single-user but with `/api` prefix
- Additional sync endpoints:
  - `POST /api/sync/pull` - Pull changes from server
  - `POST /api/sync/push` - Push changes to server
  - `GET /api/sync/status` - Get sync status
- User preferences:
  - `GET /api/user/preferences` - Get user preferences
  - `PUT /api/user/preferences/update` - Update preferences
- Voice/AI:
  - `POST /api/ai/voice/parse` - Parse voice recording
  - `GET /api/ai/config` - Get AI config (admin)
  - `PUT /api/ai/config/update` - Update AI config (admin)

## Environment Variables

### Database (Multi-User Mode)
| Variable | Example | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `expenseowl` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_NAME` | `expenseowl` | Database name |
| `DB_SSLMODE` | `disable` | SSL mode |

### JWT Authentication
| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `random-secret` | JWT signing secret |
| `JWT_ACCESS_TOKEN_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token expiry |

### AI Voice Parsing
| Variable | Example | Description |
|----------|---------|-------------|
| `AI_ENABLED` | `true` | Enable AI features |
| `AI_PROVIDER` | `gemini` | Provider: gemini, openai, anthropic |
| `AI_API_KEY` | `your-api-key` | API key for provider |
| `AI_MODEL` | `gemini-2.5-flash-lite` | Model to use |

### OAuth (Optional)
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `APPLE_CLIENT_ID` | Apple OAuth client ID |
| `APPLE_TEAM_ID` | Apple Team ID |
| `APPLE_KEY_ID` | Apple Key ID |
| `APPLE_PRIVATE_KEY_PATH` | Path to Apple private key |

## Development

### Building Backend
```bash
go build ./cmd/expenseowl
./expenseowl              # Single-user mode
./expenseowl --auth       # Multi-user mode (requires PostgreSQL)
```

### Running Mobile App
```bash
cd mobile
npm install
npx expo run:android      # Android
npx expo run:ios          # iOS
npx expo start --web      # Web
```

### Database Migrations
```bash
# Run migration manually
psql -U expenseowl -d expenseowl -f migrations/001_initial_schema.sql
psql -U expenseowl -d expenseowl -f migrations/002_add_translate_preference.sql
```

## Storage Interface

The `Storage` interface abstracts storage backends:

```go
type Storage interface {
    GetConfig() (*Config, error)
    GetCategories() ([]string, error)
    UpdateCategories(categories []string) error
    // ... expense methods
    GetAIConfig() (*AIConfig, error)
    UpdateAIConfig(aiConfig AIConfig) error
    Close() error
}
```

Current implementations:
- `jsonStore` - JSON file storage (single-user, default)
- `PostgresStore` - PostgreSQL storage (multi-user)

## Conventions

### Amount Sign Convention
- **Negative amounts** = Expenses (money going out)
- **Positive amounts** = Income/Reimbursements (money coming in)

### Date Handling
- Dates stored as UTC in RFC3339 format
- Mobile app handles local timezone conversion

### Supported Currencies
`usd, eur, gbp, jpy, cny, krw, inr, rub, brl, zar, aed, aud, cad, chf, hkd, bdt, sgd, thb, try, mxn, php, pln, sek, nzd, dkk, idr, ils, vnd, myr, mad`

## Common Tasks

### Adding a New Currency
1. Add currency code to `SupportedCurrencies` slice in `internal/storage/storage.go`
2. Add currency config to `mobile/utils/currency.ts`

### Adding a New API Endpoint
1. Add handler method in `internal/api/handlers_postgres.go` (multi-user) or `handlers.go` (single-user)
2. Register route in `cmd/expenseowl/main.go`
3. Add API method in `mobile/services/api.ts`

### Modifying the Storage Schema
1. Update struct definitions in `internal/storage/storage.go`
2. Update `postgresStore.go` implementation
3. Create migration file in `migrations/`