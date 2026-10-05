# Deployment Guide

## Production Architecture
- **Frontend SPA**: Netlify (or Vercel)
  - Build command: `npm run build`
  - Publish directory: `frontend/dist`
  - Environment variables: `VITE_API_URL`, `VITE_FIREBASE_*`
- **Backend API**: Render (Python Web Service with Gunicorn)
  - Build command: `pip install -r requirements.txt`
  - Start command: `gunicorn run:app`
  - Environment variables: `DATABASE_URL`, `FIREBASE_*`, `SECRET_KEY`
- **Database**: Supabase PostgreSQL
- **Worker**: Render Background Worker or Celery / Redis
