from typing import Generator, Dict, Any
from ..base_collector import BaseCollector

class FutureSourceConnector(BaseCollector):
    """
    Template connector for future permitted official APIs.
    """

    def get_source_name(self) -> str:
        return "Future Permitted Connector Template"

    def search(self, category: str, location: str, target_count: int) -> Generator[Dict[str, Any], None, None]:
        raise NotImplementedError("Connector not yet configured with credentials.")
