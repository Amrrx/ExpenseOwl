# OAuth Integration Setup Guide

## Overview

ExpenseOwl now supports OAuth authentication with Google and Apple Sign-In. This allows users to authenticate using their existing Google or Apple accounts without creating a separate password.

## Implementation

### Architecture

- **Token Verification Approach**: The backend accepts ID tokens from frontend/mobile apps and verifies them server-side
- **User Linking**: Automatically links OAuth accounts to existing users with matching verified emails
- **JWT Generation**: After successful OAuth verification, the backend generates JWT access and refresh tokens
- **Database Storage**: OAuth accounts are stored in the `oauth_accounts` table with links to users

### API Endpoints

#### Google Sign-In

**Endpoint**: `POST /api/auth/google/verify`

**Request Body**:
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response** (Success):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-11-22T..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "expires_in": 900,
  "is_new_user": false
}
```

**Response** (Error):
```
400 Bad Request: ID token is required
401 Unauthorized: Invalid ID token
400 Bad Request: Email not verified
500 Internal Server Error: Failed to process OAuth login
```

#### Apple Sign-In

**Endpoint**: `POST /api/auth/apple/verify`

**Status**: Not yet implemented (returns 501 Not Implemented)

**Note**: Requires Apple Developer account and additional setup steps

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback

# Apple OAuth
APPLE_CLIENT_ID=com.yourapp.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_KEYID.p8
APPLE_REDIRECT_URI=http://localhost:8080/api/auth/apple/callback
```

### Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Sign-In API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sign-In" or "Google Identity"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select application type (Web application, iOS, Android)
   - Add authorized redirect URIs (for web: `http://localhost:8080/api/auth/google/callback`)
   - Copy the Client ID and Client Secret

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Fill in application name, support email, developer contact
   - Add scopes: `email`, `profile`, `openid`

5. **Update .env File**
   ```bash
   GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
   ```

### Apple Sign-In Setup

**Status**: Implementation pending - requires Apple Developer Program membership

**Required Steps**:
1. Enroll in Apple Developer Program ($99/year)
2. Create App ID with Sign in with Apple capability
3. Create Service ID for web authentication
4. Generate private key for Sign in with Apple
5. Configure domains and redirect URLs
6. Implement Apple ID token verification (JWT verification with Apple's public keys)

## Usage Flow

### Frontend/Mobile Integration

1. **User clicks "Sign in with Google"**
2. **Frontend initiates Google Sign-In** (using Google Sign-In SDK)
3. **Google returns ID token to frontend**
4. **Frontend sends ID token to backend**:
   ```javascript
   fetch('/api/auth/google/verify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ id_token: googleIdToken })
   })
   ```
5. **Backend verifies ID token with Google**
6. **Backend creates/links user account**
7. **Backend returns JWT tokens**
8. **Frontend stores JWT tokens for subsequent API calls**

### User Account Linking

- If OAuth email matches existing user email (and email is verified), the OAuth account is linked to that user
- If no matching user exists, a new user account is created
- Default user configuration (categories, currency) is created for new users
- OAuth tokens are stored in `oauth_accounts` table for future reference

## Database Schema

### oauth_accounts Table

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,           -- 'google' or 'apple'
    provider_user_id VARCHAR(255) NOT NULL,  -- User ID from OAuth provider
    email VARCHAR(255),
    access_token TEXT,                        -- OAuth access token (stored for reference)
    refresh_token TEXT,                       -- OAuth refresh token (if provided)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);
```

## Security Considerations

1. **ID Token Verification**
   - Google ID tokens are verified using Google's official `idtoken` library
   - Tokens are validated for signature, expiration, and audience (client ID)
   - Email verification status is checked before account creation

2. **Email Verification Requirement**
   - Only verified emails from OAuth providers are accepted
   - Unverified emails are rejected with 400 Bad Request

3. **User Isolation**
   - All user data is scoped by `user_id`
   - OAuth accounts are linked via foreign key with CASCADE delete

4. **Token Storage**
   - OAuth tokens are stored for reference but not used for authentication
   - JWT tokens are generated separately for API authentication
   - Refresh tokens have 7-day expiry

## Testing

Run the OAuth endpoint tests:

```bash
./test-oauth.sh
```

Expected output:
- ✅ Empty token request: "ID token is required"
- ✅ Invalid token: "Invalid ID token"
- ✅ Apple endpoint: "Apple Sign-In not yet implemented"
- ✅ Wrong method: "Method not allowed"

## Next Steps

1. **Frontend Integration**
   - Add Google Sign-In button to login page
   - Integrate Google Sign-In JavaScript SDK
   - Handle ID token exchange with backend

2. **Apple Sign-In Implementation**
   - Complete Apple Developer setup
   - Implement Apple ID token verification
   - Add Apple Sign-In button to login page

3. **Mobile Integration**
   - Implement Google Sign-In in React Native
   - Implement Apple Sign-In in React Native (iOS only)
   - Handle token exchange with backend

4. **Enhanced Features**
   - OAuth token refresh handling
   - Account unlinking functionality
   - Multiple OAuth providers per user
   - Profile picture sync from OAuth providers
