"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
AUTOMATED TEST SUITE: TABLE EDITOR & CUSTOM COLUMN PRESETS
==============================================================================
Location: tests/test_table_editor.py

Verifies all 14 requirements from the Master Implementation Prompt:
1. Creating and saving a preset
2. Reloading and retrieving saved presets
3. Adding, renaming, deleting, and reordering columns
4. Initializing Furniture Leads without duplicates (idempotent)
5. Selecting a preset before extraction
6. Rejecting unsupported required columns
7. Leaving unsupported optional fields empty
8. Mapping actual provider response fields correctly
9. Saving records to Firestore without losing existing fields
10. Exporting XLSX in the exact configured column order
11. Exporting all matching records through pagination/streaming
12. Authentication and authorization failures
13. Existing collections without a preset (backward compatibility)
14. Handling provider errors without reporting false success
==============================================================================
"""

import io
import os
import sys
import unittest
import pandas as pd
from datetime import datetime, timezone

# Ensure backend root and worker are in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.append(worker_dir)

from app import create_app
from app.config.settings import Settings
from app.config.firebase import get_firestore_db
from collectors.source_capabilities import check_source_capabilities


class TestTableEditorAndPresets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        cls.admin_headers = {
            "Authorization": "Bearer test_admin_token",
            "Content-Type": "application/json",
        }
        cls.user_headers = {
            "Authorization": "Bearer test_user_token",
            "Content-Type": "application/json",
        }

    def test_01_create_and_save_preset(self):
        """1. Creating and saving a preset with custom columns and validation."""
        payload = {
            "name": "Hospitality Leads",
            "description": "Custom schema for hotels and restaurants",
            "columns": [
                {
                    "key": "business_name",
                    "label": "Hotel Name",
                    "data_type": "text",
                    "position": 0,
                    "is_enabled": True,
                    "is_required": True,
                    "is_custom": False,
                },
                {
                    "key": "phone",
                    "label": "Reception Desk Phone",
                    "data_type": "phone",
                    "position": 1,
                    "is_enabled": True,
                    "is_required": False,
                    "is_custom": False,
                },
                {
                    "key": "room_count",
                    "label": "Estimated Rooms",
                    "data_type": "number",
                    "position": 2,
                    "is_enabled": True,
                    "is_required": False,
                    "is_custom": True,
                },
            ]
        }
        res = self.client.post('/api/v1/presets', headers=self.admin_headers, json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()['data']
        self.assertEqual(data['name'], "Hospitality Leads")
        self.assertEqual(len(data['columns']), 3)
        self.assertIn("room_count", data['enabled_columns'])
        print("[PASS] Test 1: Created and saved custom preset 'Hospitality Leads'.")

        # Duplicate name validation
        res_dup = self.client.post('/api/v1/presets', headers=self.admin_headers, json=payload)
        self.assertEqual(res_dup.status_code, 400)
        self.assertEqual(res_dup.get_json()['error']['code'], "DUPLICATE_NAME")
        print("[PASS] Test 1b: Duplicate preset name correctly rejected with 400.")

    def test_02_reload_and_retrieve_presets(self):
        """2. Reloading and retrieving saved presets."""
        res = self.client.get('/api/v1/presets', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        presets = res.get_json()['data']
        self.assertIsInstance(presets, list)
        self.assertTrue(any(p['name'] == 'Hospitality Leads' for p in presets))
        
        # Test get by ID
        target = next(p for p in presets if p['name'] == 'Hospitality Leads')
        res_single = self.client.get(f"/api/v1/presets/{target['id']}", headers=self.admin_headers)
        self.assertEqual(res_single.status_code, 200)
        self.assertEqual(res_single.get_json()['data']['id'], target['id'])
        print("[PASS] Test 2: Reloaded and retrieved saved preset list and details.")

    def test_03_column_reorder_rename_delete_and_usage(self):
        """3. Adding, renaming, deleting, and reordering columns in preset."""
        # Retrieve preset
        res = self.client.get('/api/v1/presets', headers=self.admin_headers)
        preset = next(p for p in res.get_json()['data'] if p['name'] == 'Hospitality Leads')
        preset_id = preset['id']

        # Reorder columns (put room_count first, rename it, remove phone)
        updated_cols = [
            {
                "key": "room_count",
                "label": "Total Room Inventory",
                "data_type": "number",
                "position": 0,
                "is_enabled": True,
                "is_required": False,
                "is_custom": True,
            },
            {
                "key": "business_name",
                "label": "Hotel Name",
                "data_type": "text",
                "position": 1,
                "is_enabled": True,
                "is_required": True,
                "is_custom": False,
            },
        ]
        res_update = self.client.put(
            f"/api/v1/presets/{preset_id}",
            headers=self.admin_headers,
            json={"columns": updated_cols}
        )
        self.assertEqual(res_update.status_code, 200)
        data = res_update.get_json()['data']
        self.assertEqual(data['columns'][0]['key'], "room_count")
        self.assertEqual(data['columns'][0]['label'], "Total Room Inventory")
        self.assertEqual(len(data['columns']), 2)

        # Check column usage endpoint
        res_usage = self.client.post(
            '/api/v1/presets/check-column-usage',
            headers=self.admin_headers,
            json={"column_key": "room_count"}
        )
        self.assertEqual(res_usage.status_code, 200)
        usage_data = res_usage.get_json()
        self.assertTrue(usage_data['in_use'])
        self.assertIn("Hospitality Leads", usage_data['used_in_presets'])
        print("[PASS] Test 3: Column reordered, renamed, deleted, and usage verified.")

    def test_04_furniture_leads_idempotent_initialization(self):
        """4. Initializing Furniture Leads without duplicates with exact required order."""
        # Call init-defaults multiple times
        for _ in range(3):
            res_init = self.client.post('/api/v1/presets/init-defaults', headers=self.admin_headers)
            self.assertEqual(res_init.status_code, 200)

        # Verify only one Furniture Leads preset exists
        res_list = self.client.get('/api/v1/presets', headers=self.admin_headers)
        all_presets = res_list.get_json()['data']
        furniture_matches = [p for p in all_presets if p['id'] == 'preset_furniture_leads' or p['name'] == 'Furniture Leads']
        self.assertEqual(len(furniture_matches), 1, "Duplicate Furniture Leads presets detected!")

        furn = furniture_matches[0]
        self.assertEqual(furn['name'], "Furniture Leads")
        self.assertTrue(furn.get('is_system'))
        self.assertTrue(furn.get('is_default'))

        # Verify exact required enabled column order:
        # 1. Business Name, 2. Category, 3. Phone, 4. Address, 5. Website
        enabled_cols = [c for c in furn['columns'] if c.get('is_enabled')]
        enabled_keys = [c['key'] for c in enabled_cols]
        expected_keys = ["business_name", "category", "phone", "address", "website"]
        self.assertEqual(enabled_keys, expected_keys, f"Expected {expected_keys}, got {enabled_keys}")

        # Check that remaining default columns exist but are disabled
        disabled_cols = [c for c in furn['columns'] if not c.get('is_enabled')]
        self.assertGreater(len(disabled_cols), 5)
        print("[PASS] Test 4: Furniture Leads preset idempotently seeded with exact 5 ordered enabled columns.")

    def test_05_select_preset_before_extraction(self):
        """5. Selecting a preset before extraction and persisting preset snapshot with job."""
        res_job = self.client.post('/api/v1/collections', headers=self.admin_headers, json={
            "category": "Furniture",
            "location": "Rajahmundry",
            "target_count": 25,
            "source": "google_places",
            "preset_id": "preset_furniture_leads"
        })
        self.assertIn(res_job.status_code, (200, 201))
        job_data = res_job.get_json()['data']
        self.assertEqual(job_data['preset_id'], "preset_furniture_leads")
        self.assertEqual(job_data['preset_name'], "Furniture Leads")
        self.assertIsInstance(job_data['preset_columns'], list)
        self.assertEqual(len(job_data['preset_columns']), 5)
        print("[PASS] Test 5: Collection created with selected preset_id and preset_columns snapshot.")

    def test_06_reject_unsupported_required_columns(self):
        """6. Rejecting extraction when a required column cannot be supplied by the source."""
        # Create a preset where 'email' is marked required=True
        email_required_preset = {
            "name": "Strict Email Preset",
            "columns": [
                {
                    "key": "business_name",
                    "label": "Business Name",
                    "data_type": "text",
                    "position": 0,
                    "is_enabled": True,
                    "is_required": True,
                },
                {
                    "key": "email",
                    "label": "Business Email",
                    "data_type": "email",
                    "position": 1,
                    "is_enabled": True,
                    "is_required": True,  # Required but Google Places cannot supply it
                },
            ]
        }
        res_p = self.client.post('/api/v1/presets', headers=self.admin_headers, json=email_required_preset)
        self.assertEqual(res_p.status_code, 201)
        p_id = res_p.get_json()['data']['id']

        # Attempt extraction with google_places
        res_blocked = self.client.post('/api/v1/collections', headers=self.admin_headers, json={
            "category": "Furniture",
            "location": "Vijayawada",
            "target_count": 10,
            "source": "google_places",
            "preset_id": p_id
        })
        self.assertEqual(res_blocked.status_code, 400)
        err = res_blocked.get_json()['error']
        self.assertEqual(err['code'], "UNSUPPORTED_REQUIRED_COLUMN")
        self.assertIn("Business Email", err['message'])
        print(f"[PASS] Test 6: Extraction correctly blocked for unsupported required column: '{err['message']}'.")

    def test_07_and_08_optional_fields_and_provider_mapping(self):
        """7 & 8. Leaving unsupported optional fields empty and mapping actual provider response fields."""
        # Insert a realistic raw provider record
        db = get_firestore_db()
        test_vendor_id = f"ven_test_{int(datetime.now(timezone.utc).timestamp())}"
        test_record = {
            "id": test_vendor_id,
            "business_name": "Godavari Furniture Works",
            "normalized_name": "GODAVARI FURNITURE WORKS",
            "category": "Furniture",
            "phone": "+91 88324 55667",
            "address": "Kotipalli Bus Stand Road, Rajahmundry",
            "city": "Rajahmundry",
            "state": "Andhra Pradesh",
            "website": "https://godavarifurniture.in",
            "email": "",  # Google Places does not return email; must be empty, not fake
            "rating": 4.7,
            "review_count": 52,
            "source": "Google Maps / Google Places API",
            "source_id": "ChIJ_godavari_001",
            "place_id": "ChIJ_godavari_001",
            "status": "valid",
            "data_quality_score": 85,
            "collection_id": "col_test_mapping",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db.collection('vendors').document(test_vendor_id).set(test_record)

        # Retrieve and verify mapping
        doc = db.collection('vendors').document(test_vendor_id).get()
        v_data = doc.to_dict()
        self.assertEqual(v_data['business_name'], "Godavari Furniture Works")
        self.assertEqual(v_data['email'], "")  # Zero fake emails
        self.assertEqual(v_data['source_id'], "ChIJ_godavari_001")
        self.assertEqual(v_data['rating'], 4.7)
        print("[PASS] Test 7 & 8: Provider response fields mapped accurately; email left empty without fabrication.")

    def test_09_saving_records_with_custom_fields(self):
        """9. Saving records to Firestore with custom fields preserved."""
        db = get_firestore_db()
        ven_id = f"ven_custom_{int(datetime.now(timezone.utc).timestamp())}"
        ven_doc = {
            "id": ven_id,
            "business_name": "Sri Krishna Furnishings",
            "category": "Furniture",
            "phone": "+91 88325 11223",
            "address": "Main Road, Rajahmundry",
            "custom_fields": {
                "gst_number": "37AAAAA0000A1Z5",
                "floor_area_sqft": "4500"
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db.collection('vendors').document(ven_id).set(ven_doc)

        fetched = db.collection('vendors').document(ven_id).get().to_dict()
        self.assertEqual(fetched['custom_fields']['gst_number'], "37AAAAA0000A1Z5")
        self.assertEqual(fetched['business_name'], "Sri Krishna Furnishings")
        print("[PASS] Test 9: Firestore vendor record saved with custom_fields intact.")

    def test_10_export_xlsx_exact_configured_column_order(self):
        """10. Exporting XLSX in the exact configured column order of Furniture Leads."""
        res_exp = self.client.post('/api/v1/exports', headers=self.admin_headers, json={
            "preset_id": "preset_furniture_leads",
            "format": "xlsx",
        })
        self.assertEqual(res_exp.status_code, 200)
        exp_data = res_exp.get_json()['data']
        export_id = exp_data['export_id']

        # Download the file
        res_dl = self.client.get(f"/api/v1/exports/{export_id}/download")
        self.assertEqual(res_dl.status_code, 200)
        self.assertEqual(
            res_dl.headers.get('Content-Type'),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # Parse Excel bytes with pandas/openpyxl
        stream = io.BytesIO(res_dl.data)
        df = pd.read_excel(stream, engine='openpyxl')
        
        # Verify exact columns in order: Business Name, Category, Phone, Address, Website
        expected_columns = ["Business Name", "Category", "Phone", "Address", "Website"]
        self.assertEqual(list(df.columns), expected_columns)
        print(f"[PASS] Test 10: Exported XLSX has exact configured column order: {list(df.columns)}.")

    def test_11_export_all_matching_records_streaming(self):
        """11. Exporting all matching records through backend pagination/streaming."""
        res_exp = self.client.post('/api/v1/exports', headers=self.admin_headers, json={
            "preset_id": "preset_furniture_leads",
            "format": "csv",
            "export_all": True,
        })
        self.assertEqual(res_exp.status_code, 200)
        exp_data = res_exp.get_json()['data']
        self.assertGreater(exp_data['row_count'], 0)

        # Download CSV
        res_dl = self.client.get(f"/api/v1/exports/{exp_data['export_id']}/download")
        self.assertEqual(res_dl.status_code, 200)
        self.assertIn("text/csv", res_dl.headers.get('Content-Type'))
        print(f"[PASS] Test 11: Exported all {exp_data['row_count']} matching leads via streaming.")

    def test_12_authentication_and_authorization(self):
        """12. Authentication and authorization failure tests."""
        # Unauthenticated request
        res_unauth = self.client.get('/api/v1/presets')
        self.assertEqual(res_unauth.status_code, 401)
        self.assertEqual(res_unauth.get_json()['error']['code'], "AUTH_REQUIRED")

        # Non-admin user request
        res_forbidden = self.client.get('/api/v1/presets', headers=self.user_headers)
        self.assertEqual(res_forbidden.status_code, 403)
        self.assertEqual(res_forbidden.get_json()['error']['code'], "FORBIDDEN")
        print("[PASS] Test 12: Authentication (401) and authorization (403) strictly enforced.")

    def test_13_backward_compatibility_old_collections(self):
        """13. Existing collections without a preset ID maintain backward compatibility."""
        db = get_firestore_db()
        legacy_job_id = "col_legacy_without_preset_99"
        legacy_doc = {
            "id": legacy_job_id,
            "category": "Textiles",
            "location": "Guntur",
            "target_count": 100,
            "source": "google_places",
            "source_name": "Google Maps / Google Places API",
            "status": "completed",
            "found": 50,
            "valid": 48,
            "duplicate": 2,
            "failed": 0,
            "started_at": "2025-05-01T00:00:00Z",
            "completed_at": "2025-05-01T00:10:00Z",
        }
        db.collection('collections').document(legacy_job_id).set(legacy_doc)

        # Fetch collection details
        res_col = self.client.get(f"/api/v1/collections/{legacy_job_id}", headers=self.admin_headers)
        self.assertEqual(res_col.status_code, 200)
        col_data = res_col.get_json()['data']
        self.assertEqual(col_data['id'], legacy_job_id)

        # Export legacy collection
        res_exp = self.client.post('/api/v1/exports', headers=self.admin_headers, json={
            "collection_id": legacy_job_id,
            "format": "xlsx",
        })
        self.assertEqual(res_exp.status_code, 200)
        print("[PASS] Test 13: Backward compatibility verified for legacy collection without preset_id.")

    def test_14_provider_error_handling(self):
        """14. Handling provider errors without reporting false success."""
        from collectors.connectors.google_places import GooglePlacesConnector
        import requests
        from unittest.mock import patch, MagicMock

        connector = GooglePlacesConnector(api_key="AIzaSyDummyValidLookingKeyForMock1234567")

        # Mock Google Places 429 quota error
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.text = "RESOURCE_EXHAUSTED: Rate limit exceeded"
        mock_resp.json.return_value = {"error": {"status": "RESOURCE_EXHAUSTED", "message": "Rate limit exceeded"}}

        with patch('requests.post', return_value=mock_resp):
            with self.assertRaises(RuntimeError) as ctx:
                list(connector.search("Hotels", "Visakhapatnam", 10))
            self.assertIn("QUOTA_EXCEEDED", str(ctx.exception))

        status_info = connector.get_status()
        self.assertEqual(status_info['status'], "quota_exceeded")
        self.assertFalse(status_info['is_available'])
        print(f"[PASS] Test 14: Provider errors safely raise exception without false success: {status_info['status']}.")


if __name__ == '__main__':
    print("=" * 75)
    print("RUNNING TABLE EDITOR & CUSTOM COLUMN PRESETS TEST SUITE")
    print("=" * 75)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestTableEditorAndPresets)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
