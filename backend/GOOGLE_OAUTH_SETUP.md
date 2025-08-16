# Google OAuth Setup Guide

## Backend Setup

### 1. Install Dependencies
```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 requests
```

### 2. Environment Variables
Create a `.env` file in the backend directory with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Django Settings
SECRET_KEY=your_django_secret_key_here
DEBUG=True
```

### 3. Get Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Choose "Web application"
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `http://localhost:5173` (for Vite development)
8. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:5173/auth/google/callback`
9. Copy the Client ID and Client Secret to your `.env` file

## Frontend Setup

### 1. Update Google Client ID
In `frontend/src/components/Login.jsx`, replace `'YOUR_GOOGLE_CLIENT_ID'` with your actual Google Client ID.

### 2. Update API Configuration
In `frontend/src/utils/api.js`, replace `'YOUR_GOOGLE_CLIENT_ID'` with your actual Google Client ID.

## Testing

1. Start the backend server:
```bash
python manage.py runserver
```

2. Start the frontend development server:
```bash
npm run dev
```

3. Navigate to the login page and click "Continue with Google"

## Features Implemented

✅ **Backend:**
- Custom User model with Google OAuth support
- Google OAuth authentication endpoint
- JWT token generation for Google users
- User creation/linking with Google accounts

✅ **Frontend:**
- Google OAuth button in login modal
- Google Sign-In integration
- Loading states and error handling
- Automatic token storage and authentication

✅ **Security:**
- Google ID token verification
- Secure JWT token generation
- Session management for Google users

## Notes

- Google users will have their email as the primary identifier
- Usernames are auto-generated from email addresses
- Profile pictures from Google are automatically imported
- Google users can still use regular login if they have an account 