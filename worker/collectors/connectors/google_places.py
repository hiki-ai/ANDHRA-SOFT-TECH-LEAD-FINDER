"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
GOOGLE PLACES API CONNECTOR (OFFICIAL GOOGLE MAPS PLATFORM)
==============================================================================
Location: worker/collectors/connectors/google_places.py

Integrates with the official Google Maps Platform Places API.
Reads server-side credentials only (never exposed to React client).
Adheres strictly to Google Terms of Service, rate limits, and pagination quotas.
==============================================================================
"""

import os
import time
import requests
from typing import Generator, Dict, Any, Optional, Callable
from ..base_collector import BaseCollector


class GooglePlacesConnector(BaseCollector):
    """
    Official Google Places API Connector for Google Maps Platform.
    Utilizes Places Text Search and Details APIs with official pagination.
    """

    PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = (
            api_key or
            os.getenv('GOOGLE_MAPS_API_KEY') or
            os.getenv('GOOGLE_PLACES_API_KEY') or
            ''
        ).strip()

    def get_source_id(self) -> str:
        return "google_places"

    def get_source_name(self) -> str:
        return "Google Maps / Google Places API"

    def is_configured(self) -> bool:
        return bool(self._api_key and len(self._api_key) > 10 and not self._api_key.startswith('your_'))

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "id": self.get_source_id(),
            "name": self.get_source_name(),
            "status": "active" if configured else "not_configured",
            "is_available": configured,
            "required_keys": ["GOOGLE_MAPS_API_KEY"],
            "message": (
                "Google Maps Platform Places API is configured and operational."
                if configured
                else "GOOGLE_MAPS_API_KEY is not configured in the server environment. "
                     "Please set GOOGLE_MAPS_API_KEY in your Render environment variables to activate this connector."
            )
        }

    def _fetch_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Fetches detailed fields (phone number, website, formatted address) for a verified Place ID.
        """
        if not self._api_key or not place_id:
            return {}
        try:
            params = {
                "place_id": place_id,
                "fields": "formatted_phone_number,international_phone_number,website,formatted_address,address_components",
                "key": self._api_key
            }
            res = requests.get(self.PLACE_DETAILS_URL, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'OK':
                    return data.get('result', {})
        except Exception as err:
            print(f"[GooglePlacesConnector] Place details fetch notice: {err}")
        return {}

    def search(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Executes verified search against Google Places API.
        Respects Google's 20-results-per-page limit and page token activation delay.
        """
        if not self.is_configured():
            raise RuntimeError(
                "Google Maps Platform Places API is not configured. "
                "Please configure GOOGLE_MAPS_API_KEY on the server."
            )

        valid, msg = self.validate_request(category, location, target_count)
        if not valid:
            raise ValueError(f"Invalid request parameters: {msg}")

        query = f"{category} in {location}"
        yielded_count = 0
        next_page_token = None
        max_pages = min(3, (target_count + 19) // 20)  # Google Places Text Search supports up to 3 pages (60 places) per query

        for page in range(max_pages):
            if should_stop and should_stop():
                print("[GooglePlacesConnector] Collection interrupted by stop condition.")
                return

            params = {
                "query": query,
                "key": self._api_key
            }
            if next_page_token:
                params["pagetoken"] = next_page_token
                # Google requires ~2 seconds delay before pagetoken becomes active
                time.sleep(2.0)

            try:
                res = requests.get(self.PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
            except Exception as err:
                raise RuntimeError(f"Network error contacting Google Places API: {err}")

            if res.status_code != 200:
                raise RuntimeError(f"Google Places API responded with HTTP {res.status_code}: {res.text}")

            payload = res.json()
            status = payload.get('status')

            if status == 'ZERO_RESULTS':
                print(f"[GooglePlacesConnector] No results returned for query: '{query}'")
                break
            elif status == 'OVER_QUERY_LIMIT':
                raise RuntimeError("Google Places API quota exceeded or billing not enabled for this project.")
            elif status == 'REQUEST_DENIED':
                error_msg = payload.get('error_message', 'Request denied by Google Places API. Check API key permissions.')
                raise RuntimeError(f"Google Places API authorization failure: {error_msg}")
            elif status == 'INVALID_REQUEST':
                # Can occur if pagetoken is accessed too rapidly; retry once with backoff
                if next_page_token:
                    time.sleep(2.5)
                    retry_res = requests.get(self.PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
                    if retry_res.status_code == 200 and retry_res.json().get('status') == 'OK':
                        payload = retry_res.json()
                    else:
                        break
                else:
                    break
            elif status != 'OK':
                raise RuntimeError(f"Google Places API returned unexpected status: {status} ({payload.get('error_message', '')})")

            results = payload.get('results', [])
            if not results:
                break

            for place in results:
                if should_stop and should_stop():
                    return
                if yielded_count >= target_count:
                    return

                place_id = place.get('place_id', '')
                business_name = place.get('name', '').strip()
                address = place.get('formatted_address', '').strip()
                rating = float(place.get('rating', 0.0) or 0.0)
                review_count = int(place.get('user_ratings_total', 0) or 0)

                # Fetch extra details (phone, website)
                phone = ''
                website = ''
                if place_id:
                    details = self._fetch_place_details(place_id)
                    phone = details.get('formatted_phone_number') or details.get('international_phone_number') or ''
                    website = details.get('website', '')

                # City heuristics from location or address
                city = location.split(',')[0].strip()

                record = {
                    "place_id": place_id,
                    "business_name": business_name,
                    "category": category,
                    "phone": phone,
                    "address": address,
                    "city": city,
                    "state": "Andhra Pradesh",
                    "rating": rating,
                    "review_count": review_count,
                    "website": website,
                    "source": self.get_source_name(),
                    "source_url": f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else "",
                }

                yield record
                yielded_count += 1
                time.sleep(0.1)  # Respect polite request rate

            next_page_token = payload.get('next_page_token')
            if not next_page_token:
                break
