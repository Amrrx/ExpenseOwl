#!/bin/bash

# Test OAuth Endpoints

set -e

PORT=8084

echo "=== Testing OAuth Endpoints ==="
echo ""

# Test Google OAuth endpoint - will fail without valid token but should return proper error
echo "=== Test 1: Google OAuth Verify without token ==="
RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/google/verify \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$RESPONSE"
echo ""

# Test Google OAuth endpoint with empty token
echo "=== Test 2: Google OAuth Verify with empty token ==="
RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/google/verify \
  -H "Content-Type: application/json" \
  -d '{"id_token":""}')

echo "$RESPONSE"
echo ""

# Test Google OAuth endpoint with invalid token - will fail validation
echo "=== Test 3: Google OAuth Verify with invalid token ==="
RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/google/verify \
  -H "Content-Type: application/json" \
  -d '{"id_token":"invalid.token.here"}')

echo "$RESPONSE"
echo ""

# Test Apple OAuth endpoint - should return not implemented
echo "=== Test 4: Apple OAuth Verify ==="
RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/apple/verify \
  -H "Content-Type: application/json" \
  -d '{"id_token":"test-token"}')

echo "$RESPONSE"
echo ""

# Test wrong method
echo "=== Test 5: Google OAuth Verify wrong method ==="
RESPONSE=$(curl -s -X GET http://localhost:$PORT/api/auth/google/verify)

echo "$RESPONSE"
echo ""

echo "✅ OAuth endpoint tests complete!"
echo ""
echo "📝 Note: Google OAuth requires valid ID tokens from Google Sign-In"
echo "📝 Note: Apple OAuth is not yet implemented (requires Apple Developer setup)"
