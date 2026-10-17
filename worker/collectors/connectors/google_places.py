"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
GOOGLE PLACES API CONNECTOR (OFFICIAL GOOGLE MAPS PLATFORM)
==============================================================================
Location: worker/collectors/connectors/google_places.py

Integrates with the official Google Maps Platform Places API (New).
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
    Utilizes Places API (New) Text Search with official field masks and pagination.
    """

    # Official Google Places API (New) endpoints
    PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
    PLACES_NEW_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
    PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
    PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places"

    # Field mask requesting only the vendor attributes needed
    DEFAULT_FIELD_MASK = (
        "places.id,places.displayName,places.formattedAddress,places.rating,"
        "places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,"
        "places.websiteUri,places.types,nextPageToken"
    )

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
            from app.config.settings import Settings
            key = Settings.get_google_maps_api_key()
            if key:
                return key
        except Exception:
            pass
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
            message = "Google Maps Platform Places API (New) is configured and operational."
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

    def _fetch_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Fetches detailed fields for a place ID using Places API (New) Place Details.
        Adheres to polite rate limits and never logs the API key.
        """
        key = self.get_api_key()
        if not key or not place_id:
            return {}

        self._request_counter += 1
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": (
                "id,displayName,formattedAddress,rating,userRatingCount,"
                "nationalPhoneNumber,internationalPhoneNumber,websiteUri,types"
            )
        }
        url = f"{self.PLACE_DETAILS_URL.rstrip('/')}/{place_id}"
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if 'result' in data:
                    res_data = data.get('result', {})
                    return {
                        "formatted_phone_number": res_data.get('formatted_phone_number'),
                        "international_phone_number": res_data.get('international_phone_number'),
                        "website": res_data.get('website'),
                        "formatted_address": res_data.get('formatted_address'),
                        "name": res_data.get('name'),
                        "rating": res_data.get('rating'),
                        "user_ratings_total": res_data.get('user_ratings_total'),
                    }
                return {
                    "formatted_phone_number": data.get('nationalPhoneNumber') or data.get('internationalPhoneNumber'),
                    "international_phone_number": data.get('internationalPhoneNumber'),
                    "website": data.get('websiteUri'),
                    "formatted_address": data.get('formattedAddress'),
                    "name": (data.get('displayName') or {}).get('text') if isinstance(data.get('displayName'), dict) else data.get('displayName'),
                    "rating": data.get('rating'),
                    "user_ratings_total": data.get('userRatingCount'),
                }
            elif res.status_code == 429:
                self._runtime_status = "quota_exceeded"
                self._runtime_message = "Google Places API quota exceeded during details request."
                self._safe_log("Warning: Quota exceeded received during Place Details fetch.")
            else:
                self._safe_log(f"Place Details HTTP {res.status_code} for place_id '{place_id}'.")
        except Exception as err:
            self._safe_log(f"Place details network notice: {err}")
        return {}

    def build_field_mask(self, selected_columns: Optional[list] = None) -> str:
        """Dynamically computes official Google Places (New) field mask based on selected columns."""
        if not selected_columns or not isinstance(selected_columns, list):
            return self.DEFAULT_FIELD_MASK

        selected_keys = set()
        for col in selected_columns:
            if isinstance(col, dict) and col.get('is_enabled', True):
                k = col.get('key') or col.get('name')
                if k:
                    selected_keys.add(k)
            elif isinstance(col, str):
                selected_keys.add(col)

        # Essential internal fields needed for pagination, business identification & typing
        mask_parts = ["places.id", "places.displayName", "places.types", "nextPageToken"]

        if any(k in selected_keys for k in ('address', 'city', 'state', 'pincode', 'area', 'district')):
            mask_parts.append("places.formattedAddress")
        if any(k in selected_keys for k in ('phone', 'alternate_phone')):
            mask_parts.append("places.nationalPhoneNumber")
            mask_parts.append("places.internationalPhoneNumber")
        if 'website' in selected_keys:
            mask_parts.append("places.websiteUri")
        if 'rating' in selected_keys:
            mask_parts.append("places.rating")
        if 'review_count' in selected_keys:
            mask_parts.append("places.userRatingCount")

        return ",".join(mask_parts)

    def search(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None,
        selected_columns: Optional[list] = None,
        **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Executes verified search against Google Places API (New) Text Search endpoint:
        POST https://places.googleapis.com/v1/places:searchText
        Respects Google's 20-results-per-page limit and pagination tokens.
        Enforces max quotas (up to 60 per single search query).
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

        # Google Places API Text Search delivers max 20 per page, up to 3 pages (60 max per query)
        max_pages = min(self.MAX_PAGES_PER_QUERY, (target_count + self.MAX_RESULTS_PER_PAGE - 1) // self.MAX_RESULTS_PER_PAGE)
        self._safe_log(
            f"Starting search: query='{query}', requested={target_count}, "
            f"planned_pages={max_pages} (max {self.MAX_RESULTS_PER_QUERY} per Google API query)"
        )

        field_mask = self.build_field_mask(selected_columns)
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": field_mask
        }

        for page_idx in range(max_pages):
            if should_stop and should_stop():
                self._safe_log("Collection interrupted by stop condition.")
                return

            page_size = min(self.MAX_RESULTS_PER_PAGE, max(1, target_count - yielded_count))
            body: Dict[str, Any] = {
                "textQuery": query,
                "pageSize": page_size
            }
            if next_page_token:
                body["pageToken"] = next_page_token
                time.sleep(1.0)

            self._request_counter += 1
            try:
                res = requests.post(self.PLACES_SEARCH_URL, headers=headers, json=body, timeout=15)
            except Exception as err:
                self._runtime_status = "error"
                self._runtime_message = f"Network error contacting Google Places API (New): {err}"
                raise RuntimeError(f"Network error contacting Google Places API (New): {err}")

            if res.status_code != 200:
                err_text = res.text
                err_status = None
                try:
                    err_json = res.json()
                    err_obj = err_json.get('error', {})
                    if isinstance(err_obj, dict):
                        err_text = err_obj.get('message', err_text)
                        err_status = err_obj.get('status')
                    elif 'message' in err_json:
                        err_text = err_json.get('message')
                except Exception:
                    pass

                err_lower = (err_text or '').lower()

                # Quota exceeded / resource exhausted
                if res.status_code == 429 or err_status == 'RESOURCE_EXHAUSTED' or 'quota' in err_lower or 'rate limit' in err_lower:
                    self._runtime_status = "quota_exceeded"
                    self._runtime_message = "Google Places API (New) quota exceeded or billing not enabled on Google Cloud Platform."
                    self._safe_log("Google Places API error: QUOTA_EXCEEDED")
                    raise RuntimeError("QUOTA_EXCEEDED: Google Places API quota exceeded or billing not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'.")

                # Permission denied / request denied / disabled / legacy API
                if res.status_code == 403 or err_status == 'PERMISSION_DENIED' or 'denied' in err_lower or 'forbidden' in err_lower:
                    if 'referer restrictions' in err_lower or 'referrer' in err_lower:
                        actionable = (
                            "API key has HTTP referrer restrictions preventing server-side API requests from Render. "
                            "In Google Cloud Console > APIs & Services > Credentials, edit the API key and set Application restrictions to 'None' or 'IP addresses'."
                        )
                    elif 'billing' in err_lower:
                        actionable = (
                            "Billing is not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'. "
                            "Google Places API (New) requires an active billing account linked to the project in Google Cloud Console."
                        )
                    elif any(x in err_lower for x in ('not been used in project', 'is disabled', 'not authorized', 'legacy api')):
                        actionable = (
                            "Places API (New) is not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'. "
                            "Enable 'Places API (New)' under Google Cloud Console > APIs & Services > Library."
                        )
                    elif 'invalid' in err_lower or 'expired' in err_lower:
                        actionable = "The GOOGLE_MAPS_API_KEY configured on Render is invalid. Verify the key in Google Cloud Console."
                    else:
                        actionable = err_text or "Request denied by Google Places API."

                    self._runtime_status = "error"
                    self._runtime_message = f"Google Places API request denied: {actionable}"
                    self._safe_log(f"Google Places API error: REQUEST_DENIED: {actionable}")
                    raise RuntimeError(f"REQUEST_DENIED: {actionable}")

                # Invalid argument / bad request
                if res.status_code == 400 or err_status == 'INVALID_ARGUMENT':
                    self._runtime_status = "error"
                    self._runtime_message = f"Invalid request to Google Places API (New): {err_text}"
                    raise RuntimeError(f"INVALID_REQUEST: {err_text}")

                self._runtime_status = "error"
                self._runtime_message = f"Google Places API (New) responded with HTTP {res.status_code}: {err_text}"
                raise RuntimeError(f"Google Places API responded with HTTP {res.status_code}: {err_text}")

            payload = res.json()

            # Handle payload status field if present (legacy error status translation)
            status = payload.get('status')
            if status == 'OVER_QUERY_LIMIT':
                self._runtime_status = "quota_exceeded"
                self._runtime_message = "Google Places API quota exceeded or billing not enabled on Google Cloud Platform."
                self._safe_log("Google Places API error: OVER_QUERY_LIMIT")
                raise RuntimeError("QUOTA_EXCEEDED: Google Places API quota exceeded or billing not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'.")
            elif status == 'REQUEST_DENIED':
                error_msg = payload.get('error_message', 'Request denied by Google Places API. Check API key permissions.')
                self._safe_log(f"Google Places API error: REQUEST_DENIED: {error_msg}")
                msg_lower = error_msg.lower()
                if 'referer restrictions' in msg_lower or 'referrer' in msg_lower:
                    actionable = (
                        "API key has HTTP referrer restrictions preventing server-side API requests from Render. "
                        "In Google Cloud Console > APIs & Services > Credentials, edit the API key and set Application restrictions to 'None' or 'IP addresses'."
                    )
                elif 'billing' in msg_lower:
                    actionable = "Billing is not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'. Google Places API (New) requires an active billing account linked to the project in Google Cloud Console."
                elif any(x in msg_lower for x in ('not been used in project', 'is disabled', 'not authorized', 'legacy api')):
                    actionable = "Places API (New) is not enabled on Google Cloud project 'andhra-soft-tech-lead-finder'. Enable 'Places API (New)' under Google Cloud Console > APIs & Services > Library."
                elif 'invalid' in msg_lower or 'expired' in msg_lower:
                    actionable = "The GOOGLE_MAPS_API_KEY configured on Render is invalid. Verify the key in Google Cloud Console."
                else:
                    actionable = error_msg

                self._runtime_status = "error"
                self._runtime_message = f"Google Places API request denied: {actionable}"
                raise RuntimeError(f"REQUEST_DENIED: {actionable}")
            elif status == 'ZERO_RESULTS':
                self._safe_log(f"Page {page_idx + 1}: ZERO_RESULTS returned for query: '{query}'")
                break

            # Places API (New) places list; fallback to results if legacy mock provided
            places = payload.get('places', [])
            if not places and 'results' in payload:
                places = payload.get('results', [])

            self._safe_log(f"Page {page_idx + 1}: Received {len(places)} results from Google Places.")
            if not places:
                break

            for place in places:
                if should_stop and should_stop():
                    self._safe_log("Collection interrupted by stop condition.")
                    return
                if yielded_count >= target_count:
                    return

                # Support both Places API (New) structure and legacy structure
                place_id = place.get('id', '') or place.get('place_id', '')

                raw_name = place.get('displayName')
                if isinstance(raw_name, dict):
                    business_name = (raw_name.get('text') or '').strip()
                elif raw_name:
                    business_name = str(raw_name).strip()
                else:
                    business_name = (place.get('name') or '').strip()

                address = (place.get('formattedAddress') or place.get('formatted_address') or '').strip()
                phone = (
                    place.get('nationalPhoneNumber') or
                    place.get('internationalPhoneNumber') or
                    place.get('formatted_phone_number') or
                    ''
                )
                website = place.get('websiteUri') or place.get('website') or ''
                rating = float(place.get('rating', 0.0) or 0.0)
                review_count = int(place.get('userRatingCount') or place.get('user_ratings_total') or 0)

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

            next_page_token = payload.get('nextPageToken') or payload.get('next_page_token')
            if not next_page_token:
                break

        self._safe_log(f"Search completed. Total records retrieved: {yielded_count}.")

    def _search_places_new(
        self,
        category: str,
        location: str,
        target_count: int,
        should_stop: Optional[Callable[[], bool]] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """Alias for search() which natively uses Places API (New)."""
        return self.search(category, location, target_count, should_stop=should_stop)
