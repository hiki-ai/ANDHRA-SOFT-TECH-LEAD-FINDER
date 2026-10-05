# Extraction & Worker Architecture

## Principles
1. **Permitted Sources Only**: Strict adherence to official APIs, licensed commercial feeds, and open public directories.
2. **Zero Bot Bypass**: No CAPTCHA solvers, IP spoofing, or session cracking.
3. **Throttling & Backoff**: Exponential backoff upon encountering HTTP 429 status codes.
4. **Decoupled Execution**: Long-running extractions run in Python background workers outside Flask request threads.

## Normalization & Deduplication Pipeline
- Strip special characters, trim whitespace, uppercase comparison strings.
- Normalize phone numbers to E.164 standard.
- Hash normalized business name + cleaned phone + city to generate unique `dedupe_key`.
