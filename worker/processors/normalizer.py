"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
RECORD NORMALIZER
==============================================================================
Location: worker/processors/normalizer.py
==============================================================================
"""

import re
from typing import Dict, Any


class RecordNormalizer:
    @staticmethod
    def normalize(record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = record.copy()

        # Business Name Normalization
        raw_name = str(record.get('business_name', '')).strip()
        normalized['business_name'] = raw_name
        normalized['normalized_name'] = re.sub(r'[^A-Z0-9\s]', '', raw_name.upper()).strip()

        # Phone digits normalization (Indian phone numbers)
        raw_phone = str(record.get('phone', '')).strip()
        clean_digits = re.sub(r'\D', '', raw_phone)
        if len(clean_digits) == 10:
            normalized['phone'] = f"+91 {clean_digits[:5]} {clean_digits[5:]}"
        elif len(clean_digits) > 10 and clean_digits.startswith('91') and len(clean_digits) == 12:
            normalized['phone'] = f"+91 {clean_digits[2:7]} {clean_digits[7:]}"
        elif len(clean_digits) >= 7:
            normalized['phone'] = raw_phone
        else:
            normalized['phone'] = ''

        # Website formatting
        raw_web = str(record.get('website', '')).strip()
        if raw_web and not raw_web.startswith(('http://', 'https://')):
            normalized['website'] = f"https://{raw_web}"
        else:
            normalized['website'] = raw_web

        # Address & Location
        normalized['city'] = str(record.get('city', '')).strip() or 'Andhra Pradesh'
        normalized['state'] = str(record.get('state', '')).strip() or 'Andhra Pradesh'
        normalized['category'] = str(record.get('category', '')).strip() or 'General'

        return normalized
