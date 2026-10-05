# REST API Specifications (`/api/v1`)

## Base URL
`/api/v1`

## Endpoints

### Authentication
- `GET /auth/me` — Return current verified user profile & role

### Vendors
- `GET /vendors?page=1&limit=50&category=&city=&status=&search=` — Server-side paginated list
- `GET /vendors/:id` — Full vendor profile with custom JSONB fields
- `PATCH /vendors/:id` — Update vendor attributes
- `DELETE /vendors/:id` — Soft-delete / remove vendor

### Collections
- `POST /collections` — Queue a new lead collection job
- `GET /collections` — List historical and active collection jobs
- `GET /collections/:id` — Retrieve collection status, metrics, and progress
- `POST /collections/:id/pause` — Pause running job
- `POST /collections/:id/resume` — Resume paused job
- `POST /collections/:id/cancel` — Terminate collection job

### Custom Columns
- `GET /columns` — List configured custom columns
- `POST /columns` — Add new column definition
- `PATCH /columns/:id` — Update column attributes / visibility
- `DELETE /columns/:id` — Remove custom column (with confirmation)

### Imports & Exports
- `POST /imports` — Upload spreadsheet file for schema detection
- `POST /imports/:id/confirm` — Commit mapped and validated rows to database
- `POST /exports` — Generate XLSX file from current filters or selection
- `GET /exports/:id/download` — Stream exported XLSX
