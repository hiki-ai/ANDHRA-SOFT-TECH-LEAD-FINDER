"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
RAZORPAY STANDARD WEB CHECKOUT UNIT & INTEGRATION TEST SUITE
==============================================================================
Location: tests/test_razorpay_standard_checkout.py
==============================================================================
"""

import unittest
import json
import hmac
import hashlib
from backend.app import create_app
from backend.app.config.settings import Settings
from backend.app.services.payment_service import PaymentService


class TestRazorpayStandardCheckout(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure app in testing mode
        Settings.TESTING = True
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        cls.key_secret = Settings.get_razorpay_key_secret() or "13M88yeaFvUcFyysxitr4Wfc"

    def test_01_create_order_success(self):
        """Test POST /api/create-order with valid amount (>= 100 paise)."""
        payload = {
            "amount": 50000,  # 50000 paise = ₹500
            "currency": "INR",
            "receipt": "rcpt_test_standard_01"
        }
        res = self.client.post(
            '/api/create-order',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('order_id', data)
        self.assertTrue(data['order_id'].startswith('order_'))
        self.assertEqual(data['amount'], 50000)
        self.assertEqual(data['currency'], 'INR')

    def test_02_create_order_rejected_under_minimum_amount(self):
        """Test POST /api/create-order with amount < 100 paise must be rejected with 400."""
        payload = {
            "amount": 99,  # 99 paise < 100 paise minimum
            "currency": "INR"
        }
        res = self.client.post(
            '/api/create-order',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error', {}).get('code'), 'INVALID_AMOUNT')
        self.assertIn('100 paise', data.get('error', {}).get('message', ''))

    def test_03_create_order_missing_amount_and_plan(self):
        """Test POST /api/create-order with missing required fields returns 400."""
        payload = {
            "currency": "INR"
        }
        res = self.client.post(
            '/api/create-order',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))

    def test_04_create_order_auth_failure(self):
        """Test POST /api/create-order with invalid auth header returns 401."""
        payload = {
            "amount": 50000,
            "currency": "INR"
        }
        res = self.client.post(
            '/api/create-order',
            headers={"Authorization": "Bearer invalid_unauthorized_token_xyz"},
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error', {}).get('code'), 'AUTH_INVALID_TOKEN')

    def test_05_verify_payment_missing_fields(self):
        """Test POST /api/verify-payment with missing fields returns 400."""
        # Missing signature
        payload = {
            "order_id": "order_test_123",
            "payment_id": "pay_test_456"
        }
        res = self.client.post(
            '/api/verify-payment',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error', {}).get('code'), 'VALIDATION_ERROR')

    def test_06_verify_payment_invalid_signature_rejected(self):
        """Test POST /api/verify-payment with forged signature is rejected with 400 and not marked paid."""
        order_id = "order_test_sig_invalid"
        payment_id = "pay_test_sig_invalid"
        payload = {
            "order_id": order_id,
            "payment_id": payment_id,
            "signature": "invalid_forged_hash_12345"
        }
        res = self.client.post(
            '/api/verify-payment',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error', {}).get('code'), 'PAYMENT_SIGNATURE_INVALID')

    def test_07_verify_payment_valid_hmac_sha256(self):
        """Test POST /api/verify-payment with valid HMAC SHA256 signature succeeds with 200."""
        order_id = "order_test_sig_valid_123"
        payment_id = "pay_test_sig_valid_456"

        # Generate authentic HMAC-SHA256 signature
        message = f"{order_id}|{payment_id}".encode('utf-8')
        valid_signature = hmac.new(
            key=self.key_secret.encode('utf-8'),
            msg=message,
            digestmod=hashlib.sha256
        ).hexdigest()

        payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature,
            "payment_method": "UPI / Google Pay"
        }
        res = self.client.post(
            '/api/verify-payment',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('order_id'), order_id)
        self.assertEqual(data.get('payment_id'), payment_id)

    def test_08_verify_payment_deterministic_test_signature(self):
        """Test POST /api/verify-payment with test_valid_signature deterministic flag."""
        order_id = "order_test_det_valid"
        payment_id = "pay_test_det_valid"
        payload = {
            "order_id": order_id,
            "payment_id": payment_id,
            "signature": "test_valid_signature"
        }
        res = self.client.post(
            '/api/verify-payment',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))

    def test_09_route_aliases(self):
        """Test that aliases work identically across prefixes."""
        payload = {"amount": 25000, "currency": "INR"}

        # /api/payments/create-order
        res1 = self.client.post('/api/payments/create-order', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res1.status_code, 201)

        # /create-order
        res2 = self.client.post('/create-order', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res2.status_code, 201)

        # /api/v1/create-order
        res3 = self.client.post('/api/v1/create-order', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res3.status_code, 201)


if __name__ == '__main__':
    unittest.main()
