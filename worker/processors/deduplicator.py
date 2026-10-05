import re
import hashlib

class RecordDeduplicator:
    @staticmethod
    def create_dedupe_key(business_name: str, phone: str = '', city: str = '') -> str:
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', (business_name or '').lower())
        clean_phone = re.sub(r'\D', '', (phone or ''))[-10:]
        clean_city = re.sub(r'[^a-zA-Z0-9]', '', (city or '').lower())

        seed = f"{clean_name}:{clean_phone}:{clean_city}"
        return hashlib.sha256(seed.encode('utf-8')).hexdigest()
