import re

class RecordNormalizer:
    @staticmethod
    def normalize(record: dict) -> dict:
        normalized = record.copy()
        raw_name = record.get('business_name', '')
        normalized['normalized_name'] = re.sub(r'[^A-Z0-9\s]', '', raw_name.upper()).strip()

        # Phone digits normalization
        raw_phone = record.get('phone', '')
        clean_digits = re.sub(r'\D', '', str(raw_phone))
        if len(clean_digits) == 10:
            normalized['phone'] = f"+91 {clean_digits[:5]} {clean_digits[5:]}"
        elif len(clean_digits) > 10 and clean_digits.startswith('91'):
            normalized['phone'] = f"+{clean_digits[:2]} {clean_digits[2:7]} {clean_digits[7:]}"

        return normalized
