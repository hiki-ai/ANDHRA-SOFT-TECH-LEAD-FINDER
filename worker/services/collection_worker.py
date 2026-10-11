"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
COLLECTION WORKER SERVICE
==============================================================================
Location: worker/services/collection_worker.py

Orchestrates complete lead collection lifecycle:
- Validates connector authorization & configuration
- Streams records from official sources
- Normalizes, validates, scores, and deduplicates
- Batches writes to Cloud Firestore
- Maintains accurate job telemetry without simulated progress
==============================================================================
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Set

try:
    from collectors.source_manager import SourceManager
    from processors.normalizer import RecordNormalizer
    from processors.validator import RecordValidator
    from processors.deduplicator import RecordDeduplicator
    from services.progress_service import ProgressService
except (ImportError, ValueError):
    from ..collectors.source_manager import SourceManager
    from ..processors.normalizer import RecordNormalizer
    from ..processors.validator import RecordValidator
    from ..processors.deduplicator import RecordDeduplicator
    from .progress_service import ProgressService


class CollectionWorker:
    def __init__(self, db=None):
        self.source_manager = SourceManager()
        self.progress_service = ProgressService(db=db)

    def process_job(
        self,
        job_id: str,
        category: str,
        location: str,
        target_count: int = 1000,
        source: str = "google_places"
    ):
        """
        Processes a real lead collection job lifecycle:
        pending -> running -> completed / failed / paused / cancelled
        """
        db = self.progress_service.get_db()

        # Helper to check if job was cancelled or paused
        def should_stop() -> bool:
            if db is None:
                return False
            try:
                doc = db.collection('collections').document(job_id).get()
                if doc and doc.to_dict():
                    status = doc.to_dict().get('status')
                    return status in ('paused', 'cancelled')
            except Exception:
                pass
            return False

        # 1. Resolve source connector
        try:
            connector = self.source_manager.get_connector(source)
        except Exception as e:
            self._fail_job(job_id, f"Invalid source connector: {e}")
            return

        # 2. Check source configuration and authorization
        if not connector.is_configured():
            status_info = connector.get_status()
            error_msg = f"{status_info.get('status', 'NOT_CONFIGURED').upper()}: {status_info.get('message', 'Source connector is not configured.')}"
            self._fail_job(job_id, error_msg)
            return

        # 3. Mark job as running
        now_iso = datetime.now(timezone.utc).isoformat()
        self.progress_service.update_job_progress(job_id, {
            "status": "running",
            "started_at": now_iso,
            "source": source,
            "source_name": connector.get_source_name(),
            "current_source": connector.get_source_name(),
            "updated_at": now_iso,
        })

        # 4. Fetch existing dedupe keys to prevent duplicate insertions
        existing_keys: Set[str] = set()
        if db is not None:
            try:
                for doc in db.collection('vendors').stream():
                    d = doc.to_dict() or {}
                    k = d.get('dedupe_key')
                    if k:
                        existing_keys.add(k)
            except Exception as e:
                print(f"[CollectionWorker] Dedupe preload notice: {e}")

        # 5. Stream and process records
        batch = []
        found_count = 0
        valid_count = 0
        duplicate_count = 0
        failed_count = 0

        try:
            for raw_record in connector.search(category, location, target_count, should_stop=should_stop):
                if should_stop():
                    print(f"[CollectionWorker] Job {job_id} halted due to pause/cancellation.")
                    return

                found_count += 1
                normalized = RecordNormalizer.normalize(raw_record)
                is_valid, reason = RecordValidator.validate(normalized)

                b_name = normalized.get('business_name', '')
                phone = normalized.get('phone', '')
                city = normalized.get('city', '')

                dedupe_key = RecordDeduplicator.create_dedupe_key(b_name, phone, city)
                quality_score = RecordValidator.calculate_quality_score(normalized)

                if dedupe_key in existing_keys:
                    duplicate_count += 1
                    status = 'duplicate'
                elif not is_valid:
                    failed_count += 1
                    status = 'invalid'
                else:
                    valid_count += 1
                    status = 'valid'
                    existing_keys.add(dedupe_key)

                doc_id = f"ven_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
                vendor_doc = {
                    "id": doc_id,
                    "business_name": b_name,
                    "normalized_name": normalized.get('normalized_name', b_name.upper()),
                    "category": normalized.get('category', category),
                    "phone": phone,
                    "address": normalized.get('address', ''),
                    "city": city,
                    "state": normalized.get('state', 'Andhra Pradesh'),
                    "website": normalized.get('website', ''),
                    "rating": float(normalized.get('rating', 0.0) or 0.0),
                    "review_count": int(normalized.get('review_count', 0) or 0),
                    "source": connector.get_source_name(),
                    "source_url": normalized.get('source_url', ''),
                    "status": status,
                    "data_quality_score": quality_score,
                    "dedupe_key": dedupe_key,
                    "collection_id": job_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }

                batch.append(vendor_doc)

                # Batch commit every 50 records or target reached
                if len(batch) >= 50 or found_count >= target_count:
                    self.progress_service.commit_batch(job_id, batch)
                    batch = []
                    progress_pct = min(100, int((found_count / target_count) * 100)) if target_count > 0 else 0
                    now_update_iso = datetime.now(timezone.utc).isoformat()
                    self.progress_service.update_job_progress(job_id, {
                        "found": found_count,
                        "found_count": found_count,
                        "valid": valid_count,
                        "valid_count": valid_count,
                        "duplicate": duplicate_count,
                        "duplicate_count": duplicate_count,
                        "failed": failed_count,
                        "failed_count": failed_count,
                        "progress": progress_pct,
                        "updated_at": now_update_iso,
                    })

                if found_count >= target_count:
                    break

            # Commit remaining batch
            if batch:
                self.progress_service.commit_batch(job_id, batch)

            # Check final job state
            if should_stop():
                return

            completed_iso = datetime.now(timezone.utc).isoformat()
            progress_pct = min(100, int((found_count / target_count) * 100)) if target_count > 0 else 100
            self.progress_service.update_job_progress(job_id, {
                "status": "completed",
                "found": found_count,
                "found_count": found_count,
                "valid": valid_count,
                "valid_count": valid_count,
                "duplicate": duplicate_count,
                "duplicate_count": duplicate_count,
                "failed": failed_count,
                "failed_count": failed_count,
                "progress": progress_pct,
                "completed_at": completed_iso,
                "updated_at": completed_iso,
            })
            print(f"[CollectionWorker] Job {job_id} completed: {found_count} found, {valid_count} valid, {duplicate_count} duplicate.")

        except Exception as e:
            self._fail_job(job_id, str(e))

    def _fail_job(self, job_id: str, error_message: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        self.progress_service.update_job_progress(job_id, {
            "status": "failed",
            "error_message": error_message,
            "completed_at": now_iso,
            "updated_at": now_iso,
        })
        print(f"[CollectionWorker] Job {job_id} marked as failed: {error_message}")
