# Architecture Specification

## Data & Request Flows

### 1. User Authentication & Authorization Flow
```
User (Browser)
   ↓
Login.jsx
   ↓
authService.js
   ↓
Firebase Authentication (client-side SDK)
   ↓
JWT ID Token Issued
   ↓
AuthProvider (Context State)
   ↓
ProtectedRoute (Role & Access Guard)
   ↓
Dashboard View
```

### 2. Collection Job & Pipeline Flow
```
Admin initiates collection from Frontend (UI)
   ↓
POST /api/v1/collections (Flask API)
   ↓
Collection Job Record created in Supabase (status: 'pending')
   ↓
Worker Service picks up Job
   ↓
Source Manager selects Permitted Source Connector
   ↓
Raw Records fetched with Rate Limiting & Throttling
   ↓
Normalizer (names, addresses, phone sanitization)
   ↓
Validator (business name, phone format, pincode)
   ↓
Deduplicator (generates dedupe_key: normalized_name + phone + city)
   ↓
Bulk Upsert into Supabase PostgreSQL (Batch size: 500)
   ↓
Progress & Statistics Updated (Found, Valid, Duplicate, Failed)
   ↓
Frontend Polls / Reads Live Telemetry
```
