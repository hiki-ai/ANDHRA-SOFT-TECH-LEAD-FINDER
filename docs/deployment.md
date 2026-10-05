# Deployment Guide

## Production Architecture
- **Frontend SPA**: Netlify (or Vercel)
  - Build command: `npm run build`
  - Publish directory: `frontend/dist`
  - Environment variables: `VITE_API_URL`, `VITE_FIREBASE_*`
- **Backend API**: Render (Python Web Service with Gunicorn)
  - Build command: `pip install -r requirements.txt`
  - Start command: `gunicorn run:app`
  - Environment variables: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `SECRET_KEY`
- **Database**: Firebase Cloud Firestore
- **Authentication**: Firebase Authentication
- **Worker**: Render Background Worker
