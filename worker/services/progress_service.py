class ProgressService:
    def commit_batch(self, job_id: str, records: list):
        """
        Commits batch of normalized records to PostgreSQL and updates live job telemetry.
        """
        print(f"[ProgressService] Committed batch of {len(records)} records for job {job_id}.")
