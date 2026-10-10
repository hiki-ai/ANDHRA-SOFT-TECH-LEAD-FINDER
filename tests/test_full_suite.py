"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
AUTOMATED VERIFICATION & TEST SUITE
==============================================================================
Tests backend application initialization, routes, authentication middleware,
dashboard stats, vendor CRUD, collection management, custom columns,
spreadsheet import preview, and Excel export generation.
==============================================================================
"""

import io
import json
import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.config.settings import Settings

def run_tests():
    print("=" * 70)
    print("STARTING ANDHRA SOFT TECH — LEAD FINDER VERIFICATION SUITE")
    print("=" * 70)

    # 1. Initialize Flask app in testing mode
    app = create_app('testing')
    client = app.test_client()
    print("[PASS] Flask application created cleanly in testing configuration.")

    # 2. Test Health endpoints (unprotected)
    res = client.get('/api/v1/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    health_data = res.get_json()
    assert health_data.get('status') == 'healthy', f"Unexpected health status: {health_data}"
    assert 'database' in health_data, "Missing database status in health response"
    print(f"[PASS] GET /api/v1/health responded: status={health_data['status']}, database={health_data['database']}")

    res_root = client.get('/health')
    assert res_root.status_code == 200, f"Root /health failed: {res_root.status_code}"
    print("[PASS] GET /health alias responded 200 OK.")

    # 3. Test Authentication failures on protected endpoints
    protected_endpoints = [
        ('GET', '/api/v1/dashboard/stats'),
        ('GET', '/api/v1/vendors'),
        ('POST', '/api/v1/vendors'),
        ('GET', '/api/v1/collections'),
        ('POST', '/api/v1/collections'),
        ('GET', '/api/v1/columns'),
        ('POST', '/api/v1/columns'),
        ('POST', '/api/v1/exports'),
    ]

    for method, path in protected_endpoints:
        if method == 'GET':
            r = client.get(path)
        else:
            r = client.post(path, json={})
        assert r.status_code == 401, f"Expected 401 on unauthenticated {method} {path}, got {r.status_code}"
    print("[PASS] Authentication enforcement: All protected endpoints strictly reject requests without token (401).")

    # Invalid token check
    r_bad_token = client.get('/api/v1/vendors', headers={"Authorization": "Bearer invalid_garbage_token"})
    assert r_bad_token.status_code == 401, f"Expected 401 for invalid bearer token, got {r_bad_token.status_code}"
    print("[PASS] Invalid bearer token rejected with 401.")

    # 4. Authenticated tests using testing client headers
    admin_headers = {"Authorization": "Bearer test_admin_token"}

    # Test Dashboard stats when empty
    r_stats = client.get('/api/v1/dashboard/stats', headers=admin_headers)
    assert r_stats.status_code == 200, f"Dashboard stats failed: {r_stats.status_code}"
    stats = r_stats.get_json()['data']
    assert 'total_vendors' in stats
    assert 'valid_vendors' in stats
    assert 'duplicate_vendors' in stats
    assert 'avg_quality_score' in stats
    print(f"[PASS] GET /api/v1/dashboard/stats returned honest initial counts (total: {stats['total_vendors']}).")

    # 5. Vendor CRUD lifecycle
    new_vendor = {
        "business_name": "Test Emporium & Teak Crafts",
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
    assert 'dedupe_key' in created_vendor
    assert created_vendor['data_quality_score'] > 0
    print(f"[PASS] POST /api/v1/vendors created lead: id={vendor_id}, score={created_vendor['data_quality_score']}%, dedupe_key={created_vendor['dedupe_key']}")

    # Vendor retrieval
    r_get = client.get(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_get.status_code == 200, f"Vendor fetch failed: {r_get.status_code}"
    fetched = r_get.get_json()['data']
    assert fetched['id'] == vendor_id
    print(f"[PASS] GET /api/v1/vendors/{vendor_id} returned created vendor record.")

    # Vendor update
    r_update = client.patch(f'/api/v1/vendors/{vendor_id}', headers=admin_headers, json={"rating": 4.9})
    assert r_update.status_code == 200, f"Vendor patch failed: {r_update.status_code}"
    assert r_update.get_json()['data']['rating'] == 4.9
    print(f"[PASS] PATCH /api/v1/vendors/{vendor_id} updated rating to 4.9.")

    # Vendor search & pagination
    r_list = client.get('/api/v1/vendors?search=Test+Emporium', headers=admin_headers)
    assert r_list.status_code == 200
    list_data = r_list.get_json()['data']
    assert len(list_data['items']) >= 1
    assert list_data['pagination']['total'] >= 1
    print(f"[PASS] GET /api/v1/vendors with search query returned {len(list_data['items'])} matching record(s).")

    # 6. Custom Columns CRUD
    new_col = {
        "key": "lead_priority",
        "label": "Lead Priority Level",
        "type": "text"
    }
    r_col_create = client.post('/api/v1/columns', headers=admin_headers, json=new_col)
    assert r_col_create.status_code == 201, f"Column creation failed: {r_col_create.status_code}"
    col_id = r_col_create.get_json()['data']['id']
    print(f"[PASS] POST /api/v1/columns created custom field: id={col_id}")

    r_col_list = client.get('/api/v1/columns', headers=admin_headers)
    assert r_col_list.status_code == 200
    assert any(c.get('key') == 'lead_priority' for c in r_col_list.get_json()['data'])
    print("[PASS] GET /api/v1/columns listed custom fields successfully.")

    # 7. Collection Job Lifecycle
    new_job_payload = {
        "category": "Hospitals",
        "location": "Visakhapatnam",
        "target_count": 250
    }
    r_job = client.post('/api/v1/collections', headers=admin_headers, json=new_job_payload)
    assert r_job.status_code == 201, f"Job creation failed: {r_job.status_code}"
    job_id = r_job.get_json()['data']['id']
    print(f"[PASS] POST /api/v1/collections initiated job: id={job_id}")

    # Job Pause
    r_pause = client.post(f'/api/v1/collections/{job_id}/pause', headers=admin_headers)
    assert r_pause.status_code == 200
    r_job_get = client.get(f'/api/v1/collections/{job_id}', headers=admin_headers)
    assert r_job_get.get_json()['data']['status'] == 'paused'
    print(f"[PASS] POST /api/v1/collections/{job_id}/pause transitioned status to 'paused'.")

    # Job Resume
    r_resume = client.post(f'/api/v1/collections/{job_id}/resume', headers=admin_headers)
    assert r_resume.status_code == 200
    r_job_get2 = client.get(f'/api/v1/collections/{job_id}', headers=admin_headers)
    assert r_job_get2.get_json()['data']['status'] == 'running'
    print(f"[PASS] POST /api/v1/collections/{job_id}/resume transitioned status to 'running'.")

    # 8. Excel/CSV Import Preview
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
    print(f"[PASS] POST /api/v1/imports/preview parsed CSV: detected 3 rows, detected columns: {prev_json['detected_columns']}")

    # 9. Excel Export Generation (Pandas & OpenPyXL)
    export_payload = {
        "category": "Furniture",
        "format": "xlsx"
    }
    r_exp = client.post('/api/v1/exports', headers=admin_headers, json=export_payload)
    assert r_exp.status_code == 200, f"Export trigger failed: {r_exp.status_code}"
    exp_data = r_exp.get_json()['data']
    export_id = exp_data['export_id']
    download_url = exp_data['download_url']
    print(f"[PASS] POST /api/v1/exports generated real XLSX: export_id={export_id}, download_url={download_url}")

    # Test file download endpoint
    r_dl = client.get(download_url)
    assert r_dl.status_code == 200, f"Download failed: {r_dl.status_code}"
    assert len(r_dl.data) > 0
    assert 'spreadsheet' in r_dl.content_type or 'octet-stream' in r_dl.content_type
    print(f"[PASS] GET {download_url} served binary file ({len(r_dl.data)} bytes).")

    # 10. Vendor Deletion
    r_del = client.delete(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_del.status_code == 200, f"Vendor deletion failed: {r_del.status_code}"
    r_del_check = client.get(f'/api/v1/vendors/{vendor_id}', headers=admin_headers)
    assert r_del_check.status_code == 404, "Deleted vendor still returned!"
    print(f"[PASS] DELETE /api/v1/vendors/{vendor_id} successfully purged record.")

    print("=" * 70)
    print("ALL 10 VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
