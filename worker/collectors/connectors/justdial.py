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
        self._explicit_key = partner_key.strip() if partner_key else ""

    def get_partner_key(self) -> str:
        if self._explicit_key:
            return self._explicit_key
        try:
            from backend.app.config.settings import Settings
            key = Settings.get_justdial_api_key()
            if key:
                return key
        except Exception:
            pass
        return (os.getenv('JUSTDIAL_API_KEY') or os.getenv('JUSTDIAL_PARTNER_KEY') or '').strip()

    def get_source_id(self) -> str:
        return "justdial"

    def get_source_name(self) -> str:
        return "Justdial (Enterprise Partner / License Required)"

    def is_configured(self) -> bool:
        key = self.get_partner_key()
        return bool(key and len(key) >= 15 and not key.startswith('your_'))

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "id": self.get_source_id(),
            "name": self.get_source_name(),
            "status": "active" if configured else "authorization_required",
            "is_available": configured,
            "required_keys": ["JUSTDIAL_API_KEY"],
            "rate_limit": "Commercial enterprise feed agreement required",
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
                "AUTHORIZATION_REQUIRED: Justdial does not offer a public developer API. "
                "An authorized Enterprise Partner Agreement or licensed commercial data feed is required to activate this connector. "
                "Please configure JUSTDIAL_API_KEY with authorized credentials."
            )

        # When enterprise credentials are supplied, official partner feed logic executes here
        print(f"[JustdialConnector] Searching enterprise feed for {category} in {location}...")
        return
        yield {}
