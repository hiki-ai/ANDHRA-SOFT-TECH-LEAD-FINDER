import re
import hashlib

class DuplicateService:
    @staticmethod
    def generate_dedupe_key(business_name: str, phone: str = '', city: str = '') -> str:
        """
        Generates normalized deduplication hash from business name, cleaned phone digits, and city.
        """
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', (business_name or '').lower())
        clean_phone = re.sub(r'\D', '', (phone or ''))[-10:] # last 10 digits
        clean_city = re.sub(r'[^a-zA-Z0-9]', '', (city or '').lower())

        combined = f"{clean_name}:{clean_phone}:{clean_city}"
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()
