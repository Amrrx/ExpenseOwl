# ExpenseOwl - Complete Product Specification

## Executive Summary

**ExpenseOwl** is a self-hosted, multi-user expense tracking application designed for personal finance management with a focus on simplicity and visual insights. The application provides real-time expense categorization, month-to-month tracking with custom billing cycles, and AI-powered voice input for rapid expense entry.

**Key Differentiators**:
- Self-hosted (privacy-first, no cloud dependency)
- Multi-user with JWT authentication and OAuth support
- Custom billing cycle support (not limited to calendar months)
- AI-powered voice expense tracking via Gemini API
- Offline-first mobile app with sync capabilities
- PWA support for installable web experience

---

## Business Model & Target Audience

### Target Users
1. **Privacy-conscious individuals** who prefer self-hosted solutions
2. **Homelab enthusiasts** running personal servers
3. **Freelancers and contractors** with irregular income cycles
4. **Families** sharing expense tracking (multi-user)
5. **Tech-savvy users** comfortable with Docker/Kubernetes deployments

### Use Cases
- Personal monthly expense tracking and budgeting
- Household expense management with multiple users
- Freelancer income/expense tracking with custom billing periods
- Small business expense logging
- Split expense tracking for roommates/partners

---

## User Stories

### Epic 1: User Authentication & Account Management

#### US-1.1: User Registration
**As a** new user
**I want to** create an account with email and password
**So that** I can securely track my expenses

**Acceptance Criteria**:
- Email must be valid format
- Password minimum 8 characters
- Full name is required
- Account created immediately on registration
- Automatic login after registration
- Receive JWT access token (15min) and refresh token (7 days)

**Technical Notes**:
- Endpoint: `POST /api/auth/register`
- Password hashed with bcrypt
- Returns user object + tokens
- User stored in PostgreSQL `users` table

---

#### US-1.2: User Login
**As a** returning user
**I want to** log in with my email and password
**So that** I can access my expense data

**Acceptance Criteria**:
- Valid credentials return access + refresh tokens
- Invalid credentials show error message
- Token stored in localStorage
- Automatic redirect to dashboard on success
- "Remember me" functionality via refresh token

**Technical Notes**:
- Endpoint: `POST /api/auth/login`
- Returns JWT tokens in nested `tokens` object
- Frontend uses Zustand for auth state management

---

#### US-1.3: OAuth Authentication (Google)
**As a** user
**I want to** sign in with my Google account
**So that** I don't need to create a separate password

**Acceptance Criteria**:
- Google Sign-In button visible on login page
- One-click authentication via Google OAuth 2.0
- Auto-create account if first time
- Redirect to dashboard after success
- Store tokens same as email/password login

**Technical Notes**:
- Endpoint: `POST /api/auth/google/verify`
- Google ID token verified server-side
- User linked by email address
- OAuth provider stored in database

---

#### US-1.4: OAuth Authentication (Apple Sign-In)
**As a** iOS user
**I want to** sign in with Apple
**So that** I can use platform-native authentication

**Acceptance Criteria**:
- Apple Sign-In button on login page
- Works with "Hide My Email" feature
- Auto-create account on first use
- Seamless token refresh

**Technical Notes**:
- Endpoint: `POST /api/auth/apple/verify`
- Apple JWT verified with Apple's public keys
- Supports private relay emails

---

#### US-1.5: Token Refresh
**As a** logged-in user
**I want to** automatically refresh my session
**So that** I don't get logged out while using the app

**Acceptance Criteria**:
- Access token expires after 15 minutes
- Frontend auto-refreshes using refresh token
- Seamless (no user interruption)
- Logout if refresh token expired/invalid

**Technical Notes**:
- Endpoint: `POST /api/auth/refresh`
- Axios interceptor handles 401 responses
- Refresh token valid for 7 days

---

#### US-1.6: Logout
**As a** user
**I want to** log out securely
**So that** others can't access my data on shared devices

**Acceptance Criteria**:
- Clear all tokens from localStorage
- Redirect to login page
- No data visible after logout
- Backend session invalidated

**Technical Notes**:
- Endpoint: `POST /api/auth/logout`
- Clears access_token, refresh_token, user from localStorage
- Zustand state reset

---

### Epic 2: Expense Management (Core Features)

#### US-2.1: Add Expense
**As a** user
**I want to** add a new expense with name, category, amount, and date
**So that** I can track my spending

**Acceptance Criteria**:
- Form fields: Name (required), Category (dropdown), Amount (>0), Date (default=today), Tags (optional)
- "Report Gain" checkbox for income (positive amount)
- Amount stored as negative for expenses, positive for income
- Success message shown after adding
- Form resets after successful submission
- New expense appears in dashboard/table immediately

**Technical Notes**:
- Endpoint: `PUT /api/expense`
- Request body: `{name, category, amount, currency, date, tags[]}`
- Date converted to ISO 8601 with local time
- UUID generated for expense ID
- Stored in PostgreSQL `expenses` table with `user_id` foreign key

---

#### US-2.2: View Expenses (Dashboard)
**As a** user
**I want to** see my expenses visualized as a pie chart
**So that** I can understand my spending patterns

**Acceptance Criteria**:
- Pie chart (doughnut) shows expense breakdown by category
- Only negative amounts (expenses) shown in chart
- Each category has unique color from predefined palette
- Tooltip shows amount + percentage on hover
- Chart updates when month changes
- Show "No expenses this month" if empty

**Technical Notes**:
- Uses Chart.js with react-chartjs-2
- 12-color palette (repeats if >12 categories)
- Filters expenses by current month boundaries
- Custom start date support (not limited to 1st of month)

---

#### US-2.3: Category Filtering (Interactive Legend)
**As a** user
**I want to** click categories in the legend to hide/show them
**So that** I can focus on specific spending areas

**Acceptance Criteria**:
- Legend shows all categories with colors
- Click category to disable (opacity reduces)
- Click again to re-enable
- Chart updates dynamically
- Total recalculates based on active categories
- Disabled categories remembered during session

**Technical Notes**:
- Custom legend (not Chart.js default)
- Uses Set to track disabled categories
- Legend sorted by total amount (descending)
- Shows percentage + formatted amount per category

---

#### US-2.4: Cashflow Summary
**As a** user
**I want to** see Income, Expenses, and Balance for the current month
**So that** I know my financial position

**Acceptance Criteria**:
- Three cards: Income (green), Expenses (red), Balance (blue)
- Income = sum of all positive amounts
- Expenses = sum of absolute values of negative amounts
- Balance = Income - Expenses
- Balance color: green if ≥0, red if <0
- Currency formatted based on user's currency setting

**Technical Notes**:
- Calculated client-side from filtered expenses
- Uses `formatCurrency()` utility for proper formatting
- 30 supported currencies with locale-specific formatting

---

#### US-2.5: Month Navigation
**As a** user
**I want to** navigate between months with prev/next buttons
**So that** I can review historical expenses

**Acceptance Criteria**:
- Current month displayed prominently (e.g., "November 2024")
- Left arrow = previous month
- Right arrow = next month
- Chart/cashflow/table update when month changes
- Custom billing cycle respected (based on start date setting)

**Technical Notes**:
- `getMonthBounds()` calculates start/end based on custom start date
- If start date = 15, "November" = Nov 15 - Dec 14
- Month display formatted using `formatMonth()` utility

---

#### US-2.6: Edit Expense
**As a** user
**I want to** edit an existing expense
**So that** I can correct mistakes or update information

**Acceptance Criteria**:
- Click "Edit" button on expense row (in table view)
- Form pre-populated with current values
- Submit button changes to "Update"
- Success message after update
- Expense updated in database
- Table/chart refresh with new data

**Technical Notes**:
- Endpoint: `PUT /api/expense/edit?id={uuid}`
- Form enters "edit mode" with expense ID stored
- Same form component used for add/edit

---

#### US-2.7: Delete Expense
**As a** user
**I want to** delete an expense
**So that** I can remove entries made by mistake

**Acceptance Criteria**:
- Click "Delete" button shows confirmation modal
- Modal: "Are you sure? (cannot be undone)"
- Cancel / Delete buttons
- Shift+Click = skip confirmation (power user feature)
- Success message after deletion
- Expense removed from UI immediately

**Technical Notes**:
- Endpoint: `DELETE /api/expense/delete?id={uuid}`
- Hard delete from database
- No soft delete / archive feature

---

#### US-2.8: Bulk Delete Expenses
**As a** user
**I want to** delete multiple expenses at once
**So that** I can clean up data efficiently

**Acceptance Criteria**:
- Select multiple expenses via checkboxes
- "Delete Selected" button appears
- Confirmation modal shows count
- All selected deleted in single operation

**Technical Notes**:
- Endpoint: `DELETE /api/expenses/delete`
- Request body: `{ids: [uuid1, uuid2, ...]}`
- Atomic transaction (all or nothing)

---

### Epic 3: Advanced Features

#### US-3.1: Tag System
**As a** user
**I want to** add tags to expenses
**So that** I can organize and filter beyond categories

**Acceptance Criteria**:
- Tag input with autocomplete dropdown
- Shows existing tags as suggestions
- Filter tags as user types
- "Create new tag" option if not exists
- Tags displayed as removable pills
- Press Enter or click to add tag
- Click X to remove tag
- Multiple tags per expense

**Technical Notes**:
- Tags stored as text array in PostgreSQL (JSONB column)
- Autocomplete built with React refs + dropdown
- Global tag set aggregated from all user's expenses

---

#### US-3.2: Voice Expense Entry
**As a** user
**I want to** speak my expense instead of typing
**So that** I can add expenses quickly while on-the-go

**Acceptance Criteria**:
- Microphone button visible
- Click starts audio recording (max 15 seconds)
- Visual feedback during recording
- Audio sent to AI for parsing
- AI returns: transcript + parsed expense(s)
- Review modal shows transcript and parsed data
- Editable fields before confirming
- "Re-record" button if incorrect
- "Confirm All" adds all parsed expenses
- Supports multiple expenses in one recording
- Handles relative dates ("yesterday", "last week")

**Technical Notes**:
- Frontend: MediaRecorder API captures audio
- Audio sent as base64 to backend
- Endpoint: `POST /api/voice/parse`
- Backend: Gemini API (Google) for transcription + parsing
- Response: `{transcript, expenses: [{name, amount, category, date, confidence, ambiguous}]}`
- Low confidence warnings shown in UI

---

#### US-3.3: AI Configuration
**As a** user
**I want to** configure the AI service for voice parsing
**So that** I can use my own API key and choose models

**Acceptance Criteria**:
- Settings page has "AI Configuration" section
- Toggle: Enable/Disable AI features
- Provider dropdown: Gemini, Claude (coming soon), OpenAI (coming soon)
- API Key input (password field with show/hide toggle)
- Model dropdown (depends on provider)
- "Test Connection" button validates API key
- "Save Configuration" persists settings
- Instructions displayed for usage

**Technical Notes**:
- Settings stored per-user in database
- Endpoint: `GET /api/settings/ai`, `PUT /api/settings/ai/update`
- Test endpoint: `POST /api/settings/ai/test`
- API key encrypted at rest (not implemented yet)

---

#### US-3.4: Recurring Expenses
**As a** user
**I want to** set up recurring expenses (rent, subscriptions)
**So that** I don't manually enter them every month

**Acceptance Criteria**:
- Add recurring expense with: Name, Amount, Category, Tags, Start Date, Interval (daily/weekly/monthly/yearly), Occurrences (2+, or 0=indefinite)
- "Report Gain" for recurring income
- Table shows existing recurring expenses
- Columns: Name, Amount, Category, Interval, Next Occurrence, Actions
- "Next Occurrence" calculated dynamically
- Shows "Finished" when all occurrences complete (if finite)
- Edit button opens modal with:
  - "Update Future" = update this and future occurrences
  - "Update All" = update all occurrences (past + future)
- Delete button opens modal with:
  - "Delete Future" = delete this and future
  - "Delete All" = delete all instances
- Minimum 2 occurrences enforced

**Technical Notes**:
- Stored in `recurring_expenses` table
- Backend generates actual expenses based on recurring rules
- Each generated expense links to recurring via `recurring_id`
- Endpoint: `PUT /api/recurring-expense`, `GET /api/recurring-expenses`, `PUT /api/recurring-expense/edit?id={uuid}&updateAll={bool}`, `DELETE /api/recurring-expense/delete?id={uuid}&removeAll={bool}`

---

#### US-3.5: Custom Billing Cycle
**As a** user
**I want to** set my billing cycle start date (1-31)
**So that** months align with my pay schedule

**Acceptance Criteria**:
- Settings page: "Start Date" input (1-31)
- Default = 1 (calendar month)
- Example: If start date = 15, "November" = Nov 15 - Dec 14
- Save button persists setting
- Dashboard/table respect custom start date
- Month navigation uses custom boundaries

**Technical Notes**:
- Stored in user's config (PostgreSQL)
- Endpoint: `GET /api/startdate`, `PUT /api/startdate/edit`
- `getMonthBounds()` utility calculates boundaries

---

#### US-3.6: Category Management
**As a** user
**I want to** customize my expense categories
**So that** they match my spending patterns

**Acceptance Criteria**:
- Settings page shows category list
- Drag-and-drop to reorder categories
- "Add Category" input + button
- Delete button per category (min 1 category required)
- Save button persists order + list
- Input sanitization (removes < and >)
- Categories update in dropdowns across app

**Technical Notes**:
- Stored as JSON array in user config
- Endpoint: `GET /api/categories`, `PUT /api/categories/edit`
- Request body: `{categories: [string]}`
- Default categories: Food, Groceries, Travel, Rent, Utilities, Entertainment, Healthcare, Shopping, Miscellaneous, Income

---

#### US-3.7: Currency Selection
**As a** user
**I want to** choose my currency
**So that** amounts display correctly

**Acceptance Criteria**:
- Settings page: Currency dropdown
- 30+ supported currencies with symbols
- Save button persists setting
- All amounts throughout app formatted with selected currency
- Symbol position, decimals, separators respect currency rules

**Technical Notes**:
- Supported currencies: USD, EUR, GBP, JPY, CNY, KRW, INR, RUB, BRL, ZAR, AED, AUD, CAD, CHF, HKD, BDT, SGD, THB, TRY, MXN, PHP, PLN, SEK, NZD, DKK, IDR, ILS, VND, MYR, MAD, EGP
- Each currency has behavior: {symbol, useComma, useDecimals, useSpace, right}
- Endpoint: `GET /api/currency`, `PUT /api/currency/edit`
- Client-side formatting via `formatCurrency()` utility

---

#### US-3.8: Theme Selection
**As a** user
**I want to** choose light/dark/system theme
**So that** the app matches my preference

**Acceptance Criteria**:
- Settings page: Theme dropdown (System Default, Light, Dark)
- Save to localStorage (instant apply)
- Apply on page load
- System theme detects OS preference

**Technical Notes**:
- CSS custom properties (CSS variables)
- localStorage key: `theme`
- Applied via `data-theme` attribute on `<html>`
- No backend storage (client preference only)

---

### Epic 4: Data Management

#### US-4.1: Export to CSV
**As a** user
**I want to** export my expenses to CSV
**So that** I can analyze data in Excel or backup

**Acceptance Criteria**:
- "Export CSV" button in settings
- Downloads CSV file named `expenses_YYYY-MM-DD.csv`
- Columns: ID, Name, Category, Tags, Amount, Currency, Date, Created At, Updated At
- All user's expenses included (not just current month)
- Tags formatted as comma-separated in quotes

**Technical Notes**:
- Endpoint: `GET /api/export/csv`
- Backend generates CSV with proper escaping
- Response: `Content-Type: text/csv`, `Content-Disposition: attachment`

---

#### US-4.2: Import from CSV
**As a** user
**I want to** import expenses from CSV
**So that** I can migrate from other apps

**Acceptance Criteria**:
- "Import CSV" button with file picker
- Max file size: 10MB
- Required columns: name, category, amount, date
- Optional columns: tags
- Import summary shows: Total Processed, Imported, Skipped, New Categories
- Case-insensitive category matching
- Invalid rows skipped with error report

**Technical Notes**:
- Endpoint: `POST /api/import/csv` (multipart/form-data)
- CSV parsed server-side
- Validation per row
- New categories auto-created
- Date formats: ISO 8601, RFC 3339, common formats

---

#### US-4.3: Import from Old ExpenseOwl
**As a** user
**I want to** import from ExpenseOwl v3.20 or earlier
**So that** I can upgrade without losing data

**Acceptance Criteria**:
- "Import from Old ExpenseOwl" button
- Accepts legacy CSV format
- Handles old date formats
- Maps old categories to new
- Import summary displayed

**Technical Notes**:
- Endpoint: `POST /api/import/csvold`
- Backward compatibility with v3.x format

---

### Epic 5: Multi-User & Sync

#### US-5.1: User Isolation
**As a** user
**I want to** only see my own expenses
**So that** my data is private from other users

**Acceptance Criteria**:
- Users cannot see other users' data
- All queries filtered by `user_id`
- JWT token contains user ID
- Middleware validates user ownership

**Technical Notes**:
- All expense tables have `user_id` foreign key
- Auth middleware extracts user ID from JWT
- SQL queries: `WHERE user_id = $1`

---

#### US-5.2: Offline Sync (Pull)
**As a** mobile app user
**I want to** sync my data from the server
**So that** I have the latest data offline

**Acceptance Criteria**:
- "Sync" button pulls latest data
- Incremental sync (only changes since last sync)
- Full sync on first use
- Sync timestamp tracked
- All expenses, recurring expenses, and config synced

**Technical Notes**:
- Endpoint: `POST /api/sync/pull`
- Request: `{last_sync_time: "2024-11-22T10:00:00Z"}`
- Response: `{expenses[], recurring_expenses[], config, server_time, is_full_sync}`
- Uses `updated_at` timestamps for filtering

---

#### US-5.3: Offline Sync (Push)
**As a** mobile app user
**I want to** sync my local changes to the server
**So that** my data is backed up

**Acceptance Criteria**:
- Push local changes to server
- Conflict detection (client vs server version)
- Conflict resolution: server wins or client wins (configurable)
- Success response with processed IDs
- Handles network failures gracefully

**Technical Notes**:
- Endpoint: `POST /api/sync/push`
- Request: `{expenses[], recurring_expenses[], config, client_time}`
- Response: `{success, conflicts[], server_time, processed_ids}`
- Conflict resolution based on `updated_at` timestamps

---

#### US-5.4: Sync Status
**As a** user
**I want to** see when I last synced
**So that** I know if my data is up-to-date

**Acceptance Criteria**:
- Status shows: "Last synced: 2 minutes ago"
- Shows "Never synced" if first use
- Indicator: green (synced), yellow (pending), red (error)

**Technical Notes**:
- Endpoint: `GET /api/sync/status`
- Response: `{has_synced, last_sync_time}`
- Client calculates time ago

---

### Epic 6: Mobile & PWA

#### US-6.1: Progressive Web App
**As a** user
**I want to** install the app on my phone
**So that** it feels like a native app

**Acceptance Criteria**:
- Installable from browser (Add to Home Screen)
- App icon on home screen
- Splash screen on launch
- Works offline (service worker)
- Full-screen mode (no browser chrome)

**Technical Notes**:
- `manifest.json` with app metadata
- Service Worker (`sw.js`) for offline caching
- Icons: 192x192, 512x512
- Theme color, background color defined

---

#### US-6.2: React Native Mobile App
**As a** mobile user
**I want to** use a native mobile app
**So that** I get better performance and offline support

**Acceptance Criteria**:
- iOS and Android apps
- Offline-first architecture
- Local SQLite database
- Background sync
- Native UI components
- Push notifications for recurring expenses (future)

**Technical Notes**:
- Built with React Native
- State management: Zustand
- Local storage: SQLite with react-native-sqlite-storage
- Sync engine uses `/api/sync/*` endpoints
- Capacitor for native capabilities

---

---

## Technical Specifications

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   React SPA  │  │  React Native│  │   PWA        │  │
│  │   (Web)      │  │   (Mobile)   │  │  (Installed) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                           │                              │
│                    Axios HTTP Client                     │
│                  (JWT Bearer Tokens)                     │
└───────────────────────────┬─────────────────────────────┘
                            │
                   HTTPS / REST API
                            │
┌───────────────────────────┴─────────────────────────────┐
│                     Backend Layer                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Go HTTP Server (net/http)               │  │
│  │                                                    │  │
│  │  ┌─────────────┐  ┌──────────────┐               │  │
│  │  │Auth Handler │  │ CORS         │               │  │
│  │  │(JWT Manager)│  │ Middleware   │               │  │
│  │  └─────────────┘  └──────────────┘               │  │
│  │                                                    │  │
│  │  ┌─────────────┐  ┌──────────────┐               │  │
│  │  │ Expense     │  │ Sync Handler │               │  │
│  │  │ Handler     │  │              │               │  │
│  │  └─────────────┘  └──────────────┘               │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                              │
│                  Storage Interface                       │
│                           │                              │
│         ┌─────────────────┴──────────────────┐          │
│         │                                     │          │
│  ┌──────▼────────┐                  ┌────────▼──────┐  │
│  │  JSON Store   │                  │PostgreSQL Store│  │
│  │  (Single User)│                  │  (Multi-User) │  │
│  └───────────────┘                  └────────┬──────┘  │
└─────────────────────────────────────────────────────────┘
                                                │
┌───────────────────────────────────────────────▼─────────┐
│                    Data Layer                            │
│  ┌──────────────┐              ┌───────────────────┐   │
│  │  JSON Files  │              │  PostgreSQL 15+   │   │
│  │  (data/*.json)│              │  (pg:5432)        │   │
│  └──────────────┘              └───────────────────┘   │
└─────────────────────────────────────────────────────────┘

External Services:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐
│  Google OAuth   │  │  Apple Sign-In  │  │ Gemini API  │
│  (accounts.     │  │  (appleid.      │  │ (generative │
│   google.com)   │  │   apple.com)    │  │  language.  │
│                 │  │                 │  │  googleapis.│
└─────────────────┘  └─────────────────┘  └─────────────┘
```

---

### Database Schema (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL for OAuth-only users
    full_name VARCHAR(255) NOT NULL,
    oauth_provider VARCHAR(50),  -- 'google', 'apple', or NULL
    oauth_provider_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Config Table
CREATE TABLE user_configs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    categories JSONB NOT NULL DEFAULT '["Food","Groceries","Travel","Rent","Utilities","Entertainment","Healthcare","Shopping","Miscellaneous","Income"]',
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    start_date INT NOT NULL DEFAULT 1 CHECK (start_date >= 1 AND start_date <= 31),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recurring_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    tags JSONB DEFAULT '[]',
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,  -- Negative = expense, Positive = income
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Recurring Expenses Table
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    tags JSONB DEFAULT '[]',
    category VARCHAR(100) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    occurrences INT NOT NULL CHECK (occurrences >= 0),  -- 0 = indefinite
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recurring_expenses_user_id ON recurring_expenses(user_id);

-- Refresh Tokens Table (for JWT refresh)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Sync Metadata Table
CREATE TABLE sync_metadata (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_sync_time TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### API Endpoints Reference

#### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/refresh` | Refresh access token | No (refresh token in body) |
| POST | `/api/auth/logout` | Invalidate tokens | Yes |
| POST | `/api/auth/google/verify` | Verify Google ID token | No |
| POST | `/api/auth/apple/verify` | Verify Apple ID token | No |

#### Config Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/config` | Get user config (categories, currency, start date) | Yes |
| GET | `/api/categories` | Get categories list | Yes |
| PUT | `/api/categories/edit` | Update categories | Yes |
| GET | `/api/currency` | Get currency | Yes |
| PUT | `/api/currency/edit` | Update currency | Yes |
| GET | `/api/startdate` | Get start date | Yes |
| PUT | `/api/startdate/edit` | Update start date | Yes |

#### Expense Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/expenses` | Get all user expenses | Yes |
| PUT | `/api/expense` | Add new expense | Yes |
| PUT | `/api/expense/edit?id={uuid}` | Edit expense | Yes |
| DELETE | `/api/expense/delete?id={uuid}` | Delete expense | Yes |
| DELETE | `/api/expenses/delete` | Delete multiple expenses | Yes |

#### Recurring Expense Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/recurring-expenses` | Get all recurring expenses | Yes |
| PUT | `/api/recurring-expense` | Add recurring expense | Yes |
| PUT | `/api/recurring-expense/edit?id={uuid}&updateAll={bool}` | Update recurring expense | Yes |
| DELETE | `/api/recurring-expense/delete?id={uuid}&removeAll={bool}` | Delete recurring expense | Yes |

#### Sync Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/sync/pull` | Pull changes from server | Yes |
| POST | `/api/sync/push` | Push local changes to server | Yes |
| GET | `/api/sync/status` | Get sync status | Yes |

#### Import/Export Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/export/csv` | Export expenses to CSV | Yes |
| POST | `/api/import/csv` | Import CSV file | Yes |
| POST | `/api/import/csvold` | Import old ExpenseOwl CSV | Yes |

#### Voice & AI Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/voice/parse` | Parse voice audio to expenses | Yes |
| GET | `/api/settings/ai` | Get AI config | Yes |
| PUT | `/api/settings/ai/update` | Update AI config | Yes |
| POST | `/api/settings/ai/test` | Test AI connection | Yes |

#### Public Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/version` | Get app version | No |
| GET | `/health` | Health check | No |

---

### Technology Stack

#### Backend
- **Language**: Go 1.23+
- **HTTP Server**: Go standard library (`net/http`)
- **Database**: PostgreSQL 15+ (with `github.com/lib/pq`)
- **Authentication**:
  - JWT (custom implementation)
  - bcrypt for password hashing
- **OAuth**: Google OAuth 2.0, Apple Sign-In
- **AI Integration**: Google Gemini API
- **UUID**: `github.com/google/uuid`
- **Environment**: `github.com/joho/godotenv`

#### Frontend (Web)
- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 5
- **Styling**:
  - Tailwind CSS 3
  - Custom CSS (CSS variables for theming)
- **Routing**: React Router DOM 6
- **State Management**:
  - Zustand (auth state)
  - TanStack Query / React Query (server state)
- **HTTP Client**: Axios
- **Charts**: Chart.js 4 + react-chartjs-2
- **Icons**: Font Awesome 6
- **Date Utilities**: date-fns

#### Frontend (Mobile - React Native)
- **Framework**: React Native 0.72+
- **Language**: TypeScript 5
- **Native Bridge**: Capacitor 5
- **State Management**: Zustand
- **Local Database**: SQLite (react-native-sqlite-storage)
- **HTTP Client**: Axios
- **UI Components**: React Native Paper
- **Navigation**: React Navigation 6

#### Database
- **Primary**: PostgreSQL 15+
- **Fallback**: JSON files (single-user mode)

#### Infrastructure
- **Containerization**: Docker (Alpine-based)
- **Orchestration**: Kubernetes
- **Reverse Proxy**: (User-provided: nginx, Traefik, Caddy)
- **SSL/TLS**: (User-provided: Let's Encrypt)

#### Development Tools
- **Go Modules**: Dependency management
- **npm**: Package management (frontend)
- **ESLint**: Linting (frontend)
- **Prettier**: Code formatting (frontend)

---

### Security Considerations

#### Authentication
- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens signed with HS256
- Access tokens short-lived (15 minutes)
- Refresh tokens long-lived (7 days)
- Token blacklisting on logout (future enhancement)

#### Authorization
- All API endpoints require valid JWT (except auth endpoints)
- Middleware validates JWT signature and expiry
- User ID extracted from JWT claims
- All queries filtered by `user_id`

#### Input Validation
- String sanitization (removes < and >)
- Amount validation (>0, max 15 digits)
- Date validation (ISO 8601 format)
- Category existence check
- Email format validation
- UUID format validation

#### CORS
- Enabled for all origins (configurable)
- Supports credentials (cookies, auth headers)
- Preflight requests handled

#### Rate Limiting
- Not implemented (future enhancement)
- Recommended: 100 req/min per user

#### SQL Injection Prevention
- Prepared statements for all queries
- No string concatenation in SQL

#### XSS Prevention
- HTML escaping on output
- Content Security Policy headers (future enhancement)

---

### Performance Considerations

#### Backend
- Connection pooling for PostgreSQL
- HTTP request timeouts (30 seconds)
- Efficient indexing (user_id, date, category)
- Bulk operations for multiple deletes

#### Frontend
- Code splitting by route
- Lazy loading for non-critical components
- Chart.js canvas rendering (GPU-accelerated)
- Debounced tag autocomplete
- Memoized calculations for category breakdown

#### Database
- Indexed foreign keys
- Compound indexes for common queries
- JSONB for flexible tag storage
- Timestamps for incremental sync

#### Network
- HTTP/2 support
- Gzip compression
- Asset caching (PWA service worker)

---

### Deployment Options

#### Option 1: Docker Compose (Recommended for Homelabs)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: expenseowl
      POSTGRES_USER: expenseowl
      POSTGRES_PASSWORD: secure_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  expenseowl:
    image: expenseowl:latest
    command: --auth --port 8080
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: expenseowl
      DB_USER: expenseowl
      DB_PASSWORD: secure_password
      JWT_SECRET: change-this-secret
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  pgdata:
```

#### Option 2: Kubernetes
- Deployment manifests included in `/kubernetes`
- StatefulSet for PostgreSQL
- Deployment for ExpenseOwl backend
- Service + Ingress for external access
- ConfigMap for environment variables
- Secret for sensitive data (JWT secret, DB password)

#### Option 3: Single Binary (JSON Mode)
```bash
./expenseowl --port 8080
# Data stored in ./data/*.json
```

---

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL host | `localhost` | Multi-user mode |
| `DB_PORT` | PostgreSQL port | `5432` | Multi-user mode |
| `DB_NAME` | Database name | `expenseowl` | Multi-user mode |
| `DB_USER` | Database user | `expenseowl` | Multi-user mode |
| `DB_PASSWORD` | Database password | - | Multi-user mode |
| `DB_SSLMODE` | SSL mode | `disable` | No |
| `JWT_SECRET` | JWT signing key | `default-secret` | **Yes (change in prod)** |
| `JWT_ACCESS_TOKEN_EXPIRY` | Access token TTL | `15m` | No |
| `JWT_REFRESH_TOKEN_EXPIRY` | Refresh token TTL | `7d` | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | Optional (for Google login) |
| `APPLE_CLIENT_ID` | Apple Sign-In service ID | - | Optional (for Apple login) |
| `APPLE_TEAM_ID` | Apple Team ID | - | Optional (for Apple login) |
| `APPLE_KEY_ID` | Apple Key ID | - | Optional (for Apple login) |
| `APPLE_PRIVATE_KEY_PATH` | Path to Apple .p8 key | - | Optional (for Apple login) |
| `PORT` | HTTP server port | `8080` | No |

---

### Testing Strategy

#### Unit Tests
- Go: `go test ./...`
- Coverage target: 80%
- Focus: Business logic, calculations, utilities

#### Integration Tests
- API endpoint testing with test database
- JWT token flow
- CRUD operations
- Sync operations

#### E2E Tests
- Frontend: Cypress or Playwright
- Critical user flows:
  - Register → Login → Add Expense → Logout
  - Add Recurring Expense → Verify Generated Expenses
  - Import CSV → Verify Data

#### Manual Testing Checklist
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness (iOS Safari, Android Chrome)
- [ ] PWA installation
- [ ] Offline functionality
- [ ] Voice recording on HTTPS
- [ ] OAuth flows (Google, Apple)

---

### Future Enhancements (Roadmap)

#### Phase 1 (Completed)
- ✅ Multi-user authentication
- ✅ PostgreSQL support
- ✅ OAuth (Google, Apple)
- ✅ Offline sync
- ✅ React frontend

#### Phase 2 (In Progress)
- 🔄 React Native mobile app
- 🔄 Complete UI conversion (Table, Settings pages)
- 🔄 Voice expense entry

#### Phase 3 (Planned)
- ⏳ Budget tracking per category
- ⏳ Expense alerts (overspending)
- ⏳ Shared expenses (split with other users)
- ⏳ Attachments (receipts, photos)
- ⏳ Reports & analytics (trends, charts)
- ⏳ Export to PDF

#### Phase 4 (Future)
- ⏳ Bank integrations (Plaid, Teller)
- ⏳ Cryptocurrency tracking
- ⏳ Multi-currency conversion
- ⏳ Notifications (push, email)
- ⏳ Webhooks for automation
- ⏳ GraphQL API

---

### Support & Documentation

#### User Documentation
- Installation guide (Docker, Kubernetes, binary)
- User manual (adding expenses, categories, etc.)
- FAQ
- Video tutorials

#### Developer Documentation
- API reference (OpenAPI/Swagger spec)
- Database schema documentation
- Contributing guidelines
- Code style guide

#### Community
- GitHub Issues for bug reports
- GitHub Discussions for feature requests
- Discord server (future)

---

### License & Legal

- **License**: MIT License
- **Open Source**: Yes
- **Commercial Use**: Allowed
- **Privacy**: Self-hosted (user controls data)
- **GDPR Compliance**: User's responsibility (self-hosted)
- **Data Retention**: User-controlled

---

### Success Metrics

#### User Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Average expenses per user per month
- Retention rate (Day 7, Day 30)

#### Technical Metrics
- API response time (p95 < 200ms)
- Database query time (p95 < 50ms)
- Error rate (< 1%)
- Uptime (> 99.9%)

#### Business Metrics
- GitHub stars
- Docker pulls
- Self-hosted instances (estimated)
- Community contributions (PRs, issues)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Author**: Product Specification - ExpenseOwl Team
