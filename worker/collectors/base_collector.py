from abc import ABC, abstractmethod
from typing import Generator, Dict, Any

class BaseCollector(ABC):
    """
    Abstract source connector interface.
    All permitted source connectors must implement this contract.
    """

    @abstractmethod
    def search(self, category: str, location: str, target_count: int) -> Generator[Dict[str, Any], None, None]:
        """
        Yields raw records from permitted source adhering strictly to rate-limits and backoff.
        """
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Returns the canonical name of the permitted source connector."""
        pass
