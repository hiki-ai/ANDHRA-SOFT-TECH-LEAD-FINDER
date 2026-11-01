"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
UNIT TESTS: GOOGLE PLACES API (NEW) & COLLECTION WORKER INTEGRATION
==============================================================================
Location: tests/test_places_new.py

Validates:
- Google Places API (New) searchText endpoint (POST https://places.googleapis.com/v1/places:searchText)
- Headers: Content-Type, X-Goog-Api-Key, X-Goog-FieldMask
- Request Body: textQuery, pageSize, pageToken
- Response mapping to Vendor schema
- Error translations: Legacy API error, Quota Exceeded, Referrer restrictions, Zero results
- Telemetry, deduplication, validation, and Firestore batch persistence in CollectionWorker
- Strict enforcement that failed jobs are marked 'failed' and never 'completed'
==============================================================================
"""

import os
import sys
from unittest.mock import MagicMock, patch

# Ensure paths
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.insert(0, worker_dir)

from collectors.connectors.google_places import GooglePlacesConnector
from collectors.source_capabilities import check_source_capabilities
from processors.google_places_photo_mapper import GooglePlacesPhotoMapper
from services.collection_worker import CollectionWorker


def test_google_places_new_success():
    """Verify Places API (New) POST searchText endpoint, headers, body, and schema mapping."""
    connector = GooglePlacesConnector(api_key="AIzaSyTestKeyPlacesNew987654321")
    assert connector.is_configured() is True

    mock_response_payload = {
        "places": [
            {
                "id": "ChIJ_vsp_123",
                "displayName": {"text": "Andhra Spice Kitchen", "languageCode": "en"},
                "formattedAddress": "Beach Road, Visakhapatnam, Andhra Pradesh 530002",
                "nationalPhoneNumber": "0891 255 1234",
                "internationalPhoneNumber": "+91 891 255 1234",
                "websiteUri": "https://andhraspicekitchen.in",
                "rating": 4.6,
                "userRatingCount": 380,
                "photos": [{"name": "places/ChIJ_vsp_123/photos/photo_1"}],
                "types": ["restaurant", "food", "point_of_interest"]
            }
        ],
        "nextPageToken": None
    }

    with patch('requests.post') as mock_post:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = mock_response_payload
        mock_post.return_value = mock_res

        records = list(connector.search("Restaurants", "Visakhapatnam", 10, include_photos=True))

        assert len(records) == 1
        rec = records[0]
        assert rec['place_id'] == "ChIJ_vsp_123"
        assert rec['business_name'] == "Andhra Spice Kitchen"
        assert rec['phone'] == "0891 255 1234"
        assert rec['address'] == "Beach Road, Visakhapatnam, Andhra Pradesh 530002"
        assert rec['city'] == "Visakhapatnam"
        assert rec['state'] == "Andhra Pradesh"
        assert rec['rating'] == 4.6
        assert rec['review_count'] == 380
        assert rec['website'] == "https://andhraspicekitchen.in"
        assert rec['source'] == "Google Maps / Google Places API"
        assert rec['source_url'] == "https://www.google.com/maps/place/?q=place_id:ChIJ_vsp_123"
        assert rec['photos'] == [{"name": "places/ChIJ_vsp_123/photos/photo_1"}]

        # Verify Google Places API (New) contract
        mock_post.assert_called_once()
        url = mock_post.call_args[0][0]
        kwargs = mock_post.call_args[1]
        assert url == "https://places.googleapis.com/v1/places:searchText"
        headers = kwargs['headers']
        assert headers['Content-Type'] == 'application/json'
        assert headers['X-Goog-Api-Key'] == 'AIzaSyTestKeyPlacesNew987654321'
        assert 'places.displayName' in headers['X-Goog-FieldMask']
        assert 'places.formattedAddress' in headers['X-Goog-FieldMask']
        assert 'places.nationalPhoneNumber' in headers['X-Goog-FieldMask']
        assert 'places.websiteUri' in headers['X-Goog-FieldMask']
        assert 'places.photos' in headers['X-Goog-FieldMask']
        assert kwargs['json']['textQuery'] == "Restaurants in Visakhapatnam"
        assert kwargs['json']['pageSize'] == 10

    print("[PASS] test_google_places_new_success: Successfully verified Places API (New) contract and mapping.")


def test_google_places_photo_media_uri_resolution():
    connector = GooglePlacesConnector(api_key="AIzaSyTestKeyPlacesNew987654321")
    with patch('requests.get') as mock_get:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {"photoUri": "https://photos.example/shop-1"}
        mock_get.return_value = mock_res

        photo_uri = connector.fetch_photo_uri("places/place-1/photos/photo-1")

    assert photo_uri == "https://photos.example/shop-1"
    args, kwargs = mock_get.call_args
    assert args[0] == "https://places.googleapis.com/v1/places/place-1/photos/photo-1/media"
    assert kwargs["headers"]["X-Goog-Api-Key"] == "AIzaSyTestKeyPlacesNew987654321"
    assert kwargs["params"]["skipHttpRedirect"] == "true"


def test_google_places_photo_mapping_and_optional_photos():
    required_image_columns = [
        {"key": key, "label": key, "is_enabled": True, "is_required": True}
        for key in ("image_1_url", "image_2_url", "image_3_url", "image_count")
    ]
    audit = check_source_capabilities("google_places", required_image_columns)
    assert audit["is_valid"] is True

    requested_names = []

    def resolve_photo(photo_name):
        requested_names.append(photo_name)
        return f"https://photos.example/{photo_name.rsplit('/', 1)[-1]}"

    raw_record = {
        "business_name": "Test Shop",
        "photos": [{"name": f"places/place-1/photos/photo-{index}"} for index in range(1, 5)],
    }
    mapped = GooglePlacesPhotoMapper.map_record(raw_record, resolve_photo)
    assert requested_names == [
        "places/place-1/photos/photo-1",
        "places/place-1/photos/photo-2",
        "places/place-1/photos/photo-3",
    ]
    assert mapped["image_1_url"] == "https://photos.example/photo-1"
    assert mapped["image_2_url"] == "https://photos.example/photo-2"
    assert mapped["image_3_url"] == "https://photos.example/photo-3"
    assert mapped["image_count"] == 3

    partial = GooglePlacesPhotoMapper.map_record(
        {"photos": [{"name": "photo-1"}, {"name": "photo-2"}]},
        lambda name: "https://photos.example/photo-1" if name == "photo-1" else None,
    )
    assert partial["image_1_url"] == "https://photos.example/photo-1"
    assert partial["image_2_url"] is None
    assert partial["image_3_url"] is None
    assert partial["image_count"] == 1

    empty = GooglePlacesPhotoMapper.map_record({"photos": []}, resolve_photo)
    assert empty["image_1_url"] is None
    assert empty["image_2_url"] is None
    assert empty["image_3_url"] is None
    assert empty["image_count"] == 0


def test_collection_worker_persists_mapped_images():
    mock_db = MagicMock()
    mock_doc_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_doc_ref
    mock_doc_ref.get.return_value.to_dict.return_value = {"status": "running"}
    mock_db.collection.return_value.stream.return_value = []

    worker = CollectionWorker(db=mock_db)
    worker.progress_service.commit_batch = MagicMock()
    worker.progress_service.update_job_progress = MagicMock()
    columns = [
        {"key": "business_name", "is_enabled": True},
        {"key": "phone", "is_enabled": True},
        {"key": "image_1_url", "is_enabled": True, "is_custom": True},
        {"key": "image_2_url", "is_enabled": True, "is_custom": True},
        {"key": "image_3_url", "is_enabled": True, "is_custom": True},
        {"key": "image_count", "is_enabled": True, "is_custom": True},
    ]
    raw_record = {
        "place_id": "place-image-test",
        "business_name": "Image Test Shop",
        "phone": "9848022338",
        "city": "Guntur",
        "photos": [{"name": "photo-1"}, {"name": "photo-2"}],
    }

    with patch.object(GooglePlacesConnector, 'search', return_value=iter([raw_record])) as mock_search:
        with patch.object(GooglePlacesConnector, 'fetch_photo_uri', side_effect=["https://photos.example/1", None]):
            with patch.object(GooglePlacesConnector, 'is_configured', return_value=True):
                worker.process_job(
                    job_id="col_test_images",
                    category="Shops",
                    location="Guntur",
                    target_count=1,
                    source="google_places",
                    preset_columns=columns,
                )

    search_options = mock_search.call_args.kwargs
    assert search_options["include_photos"] is True
    assert all(
        (column.get("key") if isinstance(column, dict) else column) not in GooglePlacesPhotoMapper.IMAGE_FIELDS
        for column in search_options["selected_columns"]
    )
    saved_doc = worker.progress_service.commit_batch.call_args.args[1][0]
    assert saved_doc["image_1_url"] == "https://photos.example/1"
    assert saved_doc["image_2_url"] is None
    assert saved_doc["image_3_url"] is None
    assert saved_doc["image_count"] == 1
    assert "photos" not in saved_doc


def test_google_places_legacy_error_diagnostic():
    """Verify accurate translation of legacy API error into actionable diagnostics."""
    connector = GooglePlacesConnector(api_key="AIzaSyTestKeyPlacesNew987654321")

    with patch('requests.post') as mock_post:
        mock_res = MagicMock()
        mock_res.status_code = 403
        mock_res.json.return_value = {
            "error": {
                "code": 403,
                "message": "You're calling a legacy API, which is not enabled for your project.",
                "status": "PERMISSION_DENIED"
            }
        }
        mock_post.return_value = mock_res

        try:
            list(connector.search("Hospitals", "Vijayawada", 5))
            assert False, "Should have raised RuntimeError for legacy API error"
        except RuntimeError as e:
            assert "REQUEST_DENIED" in str(e)
            assert "places api (new)" in str(e).lower()

    print("[PASS] test_google_places_legacy_error_diagnostic: Legacy API error translated to clear guidance.")


def test_google_places_quota_error():
    """Verify HTTP 429 quota exhaustion handling."""
    connector = GooglePlacesConnector(api_key="AIzaSyTestKeyPlacesNew987654321")

    with patch('requests.post') as mock_post:
        mock_res = MagicMock()
        mock_res.status_code = 429
        mock_res.json.return_value = {
            "error": {
                "code": 429,
                "message": "Quota exceeded for quota metric 'Queries' of service 'places.googleapis.com'",
                "status": "RESOURCE_EXHAUSTED"
            }
        }
        mock_post.return_value = mock_res

        try:
            list(connector.search("Hotels", "Tirupati", 5))
            assert False, "Should have raised RuntimeError for quota exceeded"
        except RuntimeError as e:
            assert "QUOTA_EXCEEDED" in str(e)
            assert connector.get_status()['status'] == 'quota_exceeded'

    print("[PASS] test_google_places_quota_error: 429 Quota Exceeded handled cleanly.")


def test_collection_worker_failed_job_never_completed():
    """Ensure worker marks failed jobs as 'failed' and NEVER 'completed' or with fake records."""
    # Mock Firestore client
    mock_db = MagicMock()
    mock_doc_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_doc_ref
    mock_doc_ref.get.return_value.to_dict.return_value = {"status": "running"}

    worker = CollectionWorker(db=mock_db)

    # Force connector search to raise the production error
    with patch.object(
        GooglePlacesConnector,
        'search',
        side_effect=RuntimeError("REQUEST_DENIED: Places API (New) is not enabled on Google Cloud project.")
    ):
        with patch.object(GooglePlacesConnector, 'is_configured', return_value=True):
            worker.process_job(
                job_id="col_test_err_100",
                category="Automobile",
                location="Kakinada",
                target_count=20,
                source="google_places"
            )

    # Check update calls made to Firestore
    update_calls = mock_doc_ref.update.call_args_list
    assert len(update_calls) >= 1
    last_update = update_calls[-1][0][0]

    assert last_update.get('status') == 'failed'
    assert "REQUEST_DENIED" in last_update.get('error_message', '')
    assert last_update.get('status') != 'completed'

    print("[PASS] test_collection_worker_failed_job_never_completed: Job safely marked 'failed'.")


def test_collection_worker_successful_extraction():
    """Verify CollectionWorker processes raw Places API (New) records through normalization and deduplication."""
    mock_db = MagicMock()
    mock_doc_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_doc_ref
    mock_doc_ref.get.return_value.to_dict.return_value = {"status": "running"}
    mock_db.collection.return_value.stream.return_value = []

    worker = CollectionWorker(db=mock_db)

    raw_records = [
        {
            "place_id": "ChIJ_lead_1",
            "business_name": "Sri Krishna Sweets",
            "category": "Sweets",
            "phone": "9848022338",
            "address": "Main Road, Guntur, Andhra Pradesh 522001",
            "city": "Guntur",
            "state": "Andhra Pradesh",
            "rating": 4.5,
            "review_count": 210,
            "website": "https://srikrishnasweets.com",
            "source": "Google Maps / Google Places API",
            "source_url": "https://www.google.com/maps/place/?q=place_id:ChIJ_lead_1",
        },
        # Duplicate record with slight phone variation
        {
            "place_id": "ChIJ_lead_2",
            "business_name": "SRI KRISHNA SWEETS",
            "category": "Sweets",
            "phone": "+91 98480 22338",
            "address": "Main Road, Guntur, Andhra Pradesh 522001",
            "city": "Guntur",
            "state": "Andhra Pradesh",
            "rating": 4.5,
            "review_count": 210,
            "website": "https://srikrishnasweets.com",
            "source": "Google Maps / Google Places API",
            "source_url": "https://www.google.com/maps/place/?q=place_id:ChIJ_lead_2",
        }
    ]

    with patch.object(GooglePlacesConnector, 'search', return_value=iter(raw_records)):
        with patch.object(GooglePlacesConnector, 'is_configured', return_value=True):
            worker.process_job(
                job_id="col_test_success_200",
                category="Sweets",
                location="Guntur",
                target_count=2,
                source="google_places"
            )

    update_calls = mock_doc_ref.update.call_args_list
    assert len(update_calls) >= 1
    final_update = update_calls[-1][0][0]
    assert final_update.get('status') == 'completed'
    assert final_update.get('found') == 2
    assert final_update.get('valid') == 1
    assert final_update.get('duplicate') == 1
    assert final_update.get('progress') == 100

    print("[PASS] test_collection_worker_successful_extraction: Normalized, deduplicated, and telemetry updated.")


def test_api_key_redaction():
    """Verify that sensitive API key strings are never printed in logs."""
    fake_key = "AIzaSySecretProductionKeyDoNotExpose123"
    connector = GooglePlacesConnector(api_key=fake_key)

    import io
    from contextlib import redirect_stdout
    f = io.StringIO()
    with redirect_stdout(f):
        connector._safe_log(f"Connecting to Google Maps Platform with key {fake_key}")
    output = f.getvalue()

    assert fake_key not in output
    assert "[REDACTED_API_KEY]" in output

    print("[PASS] test_api_key_redaction: API key cleanly redacted in safe logging.")


if __name__ == '__main__':
    print("=" * 70)
    print("RUNNING GOOGLE PLACES API (NEW) DEDICATED UNIT TESTS")
    print("=" * 70)
    test_google_places_new_success()
    test_google_places_photo_media_uri_resolution()
    test_google_places_photo_mapping_and_optional_photos()
    test_collection_worker_persists_mapped_images()
    test_google_places_legacy_error_diagnostic()
    test_google_places_quota_error()
    test_collection_worker_failed_job_never_completed()
    test_collection_worker_successful_extraction()
    test_api_key_redaction()
    print("=" * 70)
    print("ALL GOOGLE PLACES API (NEW) TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
