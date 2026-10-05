# Firebase Authentication Setup & Configuration

## Overview
Firebase Authentication is used strictly for identity management (Admin email/password login, token issuance, session persistence, and password resets).
Application vendor data is stored in Supabase PostgreSQL, NOT Firestore.

## Configuration Location
- **Single Client Initialization**: `frontend/src/config/firebase.js`
- **Authentication Service**: `frontend/src/auth/authService.js`
- **React Context & Provider**: `frontend/src/auth/AuthContext.jsx` & `frontend/src/auth/AuthProvider.jsx`
- **Route Guard**: `frontend/src/auth/ProtectedRoute.jsx`

## Environment Variables (`frontend/.env`)
```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Backend Verification (`backend/app/middleware/firebase_auth.py`)
Incoming requests with `Authorization: Bearer <ID_TOKEN>` are verified via the Firebase Admin SDK using service account credentials. Private backend credentials must never be exposed to the client.
