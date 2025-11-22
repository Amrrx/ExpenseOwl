#!/bin/bash

# ExpenseOwl Docker PostgreSQL Setup Script

set -e

echo "🦉 ExpenseOwl Database Setup (Docker)"
echo "======================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Docker container name for PostgreSQL
DOCKER_CONTAINER="${POSTGRES_CONTAINER:-postgres}"

echo "📦 Connecting to PostgreSQL in Docker container: $DOCKER_CONTAINER"

# Check if Docker container is running
if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
    echo "❌ PostgreSQL Docker container '$DOCKER_CONTAINER' is not running"
    echo "Please start your PostgreSQL container and try again."
    exit 1
fi

echo "✅ PostgreSQL container is running"

# Create database user if it doesn't exist
echo "👤 Creating database user '${DB_USER}'..."
docker exec -i "$DOCKER_CONTAINER" psql -U postgres <<EOF || true
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
ALTER USER ${DB_USER} WITH SUPERUSER;
EOF

# Create database if it doesn't exist
echo "📦 Creating database '${DB_NAME}'..."
docker exec -i "$DOCKER_CONTAINER" psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
docker exec -i "$DOCKER_CONTAINER" psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}"

echo "✅ Database '${DB_NAME}' ready"

# Grant privileges
echo "🔐 Granting privileges..."
docker exec -i "$DOCKER_CONTAINER" psql -U postgres <<EOF
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Info:"
echo "   Host: ${DB_HOST}:${DB_PORT}"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo ""
echo "Next step: Run migrations"
echo "  go build -o migrate ./cmd/migrate"
echo "  ./migrate"
