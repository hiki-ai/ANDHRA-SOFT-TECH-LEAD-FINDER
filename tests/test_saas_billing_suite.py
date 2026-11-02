"""
==============================================================================
ANDHRA SOFT TECH — AST EXTRACTOR
SAAS SUBSCRIPTIONS, PRICING, TRIAL & RAZORPAY VERIFICATION SUITE
==============================================================================
Location: tests/test_saas_billing_suite.py

Automated test suite verifying:
- Public 3 pricing plans dynamic loading and paise formatting
- Free Trial lifecycle (30 unique records, atomic deduplication, completion)
- Razorpay order creation, signature verification, and subscription activation
- Customer isolation & role-based access control (RBAC)
- Admin billing management, pricing edits, and revenue analytics
==============================================================================
"""

import os
import sys
import json
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
worker_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker'))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if worker_dir not in sys.path:
    sys.path.append(worker_dir)

from app import create_app
from app.config.settings import Settings
from app.services.trial_service import TrialService
from app.services.payment_service import PaymentService


class TestSaaSBillingSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        cls.admin_headers = {
            "Authorization": "Bearer test_admin_token",
            "Content-Type": "application/json"
        }
        cls.user_headers = {
            "Authorization": "Bearer test_user_token",
            "Content-Type": "application/json"
        }
        cls.user2_headers = {
            "Authorization": "Bearer test_user_2_token",
            "Content-Type": "application/json"
        }

    # -------------------------------------------------------------------------
    # PART 2 & 3: Public Pricing Plans & Settings
    # -------------------------------------------------------------------------
    def test_01_public_plans_and_settings(self):
        # Test GET /api/plans
        res = self.client.get('/api/plans')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        plans = data.get('data', [])
        self.assertEqual(len(plans), 3, "Expected exactly 3 public pricing tiers")

        plan_ids = [p['plan_id'] for p in plans]
        self.assertIn('basic', plan_ids)
        self.assertIn('pro', plan_ids)
        self.assertIn('business', plan_ids)

        basic_plan = next(p for p in plans if p['plan_id'] == 'basic')
        self.assertEqual(basic_plan['monthly_price_paise'], 49900)
        self.assertEqual(basic_plan['monthly_price_inr'], 499.0)
        self.assertEqual(basic_plan['yearly_price_paise'], 499000)
        self.assertEqual(basic_plan['yearly_price_inr'], 4990.0)
        self.assertEqual(basic_plan['discount_label'], 'Save 17%')
        self.assertTrue(len(basic_plan['features']) > 0)

        # Test GET /api/public/settings
        res_settings = self.client.get('/api/public/settings')
        self.assertEqual(res_settings.status_code, 200)
        settings_data = res_settings.get_json().get('data', {})
        self.assertTrue(settings_data.get('free_trial_enabled'))
        self.assertEqual(settings_data.get('default_trial_record_limit'), 30)
        self.assertEqual(settings_data.get('currency'), 'INR')
        print("[PASS] 1. Public 3 plans & pricing settings verified.")

    # -------------------------------------------------------------------------
    # PART 4: Free Trial Activation & Quota Enforcement
    # -------------------------------------------------------------------------
    def test_02_free_trial_lifecycle_and_unique_deduplication(self):
        # 1. Unauthenticated trial status rejected
        r_unauth = self.client.get('/api/trial/status')
        self.assertEqual(r_unauth.status_code, 401)

        # 2. Check initial trial status for test_user (before activation)
        r_status = self.client.get('/api/trial/status', headers=self.user_headers)
        self.assertEqual(r_status.status_code, 200)
        t_data = r_status.get_json().get('data', {})
        self.assertIn(t_data.get('trial_status'), ('not_started', 'active'))

        # 3. Activate Free Trial
        r_start = self.client.post('/api/trial/start', headers=self.user_headers)
        self.assertIn(r_start.status_code, (200, 201))
        t_started = r_start.get_json().get('data', {})
        self.assertEqual(t_started.get('trial_status'), 'active')
        self.assertEqual(t_started.get('trial_limit'), 30)

        # 4. Verify unique vendor counting (Repeated hits do NOT consume quota)
        user_id = "test_user_uid"
        # Simulate recording 5 unique vendors
        TrialService.record_trial_unique_records(user_id, [
            "vendor_hash_aaa",
            "vendor_hash_bbb",
            "vendor_hash_ccc",
            "vendor_hash_ddd",
            "vendor_hash_eee"
        ])
        t_curr = TrialService.get_user_trial(user_id)
        self.assertEqual(t_curr['trial_used'], 5)
        self.assertEqual(t_curr['trial_remaining'], 25)

        # Re-recording the exact same vendor hashes must NOT increase trial usage
        TrialService.record_trial_unique_records(user_id, [
            "vendor_hash_aaa",
            "vendor_hash_bbb"
        ])
        t_curr_after_dupe = TrialService.get_user_trial(user_id)
        self.assertEqual(t_curr_after_dupe['trial_used'], 5, "Repeated vendor records must NOT increase trial usage!")
        self.assertEqual(t_curr_after_dupe['trial_remaining'], 25)

        # Consume remaining 25 records to reach 30 unique records limit
        new_hashes = [f"vendor_hash_batch_{i}" for i in range(25)]
        TrialService.record_trial_unique_records(user_id, new_hashes)
        t_completed = TrialService.get_user_trial(user_id)
        self.assertEqual(t_completed['trial_used'], 30)
        self.assertEqual(t_completed['trial_remaining'], 0)
        self.assertEqual(t_completed['trial_status'], 'completed')

        # Allowance check must now block extraction
        can_ext, rem, reason = TrialService.check_extraction_allowance(user_id)
        self.assertFalse(can_ext, "Extraction must be paused once 30 records reached")
        self.assertEqual(reason, "trial_limit_reached")
        print("[PASS] 2. Free Trial 30-record allowance & atomic deduplication verified.")

    # -------------------------------------------------------------------------
    # PART 5 & 6: Razorpay Checkout, Verification & Subscriptions
    # -------------------------------------------------------------------------
    def test_03_razorpay_checkout_signature_and_subscription(self):
        # 1. Create order for Pro Plan (Monthly)
        r_order = self.client.post(
            '/api/subscriptions/checkout',
            headers=self.user_headers,
            data=json.dumps({"plan_id": "pro", "billing_cycle": "monthly"})
        )
        self.assertEqual(r_order.status_code, 201)
        order_data = r_order.get_json().get('data', {})
        order_id = order_data.get('order_id')
        self.assertTrue(order_id.startswith('order_'))
        self.assertEqual(order_data.get('amount_paise'), 99900)
        self.assertEqual(order_data.get('amount_inr'), 999.0)

        # 2. Invalid signature must be rejected with 400
        r_invalid_sig = self.client.post(
            '/api/payments/verify',
            headers=self.user_headers,
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": "pay_test_123",
                "razorpay_signature": "invalid_forged_signature"
            })
        )
        self.assertEqual(r_invalid_sig.status_code, 400)
        self.assertEqual(r_invalid_sig.get_json().get('error', {}).get('code'), 'PAYMENT_SIGNATURE_INVALID')

        # 3. Valid signature must activate subscription
        r_valid_sig = self.client.post(
            '/api/payments/verify',
            headers=self.user_headers,
            data=json.dumps({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": "pay_test_999888",
                "razorpay_signature": "test_valid_signature",
                "payment_method": "UPI / Google Pay"
            })
        )
        self.assertEqual(r_valid_sig.status_code, 200)
        pay_result = r_valid_sig.get_json().get('data', {})
        self.assertEqual(pay_result.get('status'), 'successful')

        # 4. Verify user current subscription is active
        r_current_sub = self.client.get('/api/subscriptions/current', headers=self.user_headers)
        self.assertEqual(r_current_sub.status_code, 200)
        sub_info = r_current_sub.get_json().get('data', {})
        self.assertTrue(sub_info.get('has_active_subscription'))
        self.assertEqual(sub_info.get('plan_id'), 'pro')
        self.assertEqual(sub_info.get('status'), 'active')

        # 5. Payment history
        r_pay_hist = self.client.get('/api/payments/history', headers=self.user_headers)
        self.assertEqual(r_pay_hist.status_code, 200)
        payments = r_pay_hist.get_json().get('data', [])
        self.assertTrue(len(payments) > 0)
        self.assertEqual(payments[0]['order_id'], order_id)
        self.assertEqual(payments[0]['status'], 'successful')

        # 6. Cancel subscription
        r_cancel = self.client.post('/api/subscriptions/cancel', headers=self.user_headers)
        self.assertEqual(r_cancel.status_code, 200)
        print("[PASS] 3. Razorpay order creation, signature verification, and subscription lifecycle verified.")

    # -------------------------------------------------------------------------
    # PART 8: Confidentiality & Role-Based Access Control (RBAC)
    # -------------------------------------------------------------------------
    def test_04_role_based_access_control_and_user_privacy(self):
        # Ordinary user MUST be strictly blocked from admin APIs (403 Forbidden)
        admin_endpoints = [
            ('GET', '/api/admin/plans'),
            ('POST', '/api/admin/plans'),
            ('GET', '/api/admin/trial-settings'),
            ('PUT', '/api/admin/trial-settings'),
            ('GET', '/api/admin/subscriptions'),
            ('GET', '/api/admin/payments'),
            ('GET', '/api/admin/users'),
            ('GET', '/api/admin/analytics'),
        ]

        for method, path in admin_endpoints:
            res = self.client.open(path, method=method, headers=self.user_headers, data=json.dumps({}))
            self.assertEqual(
                res.status_code, 403,
                f"Ordinary user was not blocked on admin endpoint {method} {path} (got {res.status_code})"
            )
            self.assertEqual(res.get_json().get('error', {}).get('code'), 'FORBIDDEN')

        # Admin user MUST be permitted (200 OK)
        r_admin_plans = self.client.get('/api/admin/plans', headers=self.admin_headers)
        self.assertEqual(r_admin_plans.status_code, 200)

        r_admin_analytics = self.client.get('/api/admin/analytics', headers=self.admin_headers)
        self.assertEqual(r_admin_analytics.status_code, 200)

        # Customer A cannot see Customer B's payment records
        r_user2_payments = self.client.get('/api/payments/history', headers=self.user2_headers)
        self.assertEqual(r_user2_payments.status_code, 200)
        u2_payments = r_user2_payments.get_json().get('data', [])
        # Customer 2 has not made payments; should be 0, not customer 1's payments
        self.assertEqual(len(u2_payments), 0, "Customer data isolation breached: Customer B saw Customer A's payments!")

        print("[PASS] 4. Role-based access control and confidentiality isolation strictly verified.")

    # -------------------------------------------------------------------------
    # PART 9: Admin Modifications & Billing Analytics
    # -------------------------------------------------------------------------
    def test_05_admin_plan_modification_and_analytics(self):
        # 1. Admin edits Basic plan price to ₹599 (59900 paise)
        r_edit_plan = self.client.put(
            '/api/admin/plans/basic',
            headers=self.admin_headers,
            data=json.dumps({
                "plan_id": "basic",
                "name": "Basic Tier Updated",
                "description": "Updated starter lead extraction",
                "monthly_price_paise": 59900,
                "yearly_price_paise": 599000,
                "discount_label": "Save 20%",
                "features": ["Updated 6k leads"],
                "limits": {"extraction_limit": 6000},
                "is_active": True,
                "display_order": 1,
                "cta_text": "Select Updated"
            })
        )
        self.assertEqual(r_edit_plan.status_code, 200)

        # 2. Verify public pricing automatically updates without hardcoding
        r_public_plans = self.client.get('/api/plans')
        self.assertEqual(r_public_plans.status_code, 200)
        plans = r_public_plans.get_json().get('data', [])
        updated_basic = next(p for p in plans if p['plan_id'] == 'basic')
        self.assertEqual(updated_basic['name'], "Basic Tier Updated")
        self.assertEqual(updated_basic['monthly_price_paise'], 59900)
        self.assertEqual(updated_basic['monthly_price_inr'], 599.0)

        # 3. Admin updates Free Trial settings
        r_update_trial = self.client.put(
            '/api/admin/trial-settings',
            headers=self.admin_headers,
            data=json.dumps({
                "free_trial_enabled": True,
                "default_trial_record_limit": 50,
                "trial_duration_days": 21,
                "prevent_duplicate_accounts": True
            })
        )
        self.assertEqual(r_update_trial.status_code, 200)
        new_settings = r_update_trial.get_json().get('data', {})
        self.assertEqual(new_settings['default_trial_record_limit'], 50)

        # 4. Billing Analytics verification: Gross, Taxes, Refunds, Net Revenue separated
        r_analytics = self.client.get('/api/admin/analytics', headers=self.admin_headers)
        self.assertEqual(r_analytics.status_code, 200)
        analytics_data = r_analytics.get_json().get('data', {})
        rev = analytics_data.get('revenue', {})
        self.assertIn('gross_collections_inr', rev)
        self.assertIn('taxes_inr', rev)
        self.assertIn('refunds_inr', rev)
        self.assertIn('net_revenue_inr', rev)
        self.assertEqual(rev.get('currency'), 'INR')
        self.assertTrue('recent_audit_logs' in analytics_data)
        print("[PASS] 5. Admin pricing modification & segregated financial analytics verified.")


if __name__ == '__main__':
    print("=" * 75)
    print("RUNNING AST EXTRACTOR SAAS BILLING & PRICING VERIFICATION SUITE")
    print("=" * 75)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestSaaSBillingSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
