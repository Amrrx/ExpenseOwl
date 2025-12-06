<p align="center">
<img src="/assets/logo.png" alt="ExpenseOwl Logo" width="200" height="200" /><br>
</p>

<h1 align="center">ExpenseOwl</h1><br>

<p align="center">
<a href="https://github.com/tanq16/expenseowl/actions/workflows/release.yml"><img src="https://github.com/tanq16/expenseowl/actions/workflows/release.yml/badge.svg" alt="Release"></a>&nbsp;<a href="https://github.com/Tanq16/expenseowl/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/tanq16/expenseowl"></a>&nbsp;<a href="https://hub.docker.com/r/tanq16/expenseowl"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/tanq16/expenseowl"></a>
</p>

<p align="center">
<a href="#why-create-this">Why Create This?</a>&nbsp;&bull;&nbsp;<a href="#features">Features</a>&nbsp;&bull;&nbsp;<a href="#architecture">Architecture</a><br><a href="#installation">Installation</a>&nbsp;&bull;&nbsp;<a href="#usage">Usage</a>&nbsp;&bull;&nbsp;<a href="#contributing">Contributing</a>
</p>

<br>

<p align="center">
<b>ExpenseOwl</b> is a self-hosted expense tracking system with a React Native mobile app and Go backend API. Supports single-user (homelab) and multi-user (with authentication) modes.
</p>

<br>

# Why Create This?

There are a ton of amazing projects for expense tracking across GitHub ([Actual](https://github.com/actualbudget/actual), [Firefly III](https://github.com/firefly-iii/firefly-iii), etc.). They're all incredible! I just don't find them *fast* and *simple*. They offer too many features I never use (like accounts or complex budgeting). *Don't get me wrong!* They're amazing when complexity is needed, but I wanted something ***dead simple*** that gives me a quick monthly look at my expenses. NOTHING else!

So, I created this project and I use it in my home lab for expenses. The primary intention is to track spending across your categories in a simplistic manner. No complications, searching, budgeting. This is *not* a budgeting app; it's for tracking.

# Features

### Core Functionality

- Quick expense/income add (only date, amount, and category are required)
- **Two modes**: Single-user (JSON storage) or Multi-user (PostgreSQL + authentication)
- Recurring transactions for both income and expenses
- Custom categories, currency symbols, and billing cycle start date
- Optional tags for further classification
- Beautiful interface with both light and dark themes
- Voice expense entry with AI parsing (Gemini, OpenAI, Anthropic)
- Multi-architecture Docker container with persistent storage

### Mobile App (React Native)

- Native mobile experience for iOS and Android
- Offline-first with background sync
- Voice recording for quick expense entry
- RTL support for Arabic/Hebrew expense names
- Haptic feedback for better UX

### Authentication (Multi-User Mode)

- JWT-based authentication with refresh tokens
- OAuth support (Google, Apple)
- Per-user data isolation
- User preferences (translation settings)

### Visualization

1. Main dashboard - category breakdown (pie chart) and cashflow indicator
    - Click on a category to exclude it from the pie chart
    - Visualize the month's breakdown without considering some categories like Rent
    - Cashflow shows total income, total expenses, and balance
2. Table view for detailed expense listing
    - View monthly or all expenses chronologically
    - Edit and delete expenses
3. Settings page for configurations
    - Manage categories, currency, and billing cycle
    - Configure voice input preferences

# Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│              (iOS, Android, Web via Expo)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Go Backend API                           │
│              (Pure API - no UI serving)                      │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth/JWT    │  │ Sync API    │  │ Voice/AI Parsing    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│   JSON Files            │    │   PostgreSQL                │
│   (Single-User Mode)    │    │   (Multi-User Mode)         │
└─────────────────────────┘    └─────────────────────────────┘
```

# Installation

## Backend

### Docker (Recommended)

**Single-User Mode** (JSON storage, no auth):
```bash
docker run --rm -d \
  --name expenseowl \
  -p 8080:8080 \
  -v expenseowl:/app/data \
  tanq16/expenseowl:main
```

**Multi-User Mode** (PostgreSQL + auth):
```yaml
services:
  expenseowl:
    image: tanq16/expenseowl:main
    command: ["--auth"]
    restart: unless-stopped
    ports:
      - 8080:8080
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=expenseowl
      - DB_PASSWORD=your-password
      - DB_NAME=expenseowl
      - DB_SSLMODE=disable
      - JWT_SECRET=your-random-secret-key
      - JWT_ACCESS_TOKEN_EXPIRY=15m
      - JWT_REFRESH_TOKEN_EXPIRY=7d
      # Optional: AI Voice Parsing
      - AI_ENABLED=true
      - AI_PROVIDER=gemini
      - AI_API_KEY=your-api-key
      - AI_MODEL=gemini-2.5-flash-lite
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=expenseowl
      - POSTGRES_PASSWORD=your-password
      - POSTGRES_DB=expenseowl
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Binary

```bash
# Download from releases or build from source
git clone https://github.com/tanq16/expenseowl.git
cd expenseowl
go build ./cmd/expenseowl

# Run single-user mode
./expenseowl

# Run multi-user mode (requires PostgreSQL)
./expenseowl --auth
```

## Mobile App

The React Native mobile app is located in the `mobile/` directory:

```bash
cd mobile
npm install

# Set API URL
export EXPO_PUBLIC_API_URL=https://your-api.com

# Run on device/emulator
npx expo run:android
npx expo run:ios

# Run web version
npx expo start --web
```

# Usage

## Single-User Mode

Access the API directly at `http://localhost:8080`. No authentication required.

## Multi-User Mode

1. Register an account via the mobile app or API
2. Login to receive JWT tokens
3. Use Bearer token for all API requests

### API Authentication Flow

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","full_name":"User"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token for protected endpoints
curl http://localhost:8080/api/expenses \
  -H "Authorization: Bearer <access_token>"
```

## Conventions

- Expenses are categorized by a -ve value, while income or reimbursement are +ve
- Expense dates are stored as UTC strings in RFC3339 format
- Future and recurring expenses extending into future dates are added immediately
- Categories are meant to be used as a classification criteria
- Tags are optional and are meant to assign features and characteristics to expenses

## Environment Variables

### Database (Multi-User Mode)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_SSLMODE` | SSL mode: disable, require, verify-full, verify-ca |

### Authentication

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_ACCESS_TOKEN_EXPIRY` | Access token expiry (e.g., 15m) |
| `JWT_REFRESH_TOKEN_EXPIRY` | Refresh token expiry (e.g., 7d) |

### AI Voice Parsing (Optional)

| Variable | Description |
|----------|-------------|
| `AI_ENABLED` | Enable AI features (true/false) |
| `AI_PROVIDER` | Provider: gemini, openai, anthropic |
| `AI_API_KEY` | API key for the provider |
| `AI_MODEL` | Model to use |

### OAuth (Optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `APPLE_CLIENT_ID` | Apple OAuth client ID |
| `APPLE_TEAM_ID` | Apple Team ID |
| `APPLE_KEY_ID` | Apple Key ID |
| `APPLE_PRIVATE_KEY_PATH` | Path to Apple private key |

## Data Import/Export

ExpenseOwl accepts any CSV file with columns: `name`, `category`, `amount`, and `date` (case-insensitive).

> **Note**: Date format should be YYYY-MM-DD or RFC3339.

# Contributing

Contributions are welcome! The project uses:

- **Backend**: Go (pure API server)
- **Mobile**: React Native with Expo
- **Database**: PostgreSQL (multi-user) or JSON files (single-user)

Please ensure contributions align with the project's philosophy of maintaining simplicity.