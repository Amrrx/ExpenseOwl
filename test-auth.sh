#!/bin/bash

# Test ExpenseOwl Authentication

# Kill any running servers
pkill -9 -f "expenseowl --auth" 2>/dev/null
sleep 1

# Start server in background
echo "Starting server on port 8082..."
./expenseowl --auth --port 8082 > /tmp/expenseowl-test.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if server is running
if ! curl -s http://localhost:8082/health > /dev/null; then
    echo "❌ Server failed to start"
    cat /tmp/expenseowl-test.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started successfully"
echo ""

# Test 1: Registration
echo "=== Test 1: Register New User ==="
RESPONSE=$(curl -s -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123","full_name":"Test User"}')
echo "$RESPONSE"
echo ""

# Extract tokens from response
ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Registration failed or no token received"
else
    echo "✅ Registration successful, got access token"
    echo ""

    # Test 2: Access protected endpoint
    echo "=== Test 2: Access Protected Endpoint ==="
    curl -s http://localhost:8082/api/expenses \
      -H "Authorization: Bearer $ACCESS_TOKEN"
    echo ""
    echo ""

    # Test 3: Login
    echo "=== Test 3: Login ==="
    curl -s -X POST http://localhost:8082/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"testuser@example.com","password":"password123"}'
    echo ""
fi

# Cleanup
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
sleep 1
echo "Done!"
