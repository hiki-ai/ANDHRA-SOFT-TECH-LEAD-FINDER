import re

class RecordValidator:
    @staticmethod
    def validate(record: dict) -> tuple[bool, str]:
        if not record.get('business_name'):
            return False, "Business name is missing"

        phone = record.get('phone', '')
        digits = re.sub(r'\D', '', str(phone))
        if len(digits) < 7:
            return False, "Invalid or missing telephone number"

        return True, "Valid"
