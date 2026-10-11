"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
MAGICPIN CONNECTOR (MERCHANT PARTNER API / LICENSED DATASET)
==============================================================================
Location: worker/collectors/connectors/magicpin.py

Magicpin does not offer an open public directory API.
This connector adheres strictly to compliance guidelines:
- Does NOT scrape or bypass technical controls, CAPTCHAs, or anti-bot measures.
- Requires authorized Magicpin Merchant Partner API credentials or licensed dataset.
- Remains marked 'authorization_required' until valid merchant credentials are configured.
==============================================================================
"""

import os
from typing import Generator, Dict, Any, Optional, Callable
from ..base_collector import BaseCollector


class MagicpinConnector(BaseCollector):
    """
    Merchant connector for Magicpin business directory integration.
    Requires official merchant partner licensing.
    """

    def __init__(self, partner_key: Optional[str] = None):
        self._partner_key = (
            partner_key or
            os.getenv('MAGICPIN_API_KEY') or
            os.getenv('MAGICPIN_PARTNER_KEY') or
            ''
        ).strip()

    def get_source_id(self) -> str:
        return "magicpin"

    def get_source_name(self) -> str:
        return "Magicpin (Merchant Partner / License Required)"

    def is_configured(self) -> bool:
        return bool(self._partner_key and len(self._partner_key) > 8 and not self._partner_key.startswith('your_'))

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "id": self.get_source_id(),
            "name": self.get_source_name(),
            "status": "active" if configured else "authorization_required",
            "is_available": configured,
            "required_keys": ["MAGICPIN_API_KEY"],
            "message": (
                "Magicpin Merchant Partner integration is authorized and active."
                if configured
                else "Magicpin does not provide an open public directory API. "
                     "Official Merchant Partner API credentials or licensed dataset integration is required to activate this connector."
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
                "Magicpin connector is disabled: Magicpin does not offer an open public API. "
                "Official Merchant Partner API credentials are required to activate this source. "
                "Please configure MAGICPIN_API_KEY with authorized credentials."
            )

        print(f"[MagicpinConnector] Searching merchant partner feed for {category} in {location}...")
        return
        yield {}
