# Firebase Architecture & Configuration (Auth + Firestore + Storage)

## Overview
ANDHRA SOFT TECH — LEAD FINDER is fully powered by **Firebase**:
1. **Firebase Authentication**: Identity management (Admin email/password login, ID token issuance, session persistence, role protection).
2. **Cloud Firestore**: Primary scalable NoSQL document database storing 500,000+ indexed vendor leads, extraction collections, and configuration metadata.
3. **Firebase Storage**: Asset and spreadsheet file storage (when required for imports/exports).
4. **Firebase Admin SDK**: Server-side token verification and Firestore batch operations on the Python Flask backend and extraction worker.

## Configuration Location
- **Single Central Client Initialization**: `frontend/src/config/firebase.js`
- **Authentication Service**: `frontend/src/auth/authService.js`
- **Firestore Service**: `frontend/src/services/firestoreService.js`
- **React Context & Provider**: `frontend/src/auth/AuthContext.jsx` & `frontend/src/auth/AuthProvider.jsx`
- **Backend Admin SDK**: `backend/app/config/firebase.py` & `backend/app/middleware/firebase_auth.py`

## Active Environment Variables (`frontend/.env`)
```bash
VITE_API_URL=http://localhost:5000/api/v1
VITE_FIREBASE_API_KEY=AIzaSyDaGxyFJv2S8GVrqw1Cj1yAqe8SR8bz4jU
VITE_FIREBASE_AUTH_DOMAIN=andhra-soft-tech-lead-finder.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=andhra-soft-tech-lead-finder
VITE_FIREBASE_STORAGE_BUCKET=andhra-soft-tech-lead-finder.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1028511931788
VITE_FIREBASE_APP_ID=1:1028511931788:web:b0e6b4ff69da76881c4aa9
VITE_FIREBASE_MEASUREMENT_ID=G-4SYW5WDVSN
```

## Backend Environment Variables (`backend/.env`)
```bash
FIREBASE_PROJECT_ID=andhra-soft-tech-lead-finder
FIREBASE_STORAGE_BUCKET=andhra-soft-tech-lead-finder.firebasestorage.app
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## Firestore Collections Schema
- `vendors`: Vendor lead records with normalized attributes, quality scores, and dedupe keys.
- `collections`: Extraction job metadata, target limits, and progress telemetry.
- `sources`: Public directory connectors and rate-limit tracking.
- `customColumns`: Dynamic table column definitions configured by the administrator.
- `metadata`: Aggregated statistics and dashboard analytics cache.

## Safe Batch Writes
All batch operations commit in chunks of **<= 450 documents** to stay strictly within Firestore's 500-operation transaction limit.
