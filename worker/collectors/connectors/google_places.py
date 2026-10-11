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

    # Official Google Maps Platform quotas: Text Search delivers max 20 per page, up to 3 pages (60 max per query)
    MAX_PAGES_PER_QUERY = 3
    MAX_RESULTS_PER_PAGE = 20
    MAX_RESULTS_PER_QUERY = MAX_PAGES_PER_QUERY * MAX_RESULTS_PER_PAGE  # 60

    def __init__(self, api_key: Optional[str] = None):
        self._explicit_key = api_key.strip() if api_key else ""
        self._runtime_status: Optional[str] = None
        self._runtime_message: Optional[str] = None
        self._request_counter = 0

    def get_api_key(self) -> str:
        if self._explicit_key:
            return self._explicit_key
        try:
            from backend.app.config.settings import Settings
            key = Settings.get_google_maps_api_key()
            if key:
                return key
        except Exception:
            pass
        return (os.getenv('GOOGLE_MAPS_API_KEY') or os.getenv('GOOGLE_PLACES_API_KEY') or '').strip()

    def get_source_id(self) -> str:
        return "google_places"

    def get_source_name(self) -> str:
        return "Google Maps / Google Places API"

    def is_configured(self) -> bool:
        key = self.get_api_key()
        return bool(
            key and
            len(key) >= 15 and
            not key.startswith('your_') and
            not key.startswith('AIza_placeholder')
        )

    def _safe_log(self, message: str):
        """Logs informational operational events while redacting API keys."""
        safe_msg = message
        key = self.get_api_key()
        if key and len(key) >= 5:
            safe_msg = safe_msg.replace(key, "[REDACTED_API_KEY]")
        print(f"[GooglePlacesConnector] {safe_msg}")

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()

        if not configured:
            status = "not_configured"
            message = (
                "GOOGLE_MAPS_API_KEY is not configured in the server environment. "
                "Please configure GOOGLE_MAPS_API_KEY in your Render environment variables to activate this connector."
            )
            is_available = False
        elif self._runtime_status in ("quota_exceeded", "error"):
            status = self._runtime_status
            message = self._runtime_message or "Google Places API reported a runtime issue."
            is_available = False
        else:
            status = "active"
            message = "Google Maps Platform Places API is configured and operational."
            is_available = True

        return {
            "id": self.get_source_id(),
            "name": self.get_source_name(),
            "status": status,
            "is_available": is_available,
            "required_keys": ["GOOGLE_MAPS_API_KEY"],
            "per_query_limit": self.MAX_RESULTS_PER_QUERY,
            "rate_limit": f"Max {self.MAX_RESULTS_PER_QUERY} places per query (Google Maps Platform official 3-page quota)",
            "message": message,
        }

    PLACES_NEW_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

    def _fetch_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Fetches detailed fields for a place ID using official field masks.
        Adheres to polite rate limits and never logs the API key.
        """
        key = self.get_api_key()
        if not key or not place_id:
            return {}

        self._request_counter += 1
        try:
            params = {
                "place_id": place_id,
                "fields": "place_id,name,formatted_phone_number,international_phone_number,website,formatted_address,address_components,rating,user_ratings_total,types",
                "key": key
            }
            res = requests.get(self.PLACE_DETAILS_URL, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'OK':
                    return data.get('result', {})
                elif data.get('status') == 'OVER_QUERY_LIMIT':
                    self._runtime_status = "quota_exceeded"
                    self._runtime_message = "Google Places API quota exceeded during details request."
                    self._safe_log("Warning: OVER_QUERY_LIMIT received during Place Details fetch.")
            else:
                self._safe_log(f"Place Details HTTP {res.status_code} for place_id '{place_id}'.")
        except Exception as err:
            self._safe_log(f"Place details network notice: {err}")
        return {}

    def _search_places_new(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Executes search against Google Places API (New) Text Search endpoint.
        Used seamlessly when Places API (New) is enabled on Google Cloud Platform.
        """
        key = self.get_api_key()
        query = f"{category} in {location}"
        yielded_count = 0
        next_page_token = None
        max_pages = min(self.MAX_PAGES_PER_QUERY, (target_count + self.MAX_RESULTS_PER_PAGE - 1) // self.MAX_RESULTS_PER_PAGE)

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,places.rating,"
                "places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,"
                "places.websiteUri,places.types,nextPageToken"
            )
        }

        self._safe_log(f"Executing Places API (New) searchText for query='{query}'...")

        for page_idx in range(max_pages):
            if should_stop and should_stop():
                self._safe_log("Collection interrupted by stop condition.")
                return

            body = {
                "textQuery": query,
                "pageSize": min(20, max(1, target_count - yielded_count))
            }
            if next_page_token:
                body["pageToken"] = next_page_token
                time.sleep(1.5)

            self._request_counter += 1
            try:
                res = requests.post(self.PLACES_NEW_SEARCH_URL, headers=headers, json=body, timeout=15)
            except Exception as err:
                raise RuntimeError(f"Network error contacting Google Places API (New): {err}")

            if res.status_code != 200:
                err_text = res.text
                try:
                    err_json = res.json()
                    err_text = err_json.get('error', {}).get('message', err_text)
                except Exception:
                    pass
                raise RuntimeError(f"Places API (New) responded with HTTP {res.status_code}: {err_text}")

            data = res.json()
            places = data.get('places', [])
            self._safe_log(f"Places API (New) page {page_idx + 1}: Received {len(places)} results.")
            if not places:
                break

            for p in places:
                if should_stop and should_stop():
                    return
                if yielded_count >= target_count:
                    return

                pid = p.get('id', '')
                display_name = (p.get('displayName') or {}).get('text', '').strip()
                address = p.get('formattedAddress', '').strip()
                phone = p.get('nationalPhoneNumber') or p.get('internationalPhoneNumber') or ''
                website = p.get('websiteUri', '')
                rating = float(p.get('rating', 0.0) or 0.0)
                review_count = int(p.get('userRatingCount', 0) or 0)
                city = location.split(',')[0].strip()

                record = {
                    "place_id": pid,
                    "business_name": display_name,
                    "category": category,
                    "phone": phone,
                    "address": address,
                    "city": city,
                    "state": "Andhra Pradesh",
                    "rating": rating,
                    "review_count": review_count,
                    "website": website,
                    "source": self.get_source_name(),
                    "source_url": f"https://www.google.com/maps/place/?q=place_id:{pid}" if pid else "",
                }

                yield record
                yielded_count += 1

            next_page_token = data.get('nextPageToken')
            if not next_page_token:
                break

        self._safe_log(f"Places API (New) search completed. Total records retrieved: {yielded_count}.")

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
        Enforces realistic max quotas (up to 60 per single search query).
        """
        if not self.is_configured():
            self._runtime_status = "not_configured"
            raise RuntimeError(
                "NOT_CONFIGURED: Google Maps Platform Places API is not configured. "
                "Please configure GOOGLE_MAPS_API_KEY in your Render environment variables."
            )

        valid, msg = self.validate_request(category, location, target_count)
        if not valid:
            raise ValueError(f"Invalid request parameters: {msg}")

        key = self.get_api_key()
        query = f"{category} in {location}"
        yielded_count = 0
        next_page_token = None

        # Google Places Text Search provides at most 3 pages (60 places) per query
        max_pages = min(self.MAX_PAGES_PER_QUERY, (target_count + self.MAX_RESULTS_PER_PAGE - 1) // self.MAX_RESULTS_PER_PAGE)
        self._safe_log(
            f"Starting search: query='{query}', requested={target_count}, "
            f"planned_pages={max_pages} (max {self.MAX_RESULTS_PER_QUERY} per Google API query)"
        )

        for page_idx in range(max_pages):
            if should_stop and should_stop():
                self._safe_log("Collection interrupted by stop condition.")
                return

            params = {
                "query": query,
                "key": key
            }
            if next_page_token:
                params["pagetoken"] = next_page_token
                # Google requires ~2.0 seconds delay before pagetoken becomes active
                time.sleep(2.0)

            self._request_counter += 1
            try:
                res = requests.get(self.PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
            except Exception as err:
                self._runtime_status = "error"
                self._runtime_message = f"Network error contacting Google Places API: {err}"
                raise RuntimeError(f"Network error contacting Google Places API: {err}")

            if res.status_code != 200:
                self._runtime_status = "error"
                self._runtime_message = f"Google Places API responded with HTTP {res.status_code}."
                raise RuntimeError(f"Google Places API responded with HTTP {res.status_code}")

            payload = res.json()
            status = payload.get('status')

            if status == 'ZERO_RESULTS':
                self._safe_log(f"Page {page_idx + 1}: ZERO_RESULTS returned for query: '{query}'")
                break
            elif status == 'OVER_QUERY_LIMIT':
                self._runtime_status = "quota_exceeded"
                self._runtime_message = "Google Places API quota exceeded or billing not enabled on Google Cloud Platform."
                self._safe_log("Google Places API error: OVER_QUERY_LIMIT")
                raise RuntimeError("QUOTA_EXCEEDED: Google Places API quota exceeded or billing not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'.")
            elif status == 'REQUEST_DENIED':
                error_msg = payload.get('error_message', 'Request denied by Google Places API. Check API key permissions.')
                self._safe_log(f"Google Places API error: REQUEST_DENIED: {error_msg}")

                # If legacy Places API is disabled or not used, try Places API (New)
                if any(x in error_msg.lower() for x in ('not been used in project', 'is disabled', 'not authorized to use this api')):
                    self._safe_log("Places API Web Service is disabled on project; attempting Places API (New)...")
                    try:
                        for record in self._search_places_new(category, location, target_count, should_stop=should_stop):
                            yield record
                            yielded_count += 1
                        return
                    except Exception as new_err:
                        self._safe_log(f"Places API (New) also failed: {new_err}")

                # Format actionable diagnostic
                actionable = error_msg
                if 'referer restrictions' in error_msg.lower():
                    actionable = (
                        "API key has HTTP referrer restrictions preventing server-side API requests from Render. "
                        "In Google Cloud Console > APIs & Services > Credentials, edit the API key and set Application restrictions to 'None' or 'IP addresses'."
                    )
                elif 'not been used in project' in error_msg.lower() or 'is disabled' in error_msg.lower():
                    actionable = (
                        "Places API is disabled on Google Cloud project 'andhra-soft-tech-lead-finder'. "
                        "Enable 'Places API' or 'Places API (New)' under Google Cloud Console > APIs & Services > Library."
                    )
                elif 'invalid' in error_msg.lower():
                    actionable = "The GOOGLE_MAPS_API_KEY configured on Render is invalid. Verify the key in Google Cloud Console."

                self._runtime_status = "error"
                self._runtime_message = f"Google Places API request denied: {actionable}"
                raise RuntimeError(f"REQUEST_DENIED: {actionable}")

            elif status == 'INVALID_REQUEST':
                # Can occur if pagetoken is accessed too rapidly; retry once with backoff
                if next_page_token:
                    self._safe_log("INVALID_REQUEST on page token; retrying with backoff...")
                    time.sleep(2.5)
                    self._request_counter += 1
                    retry_res = requests.get(self.PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
                    if retry_res.status_code == 200 and retry_res.json().get('status') == 'OK':
                        payload = retry_res.json()
                    else:
                        break
                else:
                    break
            elif status != 'OK':
                self._runtime_status = "error"
                self._runtime_message = f"Google Places API returned status: {status}"
                raise RuntimeError(f"Google Places API returned unexpected status: {status} ({payload.get('error_message', '')})")

            results = payload.get('results', [])
            self._safe_log(f"Page {page_idx + 1}: Received {len(results)} results from Google Places.")
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
                    time.sleep(0.12)  # Polite QPS spacing

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

            next_page_token = payload.get('next_page_token')
            if not next_page_token:
                break

        self._safe_log(f"Search completed. Total records retrieved: {yielded_count}.")
