"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
E2E EXCEL/CSV IMPORT, FIRESTORE STORAGE, AND EXCEL DOWNLOAD TEST SUITE
==============================================================================
Tests:
1. CSV and Excel (.xlsx) file upload and pre-scan preview with metrics
   (detected_rows, valid_rows, duplicate_rows, invalid_rows).
2. Auto-column mapping detection + custom column preservation.
3. Import execution creating collection document in Firestore 'collections'
   with user_id, telemetry, preset_columns, and 'completed' status.
4. Lead records stored in 'vendors' with matching collection_id and custom_fields.
5. Verification of collection listing and vendor retrieval by collection_id.
6. Real Excel (.xlsx) file generation and binary download with custom columns.
7. Deduplication option (skip_duplicates=True vs False).
==============================================================================
"""

import io
import json
import os
import sys
import unittest
import pandas as pd
import openpyxl

# Add backend and worker to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.append(worker_dir)

from app import create_app
from app.config.firebase import get_firestore_db


class TestExcelImportExportE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        cls.admin_token = "test_admin_token"
        cls.admin_headers = {
            "Authorization": f"Bearer {cls.admin_token}",
            "X-User-Role": "admin",
            "X-User-Id": "test_admin_uid"
        }

    def test_01_csv_import_preview(self):
        """Test CSV pre-scan preview endpoint with standard & custom fields."""
        csv_data = (
            "Company Name,Mobile Phone,City,Email Address,Industry,Employee Count\n"
            "Tech Solutions,9876543210,Hyderabad,info@techsolutions.com,Software,150\n"
            "Tech Solutions,9876543210,Hyderabad,duplicate@techsolutions.com,Software,150\n" # Duplicate name+phone
            ",,,,\n" # Blank/invalid row
            "Coastal Marine,9123456780,Visakhapatnam,contact@coastal.in,Shipping,45\n"
        ).encode('utf-8')

        data = {
            'file': (io.BytesIO(csv_data), 'b2b_leads.csv')
        }
        res = self.client.post('/api/v1/imports/preview',
                               headers=self.admin_headers,
                               data=data,
                               content_type='multipart/form-data')
        self.assertEqual(res.status_code, 200, f"Preview failed: {res.data}")
        resp = res.get_json()
        self.assertTrue(resp.get('success'))
        d = resp['data']
        self.assertEqual(d['detected_rows'], 4)
        self.assertEqual(d['valid_rows'], 2)
        self.assertEqual(d['duplicate_rows'], 1)
        self.assertEqual(d['invalid_rows'], 1)
        self.assertIn('Company Name', d['detected_columns'])
        self.assertIn('Industry', d['detected_columns'])
        # Mapping checks
        mapping = d['suggested_mapping']
        self.assertEqual(mapping.get('Company Name'), 'business_name')
        self.assertEqual(mapping.get('Mobile Phone'), 'phone')
        self.assertEqual(mapping.get('Email Address'), 'email')
        self.assertEqual(mapping.get('City'), 'city')
        self.assertEqual(mapping.get('Industry'), 'category')
        self.assertEqual(mapping.get('Employee Count'), '__custom__')
        self.assertEqual(d['suggested_collection_name'], 'Imported - b2b_leads')
        print("\n[PASS] 1. CSV pre-scan preview returned accurate metrics & mappings.")

    def test_02_excel_xlsx_import_preview(self):
        """Test real Excel (.xlsx) upload and preview generation."""
        # Create an in-memory .xlsx file using pandas/openpyxl
        df = pd.DataFrame([
            {"Hospital Name": "Apollo Clinic", "Phone": "04011223344", "Location": "Hyderabad", "Specialty": "Cardiology"},
            {"Hospital Name": "Care Hospital", "Phone": "04055667788", "Location": "Banjara Hills", "Specialty": "Neurology"},
            {"Hospital Name": "KIMS", "Phone": "04099887766", "Location": "Secunderabad", "Specialty": "Orthopedics"}
        ])
        xlsx_buffer = io.BytesIO()
        df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
        xlsx_buffer.seek(0)

        data = {
            'file': (xlsx_buffer, 'Andhra_Hospitals.xlsx')
        }
        res = self.client.post('/api/v1/imports/preview',
                               headers=self.admin_headers,
                               data=data,
                               content_type='multipart/form-data')
        self.assertEqual(res.status_code, 200)
        d = res.get_json()['data']
        self.assertEqual(d['detected_rows'], 3)
        self.assertEqual(d['valid_rows'], 3)
        self.assertEqual(d['duplicate_rows'], 0)
        self.assertEqual(d['suggested_collection_name'], 'Imported - Andhra_Hospitals')
        print("[PASS] 2. Excel (.xlsx) upload parsed and pre-scanned successfully.")

    def test_03_execute_import_creates_collection_and_vendors(self):
        """Test full import execution: collection doc created in 'collections' & leads stored in 'vendors'."""
        csv_data = (
            "Business Name,Phone,Email,City,Industry,Custom Rank\n"
            "Delta Agro,9848011223,sales@deltaagro.in,Vijayawada,Agriculture,A+\n"
            "Godavari Rice Mill,9848099887,info@godavaririce.com,Bhimavaram,Processing,A\n"
            "Krishna Spices,9848055443,contact@krishnaspices.com,Guntur,Spices,B+\n"
        ).encode('utf-8')

        mapping = {
            "Business Name": "business_name",
            "Phone": "phone",
            "Email": "email",
            "City": "city",
            "Industry": "custom_Industry",
            "Custom Rank": "custom_Custom Rank"
        }

        data = {
            'file': (io.BytesIO(csv_data), 'agri_leads.csv'),
            'collection_name': 'AP Agri Exporters 2026',
            'mapping': json.dumps(mapping),
            'skip_duplicates': 'true'
        }

        res = self.client.post('/api/v1/imports',
                               headers=self.admin_headers,
                               data=data,
                               content_type='multipart/form-data')
        self.assertEqual(res.status_code, 200)
        result = res.get_json()['data']
        self.assertEqual(result['inserted'], 3)
        self.assertIn('collection_id', result)
        col_id = result['collection_id']
        self.assertTrue(col_id.startswith('col_'))

        # Verify collection exists in Firestore collections
        db = get_firestore_db()
        col_doc = db.collection('collections').document(col_id).get()
        self.assertTrue(col_doc.exists, f"Collection document {col_id} not found in Firestore!")
        cdata = col_doc.to_dict()
        self.assertEqual(cdata.get('category'), 'AP Agri Exporters 2026')
        self.assertEqual(cdata.get('source'), 'excel_import')
        self.assertEqual(cdata.get('status'), 'completed')
        self.assertEqual(cdata.get('found'), 3)
        self.assertEqual(cdata.get('valid'), 3)
        preset_labels = [p.get('label') for p in cdata.get('preset_columns', [])]
        self.assertIn('Industry', preset_labels)
        self.assertIn('Custom Rank', preset_labels)

        # Verify vendors exist with collection_id
        v_res = self.client.get(f'/api/v1/vendors?collection_id={col_id}', headers=self.admin_headers)
        self.assertEqual(v_res.status_code, 200)
        vendors = v_res.get_json()['data']['items']
        self.assertEqual(len(vendors), 3)
        names = [v.get('business_name') for v in vendors]
        self.assertIn('Delta Agro', names)
        self.assertIn('Godavari Rice Mill', names)
        self.assertIn('Krishna Spices', names)

        # Verify custom fields are stored
        v1 = next(v for v in vendors if v['business_name'] == 'Delta Agro')
        self.assertEqual(v1.get('Industry'), 'Agriculture')
        self.assertEqual(v1.get('custom_fields', {}).get('Industry'), 'Agriculture')

        print(f"[PASS] 3. Import executed: collection '{col_id}' created with status=completed and 3 vendor records.")

    def test_04_excel_export_download_with_custom_fields(self):
        """Test exporting collection leads to a real .xlsx file and downloading it."""
        # First import a collection
        csv_data = (
            "Business Name,Phone,Email,City,Rating,Export Custom Field\n"
            "Vizag Steel Exporters,9888811111,export@vizagsteel.in,Visakhapatnam,4.8,Special Grade\n"
            "Kakinada Port Logistics,9888822222,info@kakinadaport.in,Kakinada,4.6,Marine Transit\n"
        ).encode('utf-8')
        mapping = {
            "Business Name": "business_name",
            "Phone": "phone",
            "Email": "email",
            "City": "city",
            "Rating": "rating",
            "Export Custom Field": "custom_Export Custom Field"
        }
        res_imp = self.client.post('/api/v1/imports',
                                   headers=self.admin_headers,
                                   data={
                                       'file': (io.BytesIO(csv_data), 'ports_and_steel.csv'),
                                       'collection_name': 'Ports and Steel',
                                       'mapping': json.dumps(mapping)
                                   },
                                   content_type='multipart/form-data')
        self.assertEqual(res_imp.status_code, 200)
        col_id = res_imp.get_json()['data']['collection_id']

        # Request XLSX export for this collection
        exp_payload = {
            "collection_id": col_id,
            "format": "xlsx"
        }
        res_exp = self.client.post('/api/v1/exports', headers=self.admin_headers, json=exp_payload)
        self.assertEqual(res_exp.status_code, 200)
        exp_data = res_exp.get_json()['data']
        dl_url = exp_data['download_url']
        filename = exp_data['filename']
        self.assertTrue(filename.endswith('.xlsx'))
        self.assertIn('AST_Ports_and_Steel', filename)

        # Download the file
        res_dl = self.client.get(dl_url)
        self.assertEqual(res_dl.status_code, 200)
        self.assertGreater(len(res_dl.data), 0)
        self.assertIn('spreadsheet', res_dl.content_type)

        # Verify it's a real valid openpyxl workbook
        wb = openpyxl.load_workbook(io.BytesIO(res_dl.data))
        sheet = wb.active
        headers = [cell.value for cell in sheet[1]]
        self.assertIn('Business Name', headers)
        self.assertIn('Phone', headers)
        self.assertIn('Export Custom Field', headers)

        # Check rows
        rows = list(sheet.iter_rows(values_only=True))
        self.assertEqual(len(rows), 3) # Header + 2 data rows
        print(f"[PASS] 4. Collection export generated valid .xlsx workbook with custom fields ({len(res_dl.data)} bytes).")

    def test_05_deduplication_toggle(self):
        """Test skip_duplicates=False vs skip_duplicates=True during import."""
        # Two rows with identical business name & phone
        csv_data = (
            "Business Name,Phone,City\n"
            "Twin Enterprises,0891234567,Vizag\n"
            "Twin Enterprises,0891234567,Vizag\n"
        ).encode('utf-8')

        mapping = {"Business Name": "business_name", "Phone": "phone", "City": "city"}

        # 1. With skip_duplicates = True
        res_skip = self.client.post('/api/v1/imports',
                                    headers=self.admin_headers,
                                    data={
                                        'file': (io.BytesIO(csv_data), 'twins_skip.csv'),
                                        'collection_name': 'Twins Skip',
                                        'mapping': json.dumps(mapping),
                                        'skip_duplicates': 'true'
                                    },
                                    content_type='multipart/form-data')
        self.assertEqual(res_skip.status_code, 200)
        self.assertEqual(res_skip.get_json()['data']['inserted'], 1)
        self.assertEqual(res_skip.get_json()['data']['duplicate'], 1)

        # 2. With skip_duplicates = False
        res_all = self.client.post('/api/v1/imports',
                                   headers=self.admin_headers,
                                   data={
                                       'file': (io.BytesIO(csv_data), 'twins_all.csv'),
                                       'collection_name': 'Twins All',
                                       'mapping': json.dumps(mapping),
                                       'skip_duplicates': 'false'
                                   },
                                   content_type='multipart/form-data')
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(res_all.get_json()['data']['inserted'], 2)
        print("[PASS] 5. Deduplication toggle strictly verified (skip_duplicates=True vs False).")

    def test_06_invalid_and_empty_file_handling(self):
        """Test rejection of unsupported file formats and empty files."""
        # 1. Unsupported extension
        txt_data = b"Some random text data"
        res_txt = self.client.post('/api/v1/imports/preview',
                                   headers=self.admin_headers,
                                   data={'file': (io.BytesIO(txt_data), 'data.txt')},
                                   content_type='multipart/form-data')
        self.assertEqual(res_txt.status_code, 400)
        self.assertIn("INVALID_FORMAT", res_txt.get_data(as_text=True))

        # 2. Zero byte file
        res_empty = self.client.post('/api/v1/imports/preview',
                                     headers=self.admin_headers,
                                     data={'file': (io.BytesIO(b""), 'empty.csv')},
                                     content_type='multipart/form-data')
        self.assertEqual(res_empty.status_code, 400)
        self.assertIn("PARSE_ERROR", res_empty.get_data(as_text=True))

        # 3. CSV with headers but no data rows
        res_no_data = self.client.post('/api/v1/imports/preview',
                                       headers=self.admin_headers,
                                       data={'file': (io.BytesIO(b"Name,Phone,City\n"), 'no_data.csv')},
                                       content_type='multipart/form-data')
        self.assertEqual(res_no_data.status_code, 400)
        self.assertIn("EMPTY_FILE", res_no_data.get_data(as_text=True))
        print("[PASS] 6. Unsupported formats, zero-byte files, and empty data sheets rejected with clear diagnostics.")


if __name__ == '__main__':
    unittest.main()
