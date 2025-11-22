# ExpenseOwl Setup Guide

## Prerequisites

- Go 1.23+
- PostgreSQL 14+
- Node.js 18+ (for future React frontend)

## Database Setup

### 1. Create PostgreSQL User and Database

```bash
# Login to PostgreSQL as superuser
sudo -u postgres psql

# Create user
CREATE USER expenseowl WITH PASSWORD 'expenseowl123';

# Create database
CREATE DATABASE expenseowl OWNER expenseowl;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE expenseowl TO expenseowl;

# Exit
\q
```

### 2. Configure Environment

Edit `.env` file with your database credentials:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=expenseowl
DB_PASSWORD=expenseowl123
DB_NAME=expenseowl
```

### 3. Run Migrations

```bash
# Build migration tool
go build -o migrate ./cmd/migrate

# Run migrations
./migrate
```

You should see:
```
✅ Connected to database
🔄 Applying 001_initial_schema.sql...
✅ Applied 001_initial_schema.sql
🎉 All migrations completed successfully!
```

## Running the Application

```bash
# Build the server
go build -o expenseowl ./cmd/expenseowl

# Run the server
./expenseowl

# Or run directly
go run ./cmd/expenseowl/main.go
```

Server will start on `http://localhost:8080`

## Default Credentials

**⚠️ CHANGE IMMEDIATELY IN PRODUCTION**

- Email: `admin@expenseowl.local`
- Password: `admin123`

## Verify Installation

```bash
# Check database connection
psql -U expenseowl -d expenseowl -c "SELECT COUNT(*) FROM users;"

# Should return 1 (the admin user)
```

## Next Steps

1. ✅ Database is set up
2. ⏭️ Next: Implement JWT authentication
3. ⏭️ Then: Add OAuth (Google, Apple)
4. ⏭️ Finally: Create React frontend

## Troubleshooting

### "password authentication failed"
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env` match PostgreSQL user

### "database does not exist"
- Run the CREATE DATABASE command above
- Make sure DB_NAME in .env matches

### "permission denied"
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE expenseowl TO expenseowl;`

## Clean Start (Reset Database)

```bash
# WARNING: This deletes all data!
dropdb -U expenseowl expenseowl
createdb -U expenseowl expenseowl
./migrate
```
