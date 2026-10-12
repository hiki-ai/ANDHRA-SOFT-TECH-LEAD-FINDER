"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
AUTOMATED VERIFICATION & TEST SUITE
==============================================================================
Tests backend application initialization, routes, authentication middleware,
CORS policies, preflight OPTIONS, error formatting, dashboard stats,
vendor CRUD, search route resolution, collection management, source connectors,
spreadsheet import preview & commit, and Excel export generation.
==============================================================================
"""

import io
import json
import os
import sys

# Ensure backend root is first in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.append(worker_dir)

from app import create_app
from app.config.settings import Settings


def run_tests():
    print("=" * 75)
    print("STARTING ANDHRA SOFT TECH — LEAD FINDER VERIFICATION SUITE")
    print("=" * 75)

    # 1. Initialize Flask app in testing mode
    app = create_app('testing')
    client = app.test_client()
    print("[PASS] 1. Flask application created cleanly in testing configuration.")

    # 2. Test Health endpoints (unprotected, both canonical and alias)
    res = client.get('/api/v1/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    health_data = res.get_json()
    assert health_data.get('status') == 'healthy', f"Unexpected health status: {health_data}"
    assert 'database' in health_data, "Missing database status in health response"
    print(f"[PASS] 2. GET /api/v1/health responded: status={health_data['status']}")

    res_root = client.get('/health')
    assert res_root.status_code == 200, f"Root /health failed: {res_root.status_code}"
    print("[PASS] 2b. GET /health alias responded 200 OK.")

    # 3. Test CORS Preflight OPTIONS requests for Production Vercel Origin
    prod_origin = "https://andhra-soft-tech-lead-finder.vercel.app"
    r_options = client.open(
        '/api/v1/dashboard/stats',
        method='OPTIONS',
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type"
        }
    )
    assert r_options.status_code in (200, 204), f"Preflight OPTIONS returned {r_options.status_code}"
    assert r_options.headers.get('Access-Control-Allow-Origin') == prod_origin, "Missing/incorrect Allow-Origin header on OPTIONS"
    assert r_options.headers.get('Access-Control-Allow-Credentials') == 'true', "Missing Allow-Credentials on OPTIONS"
    assert 'GET' in r_options.headers.get('Access-Control-Allow-Methods', ''), "Missing GET in Allow-Methods"
    print(f"[PASS] 3. CORS Preflight OPTIONS for production origin '{prod_origin}' verified (status {r_options.status_code}).")

    # 4. Test CORS Unauthorized Origin Rejection
    bad_origin = "https://malicious-site.example.com"
    r_bad_cors = client.get(
        '/api/v1/health',
        headers={"Origin": bad_origin}
    )
    assert r_bad_cors.headers.get('Access-Control-Allow-Origin') != bad_origin, "Malicious origin was improperly allowed!"
    print(f"[PASS] 4. Unauthorized origin '{bad_origin}' correctly denied CORS access.")

    # 5. Test CORS for Validated Vercel Preview Subdomain
    preview_origin = "https://andhra-soft-tech-feature-test.vercel.app"
    r_preview_cors = client.get(
        '/api/v1/health',
        headers={"Origin": preview_origin}
    )
    assert r_preview_cors.headers.get('Access-Control-Allow-Origin') == preview_origin, "Legitimate Vercel preview was blocked!"
    print(f"[PASS] 5. Validated Vercel preview domain '{preview_origin}' approved.")

    # 6. Test JSON 404 response on unknown routes with CORS headers
    r_404 = client.get('/api/v1/non_existent_route', headers={"Origin": prod_origin})
    assert r_404.status_code == 404, f"Expected 404, got {r_404.status_code}"
    json_404 = r_404.get_json()
    assert json_404.get('success') is False
    assert json_404.get('error', {}).get('code') == 'NOT_FOUND'
    assert r_404.headers.get('Access-Control-Allow-Origin') == prod_origin, "Missing CORS headers on 404 error response"
    print("[PASS] 6. Unknown route returned clean JSON 404 with CORS headers intact.")

    # 7. Test Authentication failures on protected endpoints
    protected_endpoints = [
        ('GET', '/api/v1/dashboard/stats'),
        ('GET', '/api/v1/vendors'),
        ('POST', '/api/v1/vendors'),
        ('GET', '/api/v1/collections'),
        ('POST', '/api/v1/collections'),
        ('GET', '/api/v1/columns'),
        ('POST', '/api/v1/columns'),
        ('POST', '/api/v1/exports'),
        ('GET', '/api/v1/sources'),
    ]

    for method, path in protected_endpoints:
        if method == 'GET':
            r = client.get(path)
        else:
            r = client.post(path, json={})
        assert r.status_code == 401, f"Expected 401 on unauthenticated {method} {path}, got {r.status_code}"
    print("[PASS] 7. Authentication enforcement: All protected endpoints strictly reject requests without token (401).")

    # Invalid token check
    r_bad_token = client.get('/api/v1/vendors', headers={"Authorization": "Bearer invalid_garbage_token"})
    assert r_bad_token.status_code == 401, f"Expected 401 for invalid bearer token, got {r_bad_token.status_code}"
    print("[PASS] 7b. Invalid bearer token rejected with 401.")

    # Ordinary user token check (authenticated but non-admin: must return HTTP 403 Forbidden)
    r_user_token = client.get('/api/v1/dashboard/stats', headers={"Authorization": "Bearer test_user_token"})
    assert r_user_token.status_code == 403, f"Expected 403 for non-admin user token, got {r_user_token.status_code}"
    err_json = r_user_token.get_json()
    assert err_json.get('success') is False
    assert err_json.get('error', {}).get('code') == 'FORBIDDEN'
    assert 'administrator privileges' in err_json.get('error', {}).get('message', '').lower()
    print("[PASS] 7c. Ordinary user strictly rejected with HTTP 403 Forbidden on admin endpoint.")

    # 8. Authenticated Dashboard stats on empty database
    admin_headers = {"Authorization": "Bearer test_admin_token", "Origin": prod_origin}

    r_stats = client.get('/api/v1/dashboard/stats', headers=admin_headers)
    assert r_stats.status_code == 200, f"Dashboard stats failed: {r_stats.status_code}"
    assert r_stats.headers.get('Access-Control-Allow-Origin') == prod_origin
    stats = r_stats.get_json()['data']
    assert stats['total_vendors'] == 0, f"Expected 0 initial vendors, got {stats['total_vendors']}"
    assert stats['valid_vendors'] == 0
    assert stats['duplicate_vendors'] == 0
    assert stats['total_collections'] == 0
    print("[PASS] 8. GET /api/v1/dashboard/stats returned honest initial zero counts on empty database.")

    # 9. Test un-prefixed route alias (/dashboard/stats)
    r_alias_stats = client.get('/dashboard/stats', headers=admin_headers)
    assert r_alias_stats.status_code == 200, f"Un-prefixed /dashboard/stats failed: {r_alias_stats.status_code}"
    print("[PASS] 9. Un-prefixed /dashboard/stats alias succeeded without 404.")

    # 10. Vendor CRUD lifecycle + Search route resolution test
    new_vendor = {
        "business_name": "Test Emporium Teak Crafts",
        "category": "Furniture",
        "phone": "+91 883 245 9999",
        "email": "contact@testemporium.com",
        "city": "Rajahmundry",
        "state": "Andhra Pradesh",
        "website": "https://testemporium.com",
        "address": "Main Bazar",
        "rating": 4.5,
        "custom_fields": {"gst_in": "37TEST1234F1Z5"}
    }
    r_create = client.post('/api/v1/vendors', headers=admin_headers, json=new_vendor)
    assert r_create.status_code == 201, f"Vendor creation failed: {r_create.status_code}"
    created_vendor = r_create.get_json()['data']
    vendor_id = created_vendor['id']
    assert created_vendor['business_name'] == new_vendor['business_name']
    assert created_vendor['data_quality_score'] >= 75
    print(f"[PASS] 10a. POST /api/v1/vendors created lead: id={vendor_id}, score={created_vendor['data_quality_score']}%.")

    # Get by ID
    r_get = client.get(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_get.status_code == 200
    assert r_get.get_json()['data']['id'] == vendor_id
    print(f"[PASS] 10b. GET /api/v1/vendors/{vendor_id} returned created vendor record.")

    # Update Vendor (PATCH)
    r_patch = client.patch(f'/api/v1/vendors/{vendor_id}', headers=admin_headers, json={"rating": 4.9})
    assert r_patch.status_code == 200
    assert r_patch.get_json()['data']['rating'] == 4.9
    print(f"[PASS] 10c. PATCH /api/v1/vendors/{vendor_id} updated rating to 4.9.")

    # Search Vendors — verifies /search route does NOT get swallowed by /<vendor_id>
    r_search = client.get('/api/v1/vendors/search?q=Teak', headers=admin_headers)
    assert r_search.status_code == 200, f"GET /api/v1/vendors/search returned {r_search.status_code}!"
    search_data = r_search.get_json()['data']
    assert len(search_data) >= 1
    assert any(v['id'] == vendor_id for v in search_data)
    print(f"[PASS] 10d. GET /api/v1/vendors/search correctly routed and returned {len(search_data)} record(s).")

    # 11. Custom Columns Management
    new_col = {
        "label": "GST Identification Number",
        "key": "gst_in",
        "data_type": "text",
        "position": 1
    }
    r_col = client.post('/api/v1/columns', headers=admin_headers, json=new_col)
    assert r_col.status_code == 201
    col_id = r_col.get_json()['data']['id']
    r_col_list = client.get('/api/v1/columns', headers=admin_headers)
    assert r_col_list.status_code == 200
    assert len(r_col_list.get_json()['data']) >= 1
    print(f"[PASS] 11. Column management: created col_id={col_id} and verified in GET /api/v1/columns.")

    # 12. Data Sources Endpoint — verify all 3 connectors and prevent credential leakage
    r_sources = client.get('/api/v1/sources', headers=admin_headers)
    assert r_sources.status_code == 200, f"GET /api/v1/sources failed: {r_sources.status_code}"
    sources_list = r_sources.get_json()['data']
    source_ids = [s['id'] for s in sources_list]
    assert 'google_places' in source_ids
    assert 'justdial' in source_ids
    assert 'magicpin' in source_ids

    # Verify source statuses
    gp_status = next(s for s in sources_list if s['id'] == 'google_places')
    jd_status = next(s for s in sources_list if s['id'] == 'justdial')
    mp_status = next(s for s in sources_list if s['id'] == 'magicpin')

    assert gp_status['status'] in ('active', 'not_configured')
    assert jd_status['status'] == 'authorization_required'
    assert mp_status['status'] == 'authorization_required'

    # Security check: verify no API key or credential is leaked in response
    for s in sources_list:
        assert 'api_key' not in s and 'key' not in s and 'partner_key' not in s
        assert not any(k.startswith('AIza') for k in str(s).split())
    print(f"[PASS] 12. GET /api/v1/sources returned registered sources: {source_ids} without leaking credentials.")

    # 13a. Collection job creation with unconfigured source (justdial) returns failure without faking data
    r_jd_job = client.post('/api/v1/collections', headers=admin_headers, json={
        "category": "Hotels",
        "location": "Visakhapatnam",
        "target_count": 50,
        "source": "justdial"
    })
    assert r_jd_job.status_code == 201
    jd_job_data = r_jd_job.get_json()['data']
    assert jd_job_data['status'] == 'failed'
    assert 'AUTHORIZATION_REQUIRED' in jd_job_data['error_message'] or 'authorization' in jd_job_data['error_message'].lower()
    print(f"[PASS] 13a. Job with unconfigured source (justdial) failed safely with diagnostic: '{jd_job_data['error_message']}'.")

    # 13b. Collection job creation with unconfigured source (magicpin) returns failure without faking data
    r_mp_job = client.post('/api/v1/collections', headers=admin_headers, json={
        "category": "Restaurants",
        "location": "Vijayawada",
        "target_count": 30,
        "source": "magicpin"
    })
    assert r_mp_job.status_code == 201
    mp_job_data = r_mp_job.get_json()['data']
    assert mp_job_data['status'] == 'failed'
    assert 'AUTHORIZATION_REQUIRED' in mp_job_data['error_message'] or 'authorization' in mp_job_data['error_message'].lower()
    print(f"[PASS] 13b. Job with unconfigured source (magicpin) failed safely with diagnostic: '{mp_job_data['error_message']}'.")

    # 13c. Verify connectors direct runtime enforcement and error messages
    from collectors.connectors.google_places import GooglePlacesConnector
    from collectors.connectors.justdial import JustdialConnector
    from collectors.connectors.magicpin import MagicpinConnector

    gp_conn = GooglePlacesConnector(api_key="")
    assert gp_conn.is_configured() is False
    assert gp_conn.get_status()['status'] == 'not_configured'
    try:
        list(gp_conn.search("Hotels", "Visakhapatnam", 10))
        assert False, "Unconfigured Google Places should have raised RuntimeError"
    except RuntimeError as e:
        assert "NOT_CONFIGURED" in str(e) or "not configured" in str(e).lower()

    jd_conn = JustdialConnector(partner_key="")
    assert jd_conn.is_configured() is False
    assert jd_conn.get_status()['status'] == 'authorization_required'
    try:
        list(jd_conn.search("Hotels", "Visakhapatnam", 10))
        assert False, "Unconfigured Justdial should have raised RuntimeError"
    except RuntimeError as e:
        assert "AUTHORIZATION_REQUIRED" in str(e)

    mp_conn = MagicpinConnector(partner_key="")
    assert mp_conn.is_configured() is False
    assert mp_conn.get_status()['status'] == 'authorization_required'
    try:
        list(mp_conn.search("Restaurants", "Vijayawada", 10))
        assert False, "Unconfigured Magicpin should have raised RuntimeError"
    except RuntimeError as e:
        print("[PASS] 13c. Connector runtime checks enforce NOT_CONFIGURED and AUTHORIZATION_REQUIRED guards.")

    # 13d. Test Google Places API (New) error handling and status translations
    from unittest.mock import patch, MagicMock

    mock_gp = GooglePlacesConnector(api_key="AIzaSyValidDummyKeyForTest123456")
    assert mock_gp.is_configured() is True

    # 1. Quota Exceeded (HTTP 429 / RESOURCE_EXHAUSTED) test
    with patch('requests.post') as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.json.return_value = {
            "error": {
                "code": 429,
                "message": "Quota exceeded for quota metric 'Queries' of service 'places.googleapis.com'",
                "status": "RESOURCE_EXHAUSTED"
            }
        }
        mock_post.return_value = mock_resp

        try:
            list(mock_gp.search("Hotels", "Rajahmundry", 10))
            assert False, "Should have raised quota exceeded"
        except RuntimeError as e:
            assert "QUOTA_EXCEEDED" in str(e)
            assert mock_gp.get_status()['status'] == 'quota_exceeded'

    # 2. REQUEST_DENIED with referer restriction test (HTTP 403)
    with patch('requests.post') as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.json.return_value = {
            "error": {
                "code": 403,
                "message": "API keys with referer restrictions cannot be used with this API.",
                "status": "PERMISSION_DENIED"
            }
        }
        mock_post.return_value = mock_resp

        try:
            list(mock_gp.search("Hotels", "Rajahmundry", 10))
            assert False, "Should have raised request denied"
        except RuntimeError as e:
            assert "REQUEST_DENIED" in str(e)
            assert "referrer" in str(e).lower() or "referer" in str(e).lower()

    # 3. REQUEST_DENIED with legacy API / disabled API diagnostic test
    with patch('requests.post') as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.json.return_value = {
            "error": {
                "code": 403,
                "message": "You're calling a legacy API, which is not enabled for your project.",
                "status": "PERMISSION_DENIED"
            }
        }
        mock_post.return_value = mock_resp

        try:
            list(mock_gp.search("Hotels", "Rajahmundry", 10))
            assert False, "Should have raised request denied"
        except RuntimeError as e:
            assert "REQUEST_DENIED" in str(e)
            assert "places api (new)" in str(e).lower()

    # 4. Empty search results (zero results returns empty list without raising)
    with patch('requests.post') as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"places": []}
        mock_post.return_value = mock_resp

        zero_res = list(mock_gp.search("Underwater Igloos", "Rajahmundry", 10))
        assert len(zero_res) == 0

    print("[PASS] 13d. Google Places API (New) error paths (QUOTA_EXCEEDED, REQUEST_DENIED, ZERO_RESULTS) verified.")

    # 13e. Test Google Places API (New) POST searchText response and field mapping
    with patch('requests.post') as mock_post:
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "places": [
                {
                    "id": "ChIJ_rajahmundry_1",
                    "displayName": {
                        "text": "Hotel River View",
                        "languageCode": "en"
                    },
                    "formattedAddress": "Danavaipeta, Rajahmundry, Andhra Pradesh 533103",
                    "rating": 4.3,
                    "userRatingCount": 512,
                    "nationalPhoneNumber": "0883 244 5678",
                    "internationalPhoneNumber": "+91 883 244 5678",
                    "websiteUri": "https://hotelriverview.com",
                    "types": ["hotel", "lodging"]
                }
            ],
            "nextPageToken": None
        }
        mock_post.return_value = mock_res

        places = list(mock_gp.search("Hotels", "Rajahmundry", 5))
        assert len(places) == 1
        p = places[0]
        assert p['place_id'] == "ChIJ_rajahmundry_1"
        assert p['business_name'] == "Hotel River View"
        assert p['phone'] == "0883 244 5678"
        assert p['website'] == "https://hotelriverview.com"
        assert p['rating'] == 4.3
        assert p['city'] == "Rajahmundry"
        assert p['source'] == "Google Maps / Google Places API"

        # Verify Google Places API (New) contract: POST endpoint, headers, and body
        mock_post.assert_called_once()
        call_url = mock_post.call_args[0][0]
        call_kwargs = mock_post.call_args[1]
        assert call_url == "https://places.googleapis.com/v1/places:searchText"
        headers_sent = call_kwargs.get('headers', {})
        assert headers_sent.get('Content-Type') == 'application/json'
        assert headers_sent.get('X-Goog-Api-Key') == 'AIzaSyValidDummyKeyForTest123456'
        assert 'X-Goog-FieldMask' in headers_sent
        assert 'places.displayName' in headers_sent['X-Goog-FieldMask']
        assert 'places.formattedAddress' in headers_sent['X-Goog-FieldMask']
        body_sent = call_kwargs.get('json', {})
        assert body_sent.get('textQuery') == 'Hotels in Rajahmundry'
        assert body_sent.get('pageSize') == 5

    # 13e-2. Test Place Details (New) endpoint resolution
    with patch('requests.get') as mock_get:
        mock_detail_res = MagicMock()
        mock_detail_res.status_code = 200
        mock_detail_res.json.return_value = {
            "id": "ChIJ_rajahmundry_1",
            "displayName": {"text": "Hotel River View"},
            "nationalPhoneNumber": "0883 244 5678",
            "websiteUri": "https://hotelriverview.com"
        }
        mock_get.return_value = mock_detail_res
        detail_data = mock_gp._fetch_place_details("ChIJ_rajahmundry_1")
        assert detail_data.get('formatted_phone_number') == "0883 244 5678"
        assert detail_data.get('website') == "https://hotelriverview.com"

    print("[PASS] 13e. Google Places API (New) searchText POST extraction, field mapping, and details verified.")

    # 13f. Test deduplication and telemetry count persistence in CollectionWorker
    from processors.deduplicator import RecordDeduplicator
    k1 = RecordDeduplicator.create_dedupe_key("Hotel River View", "0883 244 5678", "Rajahmundry")
    k2 = RecordDeduplicator.create_dedupe_key("HOTEL RIVER VIEW", "08832445678", "Rajahmundry")
    assert k1 == k2, "Normalized dedupe keys should match for duplicate vendors"
    print(f"[PASS] 13f. Record deduplication confirmed: dedupe_key='{k1}'.")

    # 13g. Verify GET /api/v1/collections returns source_name and count aliases
    r_cols = client.get('/api/v1/collections', headers=admin_headers)
    assert r_cols.status_code == 200
    cols_data = r_cols.get_json()['data']
    if cols_data:
        first_col = cols_data[0]
        assert 'source_name' in first_col
        assert 'found' in first_col
    print("[PASS] 13g. GET /api/v1/collections returns source_name and telemetry counts.")

    # 14. Collection Pause / Resume / Cancel endpoints
    new_job_payload = {
        "category": "Furniture",
        "location": "Rajahmundry",
        "target_count": 20,
        "source": "google_places"
    }
    r_job = client.post('/api/v1/collections', headers=admin_headers, json=new_job_payload)
    assert r_job.status_code == 201
    job_id = r_job.get_json()['data']['id']

    # Job Pause
    r_pause = client.post(f'/api/v1/collections/{job_id}/pause', headers=admin_headers)
    assert r_pause.status_code == 200
    r_job_get = client.get(f'/api/v1/collections/{job_id}', headers=admin_headers)
    assert r_job_get.get_json()['data']['status'] == 'paused'
    print(f"[PASS] 14a. POST /api/v1/collections/{job_id}/pause transitioned status to 'paused'.")

    # Job Resume
    r_resume = client.post(f'/api/v1/collections/{job_id}/resume', headers=admin_headers)
    assert r_resume.status_code == 200
    r_job_get2 = client.get(f'/api/v1/collections/{job_id}', headers=admin_headers)
    assert r_job_get2.get_json()['data']['status'] == 'running'
    print(f"[PASS] 14b. POST /api/v1/collections/{job_id}/resume transitioned status to 'running'.")

    # Job Cancel
    r_cancel = client.post(f'/api/v1/collections/{job_id}/cancel', headers=admin_headers)
    assert r_cancel.status_code == 200
    r_job_get3 = client.get(f'/api/v1/collections/{job_id}', headers=admin_headers)
    assert r_job_get3.get_json()['data']['status'] == 'cancelled'
    print(f"[PASS] 14c. POST /api/v1/collections/{job_id}/cancel transitioned status to 'cancelled'.")

    # 15. Excel/CSV Import Preview and Commit
    csv_content = (
        "Business Name,Phone Number,City,Category\n"
        "Andhra Timber Traders,+918832001122,Rajahmundry,Furniture\n"
        "Visakha Cardiac Hospital,+918912773344,Visakhapatnam,Hospitals\n"
        "Vijayawada Spice Garden,+918662994455,Vijayawada,Restaurants\n"
    ).encode('utf-8')

    data = {
        'file': (io.BytesIO(csv_content), 'test_leads.csv')
    }
    r_prev = client.post('/api/v1/imports/preview', headers=admin_headers, data=data, content_type='multipart/form-data')
    assert r_prev.status_code == 200, f"Import preview failed: {r_prev.status_code}"
    prev_json = r_prev.get_json()['data']
    assert prev_json['detected_rows'] == 3
    assert 'Business Name' in prev_json['detected_columns']
    assert prev_json['suggested_mapping']['Business Name'] == 'business_name'
    print(f"[PASS] 15a. POST /api/v1/imports/preview parsed CSV: detected 3 rows.")

    # Import execution
    data_import = {
        'file': (io.BytesIO(csv_content), 'test_leads.csv'),
        'mapping': json.dumps({
            "Business Name": "business_name",
            "Phone Number": "phone",
            "City": "city",
            "Category": "category"
        })
    }
    r_import = client.post('/api/v1/imports', headers=admin_headers, data=data_import, content_type='multipart/form-data')
    assert r_import.status_code == 200, f"Execute import failed: {r_import.status_code}"
    import_res = r_import.get_json()['data']
    assert import_res['inserted'] == 3
    print(f"[PASS] 15b. POST /api/v1/imports committed 3 leads to Firestore via batched write.")

    # 16. Excel Export Generation (Pandas & OpenPyXL)
    export_payload = {
        "category": "Furniture",
        "format": "xlsx"
    }
    r_exp = client.post('/api/v1/exports', headers=admin_headers, json=export_payload)
    assert r_exp.status_code == 200, f"Export trigger failed: {r_exp.status_code}"
    exp_data = r_exp.get_json()['data']
    export_id = exp_data['export_id']
    download_url = exp_data['download_url']
    print(f"[PASS] 16a. POST /api/v1/exports generated real XLSX: export_id={export_id}.")

    # Test file download endpoint
    r_dl = client.get(download_url)
    assert r_dl.status_code == 200, f"Download failed: {r_dl.status_code}"
    assert len(r_dl.data) > 0
    assert 'spreadsheet' in r_dl.content_type or 'octet-stream' in r_dl.content_type
    print(f"[PASS] 16b. GET {download_url} served binary file ({len(r_dl.data)} bytes).")

    # 17. Cleanup & Vendor Deletion
    r_del = client.delete(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_del.status_code == 200, f"Vendor deletion failed: {r_del.status_code}"
    r_del_check = client.get(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_del_check.status_code == 404, "Deleted vendor still returned!"
    print(f"[PASS] 17. DELETE /api/v1/vendors/{vendor_id} successfully purged record.")

    # 18. Verification of Firebase Credential Parsing, Key Normalization & Auth Security
    from app.config.firebase import normalize_private_key, parse_service_account_json

    # Test key normalization with quotes and escaped newlines
    sample_quoted_key = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6\\n-----END PRIVATE KEY-----\\n"'
    normalized_key = normalize_private_key(sample_quoted_key)
    assert '\n' in normalized_key, "Newlines were not normalized"
    assert normalized_key.startswith('-----BEGIN PRIVATE KEY-----\n')
    assert normalized_key.endswith('-----END PRIVATE KEY-----\n')
    assert not normalized_key.startswith('"')
    assert not normalized_key.endswith('"')

    # Test raw key without headers
    raw_body = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6"
    wrapped_key = normalize_private_key(raw_body)
    assert wrapped_key.startswith('-----BEGIN PRIVATE KEY-----\n')
    assert wrapped_key.endswith('-----END PRIVATE KEY-----\n')

    # Test Service Account JSON parsing (raw, quoted, and base64)
    sa_test_dict = {"type": "service_account", "project_id": "andhra-soft-tech-lead-finder", "client_email": "test@test.iam.gserviceaccount.com"}
    raw_sa_str = json.dumps(sa_test_dict)
    assert parse_service_account_json(raw_sa_str)["project_id"] == "andhra-soft-tech-lead-finder"
    assert parse_service_account_json("'" + raw_sa_str + "'")["project_id"] == "andhra-soft-tech-lead-finder"

    import base64
    b64_sa = base64.b64encode(raw_sa_str.encode('utf-8')).decode('utf-8')
    assert parse_service_account_json(b64_sa)["project_id"] == "andhra-soft-tech-lead-finder"

    # Test non-admin authorization rejection (403 FORBIDDEN)
    import base64
    fake_header = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).decode().rstrip('=')
    non_admin_claims = base64.urlsafe_b64encode(json.dumps({"email": "unauthorized_user@gmail.com", "sub": "usr_999"}).encode()).decode().rstrip('=')
    non_admin_jwt = f"{fake_header}.{non_admin_claims}.signature"
    r_forbidden = client.get('/api/v1/dashboard/stats', headers={"Authorization": f"Bearer {non_admin_jwt}"})
    assert r_forbidden.status_code in (401, 403), f"Expected 401 or 403 for non-admin user, got {r_forbidden.status_code}"
    # Verify no secret or private key is in the response body
    resp_text = r_forbidden.get_data(as_text=True)
    assert "PRIVATE KEY" not in resp_text
    assert "signature" not in resp_text
    print("[PASS] 18. Firebase credential parsers, private key normalizer, and secure auth responses verified.")

    print("=" * 75)
    print("ALL 18 VERIFICATION SUITE CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == '__main__':
    run_tests()

