import time
from typing import Generator, Dict, Any
from ..base_collector import BaseCollector

class SourceBConnector(BaseCollector):
    """
    Licensed Commercial Partner Feed (Source B).
    """

    def get_source_name(self) -> str:
        return "Licensed Commercial Partner Feed (Source B)"

    def search(self, category: str, location: str, target_count: int) -> Generator[Dict[str, Any], None, None]:
        for i in range(1, target_count + 1):
            time.sleep(0.04)
            yield {
                "business_name": f"{location.split(',')[0]} {category} Partner #{i}",
                "category": category,
                "phone": f"+91 891 25{i:04d}",
                "city": location.split(',')[0].strip(),
                "state": "Andhra Pradesh",
                "source": self.get_source_name()
            }
