#!/bin/bash

# Test PostgreSQL Storage with Authentication

set -e

# Kill any running servers
pkill -9 -f "expenseowl --auth" 2>/dev/null || true
sleep 1

# Start server
echo "🚀 Starting server..."
./expenseowl --auth --port 8083 > /tmp/pg-test.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if server started
if ! curl -s http://localhost:8083/health > /dev/null; then
    echo "❌ Server failed to start"
    cat /tmp/pg-test.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started"
echo ""

# Clean up test user if exists
docker exec -i pg psql -U postgres -d expenseowl -c "DELETE FROM users WHERE email = 'pgtest@example.com';" 2>/dev/null || true

# Register test user
echo "=== Test 1: Register User ==="
RESPONSE=$(curl -s -X POST http://localhost:8083/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"pgtest@example.com","password":"testpass123","full_name":"PG Test User"}')

ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Registration failed"
    echo "$RESPONSE"
    kill $SERVER_PID
    exit 1
fi

echo "✅ User registered, got token"
echo ""

# Test adding expense
echo "=== Test 2: Add Expense ==="
ADD_RESPONSE=$(curl -s -X PUT http://localhost:8083/api/expense \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Grocery",
    "category": "Groceries",
    "amount": -50.00,
    "currency": "usd",
    "date": "2025-11-22T10:00:00Z"
  }')

echo "$ADD_RESPONSE"
echo ""

# Get expenses
echo "=== Test 3: Get Expenses ==="
EXPENSES=$(curl -s http://localhost:8083/api/expenses \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$EXPENSES"
EXPENSE_COUNT=$(echo "$EXPENSES" | grep -o '"id"' | wc -l)
echo ""
echo "✅ Found $EXPENSE_COUNT expenses"
echo ""

# Get categories
echo "=== Test 4: Get Categories ==="
curl -s http://localhost:8083/api/categories \
  -H "Authorization: Bearer $ACCESS_TOKEN"
echo ""
echo ""

# Verify in database
echo "=== Test 5: Verify in Database ==="
docker exec -i pg psql -U postgres -d expenseowl <<EOF
SELECT name, category, amount FROM expenses WHERE user_id = (SELECT id FROM users WHERE email = 'pgtest@example.com');
EOF
echo ""

# Test user isolation
echo "=== Test 6: User Isolation Test ==="
# Register second user
RESPONSE2=$(curl -s -X POST http://localhost:8083/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"pass123","full_name":"User Two"}')

ACCESS_TOKEN2=$(echo "$RESPONSE2" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# User 2 should see no expenses
EXPENSES2=$(curl -s http://localhost:8083/api/expenses \
  -H "Authorization: Bearer $ACCESS_TOKEN2")

USER2_COUNT=$(echo "$EXPENSES2" | grep -o '"id"' | wc -l)
echo "User 2 expense count: $USER2_COUNT (should be 0)"

if [ "$USER2_COUNT" -eq "0" ]; then
    echo "✅ User isolation working correctly"
else
    echo "❌ User isolation FAILED - users can see each other's data!"
fi

# Cleanup
echo ""
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null
docker exec -i pg psql -U postgres -d expenseowl -c "DELETE FROM users WHERE email IN ('pgtest@example.com', 'user2@example.com');" 2>/dev/null || true
echo "Done!"
