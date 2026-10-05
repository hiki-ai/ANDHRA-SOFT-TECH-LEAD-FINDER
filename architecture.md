# ANDHRA SOFT TECH — LEAD FINDER ARCHITECTURE

## High-Level System Architecture

```
React 19 + Vite (Frontend)
      |
      +---- Firebase Authentication (Identity & Token Issuance)
      |
      +---- Firebase Cloud Firestore (Direct Cloud Client Access)
      |
      +---- Firebase Storage (Spreadsheet file assets)
      |
      +---- Flask REST API Layer (/api/v1) [Bearer JWT Token]
                  |
                  +---- Firebase Admin SDK
                  |
                  +---- Cloud Firestore (Server-Side DB Engine)
                  |
                  ↓
       [ Asynchronous Collection Job Queue ]
                  |
                  ↓
       [ Worker Service & Source Manager ]
                  |
         +--------+--------+
         |                 |
         ↓                 ↓
 [ Permitted Source A ] [ Permitted Source B ]
         |                 |
         +--------+--------+
                  ↓
       [ Normalization Pipeline ]
                  ↓
       [ Validation & Phone Scrubbing ]
                  ↓
       [ Deduplication Matcher ]
                  ↓
       [ Bulk Batch Upsert to Cloud Firestore ]
         (Chunks <= 450 documents/commit)
```

## Architectural Decoupling
1. **Frontend (`frontend/`)**: React 19 SPA with Vite, Tailwind CSS, TanStack Query, and isolated Firebase client config (`frontend/src/config/firebase.js`).
2. **Backend (`backend/`)**: Flask REST service verifying Firebase ID tokens, executing Cloud Firestore operations via Firebase Admin SDK, and managing job lifecycle.
3. **Extraction Worker (`worker/`)**: Independent Python worker process with pluggable source connectors, rate throttling, and batch Firestore loading.
4. **Database**: Firebase Cloud Firestore with composite and single-field indexing, scaled for 500,000+ vendor lead documents without dependency on Supabase.
