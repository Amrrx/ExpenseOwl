# ExpenseOwl Multi-User Authentication Setup

## Overview

ExpenseOwl now supports multi-user authentication with JWT tokens and PostgreSQL database. This guide will help you set up and test the authentication system.

## Features Implemented ✅

- ✅ JWT-based authentication (access + refresh tokens)
- ✅ User registration and login endpoints
- ✅ Password hashing with bcrypt
- ✅ Token refresh mechanism
- ✅ Protected API routes with middleware
- ✅ PostgreSQL multi-user schema
- ✅ User isolation (data scoped by user_id)
- ✅ CORS support for frontend development

## Database Setup

The database has been configured with the following schema:

```
users → user_configs
      → expenses
      → recurring_expenses
      → oauth_accounts
      → refresh_tokens
      → sync_state
```

All user data is isolated by `user_id` foreign keys with CASCADE delete.

### Default Admin User

Created during migration:
- Email: `admin@expenseowl.local`
- Password: `admin123`
- **⚠️ Change this immediately in production!**

## API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/health` | Health check |
| GET | `/version` | API version |

### Protected Endpoints (Require Bearer Token)

All `/api/*` endpoints except `/api/auth/*` require authentication.

Examples:
- `/api/expenses` - Get user's expenses
- `/api/config` - Get user's configuration
- `/api/categories` - Get user's categories

## Running the Server

### Mode 1: Single-User (Legacy)

```bash
./expenseowl
# Or
./expenseowl --port 8080
```

This runs the original single-user server with JSON file storage.

### Mode 2: Multi-User (Auth Enabled)

```bash
./expenseowl --auth
# Or
./expenseowl --auth --port 8080
```

This runs the new multi-user server with PostgreSQL and JWT authentication.

## Testing the Authentication

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "full_name": "Test User",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 900
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Use Protected Endpoints

```bash
# Export access token
TOKEN="your-access-token-here"

# Get expenses
curl http://localhost:8080/api/expenses \
  -H "Authorization: Bearer $TOKEN"

# Add expense
curl -X PUT http://localhost:8080/api/expense \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch",
    "category": "Food",
    "amount": -15.99,
    "currency": "usd",
    "date": "2024-01-01T12:00:00Z"
  }'
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token-here"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token-here"
  }'
```

## Environment Configuration

Required environment variables in `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=expenseowl
DB_PASSWORD=expenseowl123
DB_NAME=expenseowl
DB_SSLMODE=disable

# JWT
JWT_SECRET=change-this-to-a-random-secret-key-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=8080

# Docker (for scripts)
POSTGRES_CONTAINER=pg
```

## Security Notes

1. **JWT Secret**: Change `JWT_SECRET` to a strong random value in production
2. **Password Hashing**: Uses bcrypt with cost factor 12
3. **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Current CORS allows all origins (*) - restrict in production

## Known Issue: PostgreSQL Authentication

If you encounter "password authentication failed" when running `./expenseowl --auth`:

This happens because the Docker PostgreSQL container uses `md5` or `scram-sha-256` authentication for external connections. Solutions:

### Option 1: Connect via Docker Network (Recommended for Development)

Run the Go server in a Docker container on the same network as PostgreSQL.

### Option 2: Configure pg_hba.conf for Trust Authentication

```bash
docker exec -it pg bash
# Edit /var/lib/postgresql/data/pg_hba.conf
# Change: host all all all md5
# To: host all all 127.0.0.1/32 trust
# Restart PostgreSQL
```

⚠️ **Not recommended for production!**

### Option 3: Use Correct Password Encoding

The password might need to be MD5 hashed. Try updating:

```bash
docker exec -i pg psql -U postgres <<EOF
ALTER USER expenseowl WITH ENCRYPTED PASSWORD 'expenseowl123';
EOF
```

### Option 4: Connect via localhost with SSL

Update `.env`:
```bash
DB_SSLMODE=require
```

## Next Steps

1. ✅ Authentication system implemented
2. ⏭️ Migrate storage handlers to use PostgreSQL (currently using legacy JSON storage)
3. ⏭️ Add OAuth integration (Google, Apple Sign-In)
4. ⏭️ Create React frontend with login/register pages
5. ⏭️ Implement offline sync for mobile apps
6. ⏭️ Set up React Native project

## Architecture

### Token Flow

```
1. User registers/logs in
2. Server generates JWT access + refresh tokens
3. Client stores tokens (localStorage/SecureStorage)
4. Client includes access token in Authorization header
5. Server validates token and extracts user_id
6. All database queries filtered by user_id
7. When access token expires, use refresh token to get new pair
```

### Database Schema Highlights

- `users`: Core user account data
- `user_configs`: User-specific settings (categories, currency)
- `expenses`: User expenses with soft delete support
- `recurring_expenses`: Recurring expense templates
- `refresh_tokens`: Active refresh tokens with revocation
- `sync_state`: Tracks last sync time for offline sync
- `oauth_accounts`: OAuth provider accounts (Google, Apple)

All tables include proper indexes and automatic timestamp triggers.

## Troubleshooting

### Server won't start

- Check PostgreSQL is running: `docker ps | grep pg`
- Verify `.env` file exists with correct values
- Check database connection: `docker exec -i pg psql -U expenseowl -d expenseowl -c "SELECT 1"`

### Authentication fails

- Verify JWT_SECRET is set
- Check access token hasn't expired (15 minutes)
- Ensure Authorization header format: `Bearer <token>`
- Check user exists and is active in database

### Database errors

- Ensure migrations ran successfully
- Check user has proper permissions
- Verify database connection string in `.env`

## File Structure

```
internal/
├── auth/
│   ├── jwt.go         # JWT token generation and validation
│   └── password.go    # Password hashing utilities
├── api/
│   ├── auth.go        # Authentication handlers
│   ├── middleware.go  # Auth middleware
│   └── handlers.go    # API handlers (existing)
├── config/
│   └── config.go      # Configuration loader
└── storage/
    └── ...            # Storage layer (to be migrated)
```
