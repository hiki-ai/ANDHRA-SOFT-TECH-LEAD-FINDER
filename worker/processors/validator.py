"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
RECORD VALIDATOR & QUALITY SCORER
==============================================================================
Location: worker/processors/validator.py
==============================================================================
"""

import re
from typing import Dict, Any, Tuple


class RecordValidator:
    @staticmethod
    def validate(record: Dict[str, Any]) -> Tuple[bool, str]:
        name = str(record.get('business_name', '')).strip()
        if not name:
            return False, "Business name is required"

        # Check for placeholder or corrupted names
        if len(name) < 2:
            return False, "Business name is too short"

        return True, "Valid"

    @staticmethod
    def calculate_quality_score(record: Dict[str, Any]) -> int:
        score = 0
        if record.get('business_name'):
            score += 25
        phone = str(record.get('phone', ''))
        if phone and len(re.sub(r'\D', '', phone)) >= 7:
            score += 25
        if record.get('city') and (record.get('address') or record.get('pincode')):
            score += 20
        if record.get('website') or record.get('email'):
            score += 15
        if record.get('rating') and float(record.get('rating', 0)) > 0:
            score += 15
        return min(score, 100)
