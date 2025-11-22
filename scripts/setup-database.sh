#!/bin/bash

# ExpenseOwl Database Setup Script

set -e

echo "🦉 ExpenseOwl Database Setup"
echo "=============================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on ${DB_HOST:-localhost}:${DB_PORT:-5432}"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
echo "📦 Creating database '${DB_NAME}'..."
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME}"

echo "✅ Database '${DB_NAME}' ready"

# Run migrations
echo "🔄 Running migrations..."
for migration in migrations/*.sql; do
    echo "  ➜ Running $(basename $migration)..."
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "$migration"
done

echo "✅ All migrations completed successfully!"
echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Info:"
echo "   Host: ${DB_HOST}:${DB_PORT}"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo ""
echo "🔐 Default admin credentials (CHANGE IMMEDIATELY):"
echo "   Email: admin@expenseowl.local"
echo "   Password: admin123"
echo ""
echo "Next steps:"
echo "  1. Update the default admin password"
echo "  2. Configure OAuth credentials in .env"
echo "  3. Run: go run cmd/expenseowl/main.go"
