#!/bin/bash

# Test Sync API Endpoints

set -e

PORT=8085

# Kill any running servers
pkill -9 -f "expenseowl --auth" 2>/dev/null || true
sleep 1

# Start server
echo "🚀 Starting server..."
./expenseowl --auth --port $PORT > /tmp/sync-test.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if server started
if ! curl -s http://localhost:$PORT/health > /dev/null; then
    echo "❌ Server failed to start"
    cat /tmp/sync-test.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started"
echo ""

# Clean up test user if exists
docker exec -i pg psql -U postgres -d expenseowl -c "DELETE FROM users WHERE email = 'synctest@example.com';" 2>/dev/null || true

# Register test user
echo "=== Test 1: Register User ==="
RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"synctest@example.com","password":"testpass123","full_name":"Sync Test User"}')

ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Registration failed"
    echo "$RESPONSE"
    kill $SERVER_PID
    exit 1
fi

echo "✅ User registered, got token"
echo ""

# Test 2: Get sync status (should be never synced)
echo "=== Test 2: Get Sync Status (initial) ==="
curl -s http://localhost:$PORT/api/sync/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 3: Add some expenses via regular API
echo "=== Test 3: Add Expenses via Regular API ==="
curl -s -X PUT http://localhost:$PORT/api/expense \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Grocery",
    "category": "Groceries",
    "amount": -50.00,
    "currency": "usd",
    "date": "2025-11-22T10:00:00Z"
  }' | jq '.'
echo ""

curl -s -X PUT http://localhost:$PORT/api/expense \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salary",
    "category": "Income",
    "amount": 3000.00,
    "currency": "usd",
    "date": "2025-11-01T10:00:00Z"
  }' | jq '.'
echo ""

# Test 4: Full sync pull (first time)
echo "=== Test 4: Pull Full Sync ==="
PULL_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/sync/pull \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"last_sync_time": null}')

echo "$PULL_RESPONSE" | jq '.'
EXPENSE_COUNT=$(echo "$PULL_RESPONSE" | jq '.expenses | length')
echo "Pulled $EXPENSE_COUNT expenses"
echo ""

# Test 5: Get sync status after pull
echo "=== Test 5: Get Sync Status (after pull) ==="
curl -s http://localhost:$PORT/api/sync/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 6: Incremental pull (should return nothing)
echo "=== Test 6: Pull Incremental Sync (no changes) ==="
LAST_SYNC=$(echo "$PULL_RESPONSE" | jq -r '.server_time')
curl -s -X POST http://localhost:$PORT/api/sync/pull \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"last_sync_time\": \"$LAST_SYNC\"}" | jq '.'
echo ""

# Test 7: Push new expense from client
echo "=== Test 7: Push New Expense from Client ==="
CLIENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EXPENSE_ID=$(uuidgen)
PUSH_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/sync/push \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"expenses\": [{
      \"id\": \"$EXPENSE_ID\",
      \"name\": \"Coffee\",
      \"tags\": [\"daily\"],
      \"category\": \"Food\",
      \"amount\": -5.50,
      \"currency\": \"usd\",
      \"date\": \"$CLIENT_TIME\",
      \"is_deleted\": false,
      \"created_at\": \"$CLIENT_TIME\",
      \"updated_at\": \"$CLIENT_TIME\"
    }],
    \"recurring_expenses\": [],
    \"client_time\": \"$CLIENT_TIME\"
  }")

echo "$PUSH_RESPONSE" | jq '.'
echo ""

# Test 8: Verify pushed expense appears in pull
echo "=== Test 8: Verify Pushed Expense in Pull ==="
curl -s -X POST http://localhost:$PORT/api/sync/pull \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"last_sync_time": null}' | jq '.expenses | length'
echo ""

# Test 9: Push with conflict (server has newer version)
echo "=== Test 9: Push with Conflict (server newer) ==="
# Get first expense ID
FIRST_EXPENSE_ID=$(echo "$PULL_RESPONSE" | jq -r '.expenses[0].id')
OLD_TIME="2025-01-01T00:00:00Z"

curl -s -X POST http://localhost:$PORT/api/sync/push \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"expenses\": [{
      \"id\": \"$FIRST_EXPENSE_ID\",
      \"name\": \"Updated Name\",
      \"tags\": [],
      \"category\": \"Food\",
      \"amount\": -100.00,
      \"currency\": \"usd\",
      \"date\": \"$OLD_TIME\",
      \"is_deleted\": false,
      \"created_at\": \"$OLD_TIME\",
      \"updated_at\": \"$OLD_TIME\"
    }],
    \"recurring_expenses\": [],
    \"client_time\": \"$CLIENT_TIME\"
  }" | jq '.'
echo ""

# Cleanup
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null
docker exec -i pg psql -U postgres -d expenseowl -c "DELETE FROM users WHERE email = 'synctest@example.com';" 2>/dev/null || true
echo "Done!"
