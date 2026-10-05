# Database Specification (Supabase PostgreSQL)

## Schema Overview
- `users`: Administrative user profiles and roles.
- `vendors`: Core lead records (scaled for 500,000+ entries).
- `custom_columns`: Dynamic metadata fields defined by administrators.
- `vendor_custom_values`: Key-value JSONB storage for custom fields per vendor.
- `collections`: Batch extraction collection jobs and progress telemetry.
- `collection_vendors`: Many-to-many relationship linking collections with extracted vendors.
- `sources`: Registered permitted connectors and rate limit definitions.
- `import_jobs`: Audit of Excel/CSV uploads and column mapping logs.
- `export_jobs`: Export history and temporary file references.

## Key Performance Indexes
- `CREATE INDEX idx_vendors_category ON vendors (category_id);`
- `CREATE INDEX idx_vendors_location ON vendors (city, state);`
- `CREATE INDEX idx_vendors_phone ON vendors (phone);`
- `CREATE INDEX idx_vendors_dedupe ON vendors (dedupe_key);`
- `CREATE INDEX idx_vendors_status ON vendors (status);`
