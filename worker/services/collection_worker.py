import time
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
    def __init__(self):
        self.source_manager = SourceManager()
        self.progress_service = ProgressService()

    def process_job(self, job_id: str, category: str, location: str, target_count: int):
        connector = self.source_manager.get_connector('source_a')
        batch = []

        for raw_record in connector.search(category, location, target_count):
            normalized = RecordNormalizer.normalize(raw_record)
            is_valid, reason = RecordValidator.validate(normalized)
            dedupe_key = RecordDeduplicator.create_dedupe_key(
                normalized['business_name'],
                normalized.get('phone', ''),
                normalized.get('city', '')
            )
            normalized['dedupe_key'] = dedupe_key
            normalized['status'] = 'valid' if is_valid else 'invalid'

            batch.append(normalized)
            if len(batch) >= 450:
                self.progress_service.commit_batch(job_id, batch)
                batch = []

        if batch:
            self.progress_service.commit_batch(job_id, batch)
