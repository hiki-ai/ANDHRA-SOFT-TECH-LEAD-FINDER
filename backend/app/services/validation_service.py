import re

class ValidationService:
    @staticmethod
    def calculate_quality_score(record: dict) -> int:
        score = 0
        if record.get('business_name'):
            score += 25
        if record.get('phone') and len(re.sub(r'\D', '', str(record['phone']))) >= 7:
            score += 25
        if record.get('city') and record.get('pincode'):
            score += 20
        if record.get('website') or record.get('email'):
            score += 15
        if record.get('rating') and float(record.get('rating', 0)) > 0:
            score += 15
        return min(score, 100)
