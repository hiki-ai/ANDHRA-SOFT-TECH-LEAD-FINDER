"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
SOURCE CONNECTOR MANAGER
==============================================================================
Location: worker/collectors/source_manager.py

Registry and router for permitted business lead data connectors.
==============================================================================
"""

from typing import Dict, List, Any
from .base_collector import BaseCollector
from .connectors.google_places import GooglePlacesConnector
from .connectors.justdial import JustdialConnector
from .connectors.magicpin import MagicpinConnector


class SourceManager:
    """
    Central manager for permitted lead collection sources.
    Tracks availability, configuration status, and connector instances.
    """

    def __init__(self):
        self.connectors: Dict[str, BaseCollector] = {
            "google_places": GooglePlacesConnector(),
            "justdial": JustdialConnector(),
            "magicpin": MagicpinConnector(),
        }

    def get_connector(self, source_id: str) -> BaseCollector:
        """
        Retrieves connector by its identifier.
        """
        clean_id = (source_id or '').strip().lower()
        if clean_id not in self.connectors:
            # Fall back to google_places as primary default if valid
            if "google_places" in self.connectors:
                return self.connectors["google_places"]
            raise ValueError(f"Unknown source connector '{source_id}'")
        return self.connectors[clean_id]

    def list_sources(self) -> List[Dict[str, Any]]:
        """
        Returns diagnostic status for all registered source connectors.
        """
        return [connector.get_status() for connector in self.connectors.values()]

    def is_source_available(self, source_id: str) -> bool:
        """
        Returns True only if the requested source is configured and active.
        """
        try:
            connector = self.get_connector(source_id)
            return connector.is_configured()
        except Exception:
            return False
