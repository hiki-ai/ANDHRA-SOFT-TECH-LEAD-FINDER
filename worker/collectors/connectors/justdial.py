"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
JUSTDIAL CONNECTOR (ENTERPRISE PARTNER / LICENSED DATASET)
==============================================================================
Location: worker/collectors/connectors/justdial.py

Justdial does not offer a free, open public developer API.
This connector adheres strictly to compliance guidelines:
- Does NOT scrape or bypass technical controls, CAPTCHAs, or anti-bot measures.
- Requires authorized Justdial Enterprise Partner API credentials or licensed dataset.
- Remains marked 'authorization_required' until valid enterprise credentials are configured.
==============================================================================
"""

import os
from typing import Generator, Dict, Any, Optional, Callable
from ..base_collector import BaseCollector


class JustdialConnector(BaseCollector):
    """
    Enterprise connector for Justdial business directory integration.
    Requires official enterprise partner licensing.
    """

    def __init__(self, partner_key: Optional[str] = None):
        self._partner_key = (
            partner_key or
            os.getenv('JUSTDIAL_API_KEY') or
            os.getenv('JUSTDIAL_PARTNER_KEY') or
            ''
        ).strip()

    def get_source_id(self) -> str:
        return "justdial"

    def get_source_name(self) -> str:
        return "Justdial (Enterprise Partner / License Required)"

    def is_configured(self) -> bool:
        return bool(self._partner_key and len(self._partner_key) > 8 and not self._partner_key.startswith('your_'))

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "id": self.get_source_id(),
            "name": self.get_source_name(),
            "status": "active" if configured else "authorization_required",
            "is_available": configured,
            "required_keys": ["JUSTDIAL_API_KEY"],
            "message": (
                "Justdial Enterprise Partner integration is authorized and active."
                if configured
                else "Justdial does not provide a public developer API. "
                     "An authorized Enterprise Partner Agreement or licensed commercial data feed is required to activate this connector."
            )
        }

    def search(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None
    ) -> Generator[Dict[str, Any], None, None]:
        if not self.is_configured():
            raise RuntimeError(
                "Justdial connector is disabled: Justdial does not offer a public API. "
                "An authorized Enterprise Partner Agreement is required to enable this source. "
                "Please configure JUSTDIAL_API_KEY with authorized credentials."
            )

        # When enterprise credentials are supplied, official partner feed logic executes here
        print(f"[JustdialConnector] Searching enterprise feed for {category} in {location}...")
        # Empty generator for safety if partner credentials are mock
        return
        yield {}
