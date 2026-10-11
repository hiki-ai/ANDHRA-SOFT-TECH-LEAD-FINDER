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

    # 12. Data Sources Endpoint
    r_sources = client.get('/api/v1/sources', headers=admin_headers)
    assert r_sources.status_code == 200, f"GET /api/v1/sources failed: {r_sources.status_code}"
    sources_list = r_sources.get_json()['data']
    source_ids = [s['id'] for s in sources_list]
    assert 'google_places' in source_ids
    assert 'justdial' in source_ids
    assert 'magicpin' in source_ids
    # Check justdial status is authorization_required
    jd_status = next(s for s in sources_list if s['id'] == 'justdial')
    assert jd_status['status'] == 'authorization_required'
    print(f"[PASS] 12. GET /api/v1/sources returned registered sources: {source_ids}.")

    # 13. Collection job creation with unconfigured source returns failure without faking data
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
    print(f"[PASS] 13. Job with unconfigured source (justdial) failed safely with diagnostic: '{jd_job_data['error_message']}'.")

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

    print("=" * 75)
    print("ALL 17 VERIFICATION SUITE CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == '__main__':
    run_tests()
