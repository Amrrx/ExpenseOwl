# CLAUDE.md - ExpenseOwl Codebase Guide

## Project Overview

ExpenseOwl is a simple, self-hosted expense tracking application built with Go backend and vanilla HTML/CSS/JS frontend. It emphasizes simplicity over feature complexity - designed for quick monthly expense visualization via pie charts and cashflow indicators.

**Philosophy**: Dead simple expense tracking with no budgeting features, no accounts management - just fast, visual expense categorization for homelab deployments.

## Tech Stack

- **Backend**: Go 1.23+ (standard library HTTP server)
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Storage**: JSON files (default) or PostgreSQL
- **Dependencies**:
  - `github.com/google/uuid` - UUID generation
  - `github.com/lib/pq` - PostgreSQL driver
- **Deployment**: Docker (Alpine-based), Kubernetes manifests available

## Directory Structure

```
ExpenseOwl/
├── cmd/expenseowl/
│   └── main.go              # Application entry point, HTTP routes
├── internal/
│   ├── api/
│   │   ├── handlers.go      # HTTP handlers for config/expenses
│   │   └── import-export.go # CSV import/export handlers
│   ├── storage/
│   │   ├── storage.go       # Storage interface, data types, validation
│   │   ├── jsonStore.go     # JSON file storage implementation
│   │   └── databaseStore.go # PostgreSQL storage implementation
│   └── web/
│       ├── embed.go         # Go embed for static files
│       └── templates/       # HTML, CSS, JS, fonts, PWA assets
├── kubernetes/              # K8s deployment manifests
├── assets/                  # Screenshots for README
├── scripts/                 # Build/utility scripts
├── Dockerfile
├── go.mod / go.sum
└── README.md
```

## Key Data Models

### Expense (`internal/storage/storage.go:85-94`)
```go
type Expense struct {
    ID          string    `json:"id"`
    RecurringID string    `json:"recurringID"`  // Links to RecurringExpense if applicable
    Name        string    `json:"name"`
    Tags        []string  `json:"tags"`
    Category    string    `json:"category"`
    Amount      float64   `json:"amount"`       // Negative = expense, Positive = income
    Currency    string    `json:"currency"`
    Date        time.Time `json:"date"`
}
```

### RecurringExpense (`internal/storage/storage.go:56-66`)
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

### Config (`internal/storage/storage.go:48-54`)
```go
type Config struct {
    Categories        []string           `json:"categories"`
    Currency          string             `json:"currency"`      // Currency code (usd, eur, etc.)
    StartDate         int                `json:"startDate"`     // Day of month (1-31)
    RecurringExpenses []RecurringExpense `json:"recurringExpenses"`
}
```

## API Endpoints

All endpoints defined in `cmd/expenseowl/main.go`:

### UI Routes
| Path | Description |
|------|-------------|
| `/` | Main dashboard (pie chart) |
| `/table` | Table view of expenses |
| `/settings` | Configuration page |

### Config API
| Method | Path | Description |
|--------|------|-------------|
| GET | `/config` | Get full config |
| GET | `/categories` | Get category list |
| PUT | `/categories/edit` | Update categories |
| GET | `/currency` | Get currency code |
| PUT | `/currency/edit` | Update currency |
| GET | `/startdate` | Get start date |
| PUT | `/startdate/edit` | Update start date |

### Expense API
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/expense` | Add new expense |
| GET | `/expenses` | Get all expenses |
| PUT | `/expense/edit?id=` | Edit expense |
| DELETE | `/expense/delete?id=` | Delete expense |
| DELETE | `/expenses/delete` | Delete multiple (body: `{ids: [...]}`) |

### Recurring Expense API
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/recurring-expense` | Add recurring expense |
| GET | `/recurring-expenses` | Get all recurring expenses |
| PUT | `/recurring-expense/edit?id=&updateAll=` | Update recurring expense |
| DELETE | `/recurring-expense/delete?id=&removeAll=` | Delete recurring expense |

### Import/Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/export/csv` | Export expenses as CSV |
| POST | `/import/csv` | Import CSV (multipart form) |
| POST | `/import/csvold` | Import from ExpenseOwl <v4.0 |

## Storage Interface

The `Storage` interface (`internal/storage/storage.go:12-44`) abstracts storage backends. To add a new backend:

1. Create a new file in `internal/storage/` (e.g., `sqliteStore.go`)
2. Implement all methods of the `Storage` interface
3. Add the backend type to `BackendType` constants
4. Add initialization in `InitializeStorage()` function

Current implementations:
- `jsonStore` - JSON file storage (default)
- `databaseStore` - PostgreSQL storage

## Development

### Building

```bash
# Build binary
go build ./cmd/expenseowl

# Run locally (creates data/ directory)
./expenseowl

# With custom port
./expenseowl -port 3000
```

### Docker Build

```bash
docker build -t expenseowl .
docker run -p 8080:8080 -v expenseowl:/app/data expenseowl
```

### Running Tests

No test files currently exist in the codebase.

## Environment Variables

For PostgreSQL backend:

| Variable | Example | Description |
|----------|---------|-------------|
| `STORAGE_TYPE` | `postgres` | Backend type (default: `json`) |
| `STORAGE_URL` | `localhost:5432/expenseowl` | Server/database |
| `STORAGE_SSL` | `disable` | SSL mode: disable, require, verify-full, verify-ca |
| `STORAGE_USER` | `user` | PostgreSQL username |
| `STORAGE_PASS` | `password` | PostgreSQL password |

## Conventions

### Amount Sign Convention
- **Negative amounts** = Expenses (money going out)
- **Positive amounts** = Income/Reimbursements (money coming in)

### Date Handling
- Dates stored as UTC in RFC3339 format
- Frontend hides time component from users
- User's local time is automatically added to selected dates

### Category Handling
- Categories are user-configurable strings
- Default categories: Food, Groceries, Travel, Rent, Utilities, Entertainment, Healthcare, Shopping, Miscellaneous, Income
- Case-insensitive comparison for CSV imports

### Input Validation
- String sanitization via `SanitizeString()` - allows unicode letters/numbers, basic punctuation
- Expense validation requires: non-empty name, non-empty category, non-zero amount, valid date
- Recurring expenses require at least 2 occurrences

### Supported Currencies
Defined in `internal/storage/storage.go:250-281`:
`usd, eur, gbp, jpy, cny, krw, inr, rub, brl, zar, aed, aud, cad, chf, hkd, bdt, sgd, thb, try, mxn, php, pln, sek, nzd, dkk, idr, ils, vnd, myr, mad`

## Frontend Architecture

- Static files embedded via Go's `embed` package (`internal/web/embed.go`)
- Main JavaScript in `internal/web/templates/functions.js`
- PWA support with service worker (`sw.js`) and manifest
- Chart.js for pie chart visualization
- Font Awesome for icons (self-hosted, no external requests)

### Currency Formatting
Frontend handles currency display formatting based on `currencyBehaviors` object in `functions.js` - controls symbol position, decimal usage, and thousands separator style.

## Security Notes

- No built-in authentication - deploy behind a reverse proxy with auth (Authelia, etc.)
- Input sanitization prevents XSS via `escapeHTML()` in frontend and `SanitizeString()` in backend
- CSV import has 10MB file size limit

## File Locations (JSON Backend)

When using JSON storage:
- Config: `data/config.json`
- Expenses: `data/expenses.json`

## Common Tasks

### Adding a New Currency
1. Add currency code to `SupportedCurrencies` slice in `internal/storage/storage.go`
2. Add currency behavior to `currencyBehaviors` object in `internal/web/templates/functions.js`

### Adding a New API Endpoint
1. Add handler method to `Handler` struct in `internal/api/handlers.go`
2. Register route in `cmd/expenseowl/main.go`

### Modifying the Storage Schema
1. Update struct definitions in `internal/storage/storage.go`
2. Update both `jsonStore.go` and `databaseStore.go` implementations
3. For PostgreSQL, update `CREATE TABLE` statements
