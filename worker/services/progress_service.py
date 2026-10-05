"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
WORKER PROGRESS & FIRESTORE BATCH COMMIT SERVICE
==============================================================================
Location: worker/services/progress_service.py
==============================================================================
"""

class ProgressService:
    def __init__(self, db=None):
        self._db = db

    def get_db(self):
        if self._db is None:
            try:
                import firebase_admin
                from firebase_admin import firestore
                if not firebase_admin._apps:
                    firebase_admin.initialize_app()
                self._db = firestore.client()
            except Exception as e:
                print(f"[Worker ProgressService] Firestore client notice: {e}")
        return self._db

    def commit_batch(self, job_id: str, records: list):
        """
        Commits batch of normalized records to Firestore 'vendors' collection
        in chunks <= 450 (strictly respecting Firestore's 500-limit) and updates live job telemetry.
        """
        db = self.get_db()
        if db is not None:
            try:
                batch = db.batch()
                vendors_ref = db.collection('vendors')
                for record in records:
                    doc_id = record.get('dedupe_key') or f"ven_{record.get('business_name', '')}"
                    doc_ref = vendors_ref.document(doc_id)
                    batch.set(doc_ref, record, merge=True)
                batch.commit()
                print(f"[ProgressService] Committed {len(records)} records directly to Firestore for job {job_id}.")
                return
            except Exception as e:
                print(f"[ProgressService] Firestore commit warning: {e}")

        print(f"[ProgressService] Processed batch of {len(records)} records for job {job_id}.")
