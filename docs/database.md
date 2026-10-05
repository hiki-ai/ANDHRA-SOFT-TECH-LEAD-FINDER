# Database Specification (Firebase Cloud Firestore)

## Schema Overview
ANDHRA SOFT TECH — LEAD FINDER uses **Firebase Cloud Firestore** as its document database, engineered for horizontal scale beyond 500,000+ lead records:

- `vendors`: Core vendor lead documents (business name, category, phone, email, address, city, district, state, pin, rating, reviews, status, data quality score, dedupe key, custom fields).
- `collections`: Asynchronous batch extraction jobs, progress counters (found, valid, duplicate, failed), and execution state.
- `customColumns`: Dynamic spreadsheet columns defined by administrators, supporting custom data types (text, number, boolean, date, phone, email).
- `sources`: Public directory connectors, domain rules, and rate limits.
- `users`: Administrator credentials and role metadata.
- `metadata/dashboardStats`: Aggregated metric counters for near-instant dashboard telemetry.

## Firestore Indexing Strategy
- **Composite Indexes**:
  - `vendors`: `(category ASC, city ASC, status ASC)`
  - `vendors`: `(city ASC, status ASC, created_at DESC)`
  - `collections`: `(status ASC, started_at DESC)`
- **Single-Field Indexes**: Automatically indexed by Firestore for equality filters (`phone`, `email`, `dedupe_key`, `category`, `city`, `status`).

## Batch Write Rules
- Max **450 operations per batch** commit (well within Firestore's 500-op limit).
- Duplicate prevention using composite `dedupe_key` (`{normalized_name}_{normalized_phone}_{normalized_city}`).
