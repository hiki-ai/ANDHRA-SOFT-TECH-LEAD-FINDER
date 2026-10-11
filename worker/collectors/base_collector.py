"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
BASE COLLECTOR INTERFACE
==============================================================================
Location: worker/collectors/base_collector.py

Defines the contract for all vendor lead data connectors.
Connectors must only use official, documented, and authorized APIs or feeds.
==============================================================================
"""

from abc import ABC, abstractmethod
from typing import Generator, Dict, Any, Tuple, Optional, Callable


class BaseCollector(ABC):
    """
    Abstract source connector interface.
    All source connectors must implement this contract.
    """

    @abstractmethod
    def get_source_id(self) -> str:
        """Returns the unique programmatic identifier for the source (e.g., 'google_places')."""
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Returns the human-readable canonical display name."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the required credentials and configuration are available."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """
        Returns structured diagnostic status dictionary:
        {
            "id": str,
            "name": str,
            "status": "active" | "not_configured" | "authorization_required",
            "is_available": bool,
            "required_keys": list[str],
            "message": str
        }
        """
        pass

    def validate_request(self, category: str, location: str, target_count: int) -> Tuple[bool, str]:
        """
        Validates collection request parameters.
        Default implementation checks non-empty category, location, and valid target_count.
        """
        if not category or not str(category).strip():
            return False, "Category must not be empty"
        if not location or not str(location).strip():
            return False, "Location must not be empty"
        if not isinstance(target_count, int) or target_count < 1:
            return False, "target_count must be a positive integer"
        if target_count > 50000:
            return False, "target_count cannot exceed 50,000 per single collection job"
        return True, "Valid"

    @abstractmethod
    def search(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Yields raw vendor records from permitted official APIs.
        Must check should_stop() periodically and exit promptly if cancelled/paused.
        Must strictly adhere to rate limits and error handling.
        """
        pass
