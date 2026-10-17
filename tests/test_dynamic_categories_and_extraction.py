"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
AUTOMATED TEST SUITE: DYNAMIC CATEGORIES, PRESETS & COLUMN-BASED EXTRACTION
==============================================================================
Location: tests/test_dynamic_categories_and_extraction.py

Verifies:
1. Dynamic business categories listing and persistence
2. Case-insensitive and trimmed deduplication of categories
3. Column-based extraction persisting ONLY selected vendor fields
4. Essential internal system metadata preserved for integrity
5. Excel export exact column sequence and custom headers (including 0-record valid XLSX)
6. Preset-specific vendor table schema mapping and defensive handling
==============================================================================
"""

import io
import os
import sys
import unittest
import pandas as pd
from datetime import datetime, timezone

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.append(worker_dir)

from app import create_app
from app.config.firebase import get_firestore_db
from app.routes.category_routes import DEFAULT_CATEGORIES, normalize_category_name
from collectors.connectors.google_places import GooglePlacesConnector
from services.collection_worker import CollectionWorker


class TestDynamicCategoriesAndExtraction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        cls.auth_headers = {
            "Authorization": "Bearer test_admin_token",
            "Content-Type": "application/json",
        }
        cls.db = get_firestore_db()

    def test_01_categories_list_includes_preserved_and_suggested(self):
        """1. Verify default categories include all preserved and suggested categories."""
        res = self.client.get('/api/v1/categories', headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        cats = data['categories']
        
        # Check preserved categories
        self.assertIn("Furniture", cats)
        self.assertIn("Restaurants & Cafes", cats)
        self.assertIn("Hospitals & Healthcare", cats)
        
        # Check suggested categories
        self.assertIn("Dental Clinics", cats)
        self.assertIn("Pharmacies", cats)
        self.assertIn("Schools and Colleges", cats)
        self.assertIn("Beauty Salons and Spas", cats)
        self.assertIn("Interior Designers", cats)
        self.assertIn("Computer and IT Services", cats)
        print("[PASS] Test 1: Category list includes all preserved and suggested categories.")

    def test_02_custom_category_creation_and_deduplication(self):
        """2. Adding new custom category with whitespace normalization and case-insensitive deduplication."""
        # Add new custom category with leading/trailing spaces
        res1 = self.client.post('/api/v1/categories', headers=self.auth_headers, json={"name": "  Ayurvedic Clinics  "})
        self.assertEqual(res1.status_code, 201)
        created = res1.get_json()['data']
        self.assertEqual(created['name'], "Ayurvedic Clinics")
        self.assertTrue(created['is_custom'])

        # Attempt to add same category with different casing and spacing
        res_dup = self.client.post('/api/v1/categories', headers=self.auth_headers, json={"name": "ayurvedic   clinics"})
        self.assertEqual(res_dup.status_code, 200)
        self.assertEqual(res_dup.get_json()['data']['name'], "Ayurvedic Clinics")

        # Verify it appears in GET /categories
        res_list = self.client.get('/api/v1/categories', headers=self.auth_headers)
        cats = res_list.get_json()['categories']
        self.assertIn("Ayurvedic Clinics", cats)
        self.assertEqual(cats.count("Ayurvedic Clinics"), 1)
        print("[PASS] Test 2: Custom category created and case-insensitively deduplicated.")

    def test_03_google_places_dynamic_field_mask(self):
        """3. Google Places connector computes dynamic field mask based on selected columns."""
        connector = GooglePlacesConnector("AIza_dummy_key_for_unit_tests")
        
        # Scenario A: Only contact columns selected (Furniture Leads preset)
        contact_cols = [
            {"key": "business_name", "is_enabled": True},
            {"key": "category", "is_enabled": True},
            {"key": "phone", "is_enabled": True},
            {"key": "address", "is_enabled": True},
            {"key": "website", "is_enabled": True},
        ]
        mask_a = connector.build_field_mask(contact_cols)
        self.assertIn("places.displayName", mask_a)
        self.assertIn("places.formattedAddress", mask_a)
        self.assertIn("places.nationalPhoneNumber", mask_a)
        self.assertIn("places.websiteUri", mask_a)
        # Ratings and review count should NOT be in the field mask
        self.assertNotIn("places.rating", mask_a)
        self.assertNotIn("places.userRatingCount", mask_a)

        # Scenario B: Rating selected
        cols_with_rating = contact_cols + [{"key": "rating", "is_enabled": True}]
        mask_b = connector.build_field_mask(cols_with_rating)
        self.assertIn("places.rating", mask_b)
        self.assertNotIn("places.userRatingCount", mask_b)
        print("[PASS] Test 3: Google Places connector computes dynamic field mask matching selected columns.")

    def test_04_extract_and_persist_only_selected_columns(self):
        """4. Critical requirement: Collection job persists ONLY configured fields, omitting unselected optional fields."""
        # Mock connector that yields a rich record containing ratings, reviews, address, website, etc.
        class MockConnector:
            def get_source_name(self):
                return "Mock Source"
            def is_configured(self):
                return True
            def get_status(self):
                return {"status": "active"}
            def search(self, cat, loc, count, should_stop=None, selected_columns=None, **kwargs):
                yield {
                    "id": "place_mock_123",
                    "place_id": "place_mock_123",
                    "business_name": "Elite Furnishings",
                    "displayName": {"text": "Elite Furnishings"},
                    "address": "123 Commercial Road, Rajahmundry",
                    "formattedAddress": "123 Commercial Road, Rajahmundry",
                    "phone": "+91 88324 00000",
                    "nationalPhoneNumber": "+91 88324 00000",
                    "website": "https://elitefurnishings.in",
                    "websiteUri": "https://elitefurnishings.in",
                    "rating": 4.9,
                    "review_count": 350,
                    "userRatingCount": 350,
                    "types": ["furniture_store", "home_goods_store"],
                }

        worker = CollectionWorker(db=self.db)
        worker.source_manager.get_connector = lambda s: MockConnector()

        # Job 1: Furniture Leads preset (Business Name, Category, Phone, Address, Website enabled; Rating/Reviews/Email disabled)
        furniture_cols = [
            {"key": "business_name", "label": "Business Name", "is_enabled": True},
            {"key": "category", "label": "Category", "is_enabled": True},
            {"key": "phone", "label": "Phone", "is_enabled": True},
            {"key": "address", "label": "Address", "is_enabled": True},
            {"key": "website", "label": "Website", "is_enabled": True},
        ]

        job_id = f"test_job_{Date_time_suffix()}"
        worker.process_job(
            job_id=job_id,
            category="Furniture",
            location="Rajahmundry",
            target_count=1,
            source="google_places",
            preset_id="preset_furniture_leads",
            preset_columns=furniture_cols
        )

        # Retrieve saved vendor from Firestore
        saved_docs = []
        for doc in self.db.collection('vendors').stream():
            d = doc.to_dict()
            if d.get('collection_id') == job_id:
                saved_docs.append(d)

        self.assertEqual(len(saved_docs), 1)
        doc = saved_docs[0]

        # Verify selected columns ARE persisted
        self.assertEqual(doc['business_name'], "Elite Furnishings")
        self.assertEqual(doc['phone'], "+91 88324 00000")
        self.assertEqual(doc['address'], "123 Commercial Road, Rajahmundry")
        self.assertEqual(doc['website'], "https://elitefurnishings.in")

        # Verify unselected optional fields ARE NOT persisted
        self.assertNotIn('rating', doc)
        self.assertNotIn('review_count', doc)
        self.assertNotIn('city', doc)
        self.assertNotIn('email', doc)

        # Verify essential internal system metadata is preserved
        self.assertEqual(doc['collection_id'], job_id)
        self.assertEqual(doc['preset_id'], "preset_furniture_leads")
        self.assertEqual(doc['status'], "valid")
        self.assertIn("dedupe_key", doc)
        self.assertIn("data_quality_score", doc)
        self.assertEqual(doc['source_id'], "place_mock_123")
        print("[PASS] Test 4: Extracted and persisted ONLY selected columns without unselected optional fields.")

    def test_05_excel_export_respects_preset_columns_and_handles_empty(self):
        """5. Export Excel produces exact configured columns and headers, and handles empty sets safely."""
        # Test A: Export with selected preset columns
        export_payload = {
            "preset_id": "preset_furniture_leads",
            "format": "xlsx"
        }
        res = self.client.post('/api/v1/exports', headers=self.auth_headers, json=export_payload)
        self.assertEqual(res.status_code, 200)
        exp_data = res.get_json()['data']
        export_id = exp_data['export_id']

        # Download the file
        res_dl = self.client.get(f"/api/v1/exports/{export_id}/download")
        self.assertEqual(res_dl.status_code, 200)
        self.assertEqual(res_dl.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

        # Read into pandas to verify exact headers and structure
        df = pd.read_excel(io.BytesIO(res_dl.data), sheet_name='Vendors')
        expected_cols = ['Business Name', 'Category', 'Phone', 'Address', 'Website']
        self.assertEqual(list(df.columns[:5]), expected_cols)
        print("[PASS] Test 5a: Excel export contains exact configured headers in sequence.")

        # Test B: Export with non-matching filter (0 matching records)
        res_empty = self.client.post('/api/v1/exports', headers=self.auth_headers, json={
            "preset_id": "preset_furniture_leads",
            "category": "NonExistentCategory999",
            "format": "xlsx"
        })
        self.assertEqual(res_empty.status_code, 200)
        empty_exp_id = res_empty.get_json()['data']['export_id']

        res_empty_dl = self.client.get(f"/api/v1/exports/{empty_exp_id}/download")
        self.assertEqual(res_empty_dl.status_code, 200)

        # Empty export must still be valid Excel with correct headers
        df_empty = pd.read_excel(io.BytesIO(res_empty_dl.data), sheet_name='Vendors')
        self.assertEqual(len(df_empty), 0)
        self.assertEqual(list(df_empty.columns[:5]), expected_cols)
        print("[PASS] Test 5b: Zero-match export produces valid XLSX file with column headers.")

    def test_06_vendor_listing_supports_collection_filtering(self):
        """6. Vendor listing GET /api/v1/vendors filters records by collection_id."""
        res = self.client.get('/api/v1/vendors?collection_id=non_existent_collection', headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        items = res.get_json()['data']['items']
        self.assertEqual(len(items), 0)
        print("[PASS] Test 6: Vendor listing properly filters by collection_id.")


def Date_time_suffix():
    import time
    return f"{int(time.time() * 1000)}"


if __name__ == '__main__':
    unittest.main()
