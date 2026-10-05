# ANDHRA SOFT TECH — LEAD FINDER ARCHITECTURE

## High-Level System Architecture

```
[ React 19 Frontend + Tailwind CSS ]
         |
         ├──> Firebase Authentication (Identity & Token Issuance)
         |
         └──> Flask REST API Layer (/api/v1) [Bearer JWT Token]
                     |
         +-----------+-----------+
         |                       |
         ↓                       ↓
[ Supabase PostgreSQL DB ]  [ Asynchronous Collection Job Queue ]
 - 500,000+ indexed records      |
 - Dynamic JSONB columns         ↓
 - Deduplication keys       [ Worker Service & Source Manager ]
                                 |
                     +-----------+-----------+
                     |                       |
                     ↓                       ↓
           [ Permitted Connector A ]  [ Permitted Connector B ]
           (Official Directory API)   (Licensed Commercial Feed)
                     |                       |
                     +-----------+-----------+
                                 ↓
                     [ Normalization Pipeline ]
                                 ↓
                     [ Validation & Phone Scrubbing ]
                                 ↓
                     [ Deduplication Matcher ]
                                 ↓
                     [ Bulk Upsert to Supabase ]
```

## Architectural Decoupling
1. **Frontend (`frontend/`)**: React 19 SPA with Vite, Tailwind CSS, TanStack Query, and isolated Firebase client config.
2. **Backend (`backend/`)**: Flask REST service verifying Firebase ID tokens, executing PostgreSQL queries, and managing job lifecycle.
3. **Extraction Worker (`worker/`)**: Independent Python worker process with pluggable source connectors, rate throttling, and batch database loading.
4. **Database**: Supabase PostgreSQL with B-tree and composite indexing on dedupe keys and search parameters.
