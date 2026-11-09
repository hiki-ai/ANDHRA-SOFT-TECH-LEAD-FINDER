import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Database,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Search,
  Sparkles,
  Building2,
  CreditCard,
  HelpCircle,
  Mail,
  Check,
  Star,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { billingService } from '@/services/billingService';
import { Loader } from '../components/common/Loader';

export function Home() {
  const { isAuthenticated, user, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [plans, setPlans] = useState([]);
  const [publicSettings, setPublicSettings] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [startingTrial, setStartingTrial] = useState(false);

  // Fetch plans dynamically from Cloud Firestore via backend API
  const fetchPlans = async () => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const [plansData, settingsData] = await Promise.all([
        billingService.getPublicPlans(),
        billingService.getPublicSettings().catch(() => ({})),
      ]);
      const validPlans = Array.isArray(plansData) ? plansData.filter((p) => p && p.is_active !== false) : [];
      setPlans(validPlans);
      setPublicSettings(settingsData);
    } catch (err) {
      console.error('[Home] Failed to load plans dynamically:', err);
      setPlansError(err.message || 'Unable to load pricing plans right now. Please try again.');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleChoosePlan = (plan) => {
    if (!isAuthenticated) {
      navigate('/register', { state: { selectedPlan: plan.plan_id, billingCycle } });
    } else {
      if (role === 'admin') {
        navigate('/admin/plans');
      } else {
        navigate('/app/pricing', { state: { selectedPlan: plan.plan_id, billingCycle } });
      }
    }
  };

  const handleStartFreeTrial = async () => {
    if (!isAuthenticated) {
      navigate('/register', { state: { startTrial: true } });
      return;
    }

    if (role === 'admin') {
      navigate('/dashboard');
      return;
    }

    setStartingTrial(true);
    try {
      await billingService.startFreeTrial();
      toast.success('Your Free Trial with 30 unique records is now active!');
      navigate('/app');
    } catch (err) {
      toast.info(err.message || 'Free trial already active or pending.');
      navigate('/app');
    } finally {
      setStartingTrial(false);
    }
  };

  return (
    <div className="bg-surface-50 min-h-screen flex flex-col scroll-smooth">
      {/* 1. Hero Section */}
      <section id="home" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-surface-200/80 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.08),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-6 shadow-xs animate-in fade-in duration-300">
            <Zap className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>High-Fidelity B2B Lead Extraction & Intelligence</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-surface-900 tracking-tight leading-[1.12]">
            Find More Business Opportunities with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600">
              AST Extractor
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-surface-600 max-w-2xl mx-auto leading-relaxed">
            Discover, collect and manage business leads using a powerful lead extraction platform.
            Automated deduplication, instant Excel export, and compliant business records.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing">
              <Button size="lg" variant="primary" iconRight={ArrowRight}>
                View Pricing Plans
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              iconLeft={Sparkles}
              onClick={handleStartFreeTrial}
              isLoading={startingTrial}
            >
              Start 30-Record Free Trial
            </Button>
          </div>

          {/* Trust points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-surface-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Official Google Maps API & Permitted Directories</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>30-Record Free Trial (No Card Needed)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Instant UPI, Cards & EMI Checkout via Razorpay</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest px-3 py-1 rounded-full bg-brand-50 border border-brand-100">
            Platform Capabilities
          </span>
          <h2 className="text-3xl font-extrabold text-surface-900 mt-3">
            Engineered for Precision Lead Operations
          </h2>
          <p className="mt-2 text-sm text-surface-600 max-w-xl mx-auto">
            Everything you need to discover high-value business leads, normalize phone numbers, and download formatted datasets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-7 border border-surface-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Multi-Source Lead Extraction
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                Configurable async collection jobs by industry category, geographic bounds, and target quantity. Includes official Google Places (New) API, Justdial, and Magicpin integration.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Live Telemetry</span>
              <span className="font-mono text-emerald-600 font-medium">Asynchronous</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-surface-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5 border border-brand-100">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Deduplication & Quality Scoring
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                Every record is validated with SHA-256 dedupe hashing, phone normalization, and automated data quality scoring. Never pay for repeated business leads.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Unique Hashing</span>
              <span className="font-mono text-indigo-600 font-medium">Zero Duplicates</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-surface-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 border border-purple-100">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Custom Presets & Excel Export
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                Configure your own column orders with the Table Editor. One-click instant streaming export to native Microsoft Excel (XLSX) and CSV without truncation.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Native Excel</span>
              <span className="font-mono text-purple-600 font-medium">Instant Export</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pricing Section (Loaded dynamically from Cloud Firestore) */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-surface-200/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest px-3 py-1 rounded-full bg-brand-50 border border-brand-100">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-surface-900 mt-3 tracking-tight">
            Predictable Plans for Every Stage
          </h2>
          <p className="mt-3 text-sm text-surface-600">
            Choose the subscription tier tailored to your monthly lead extraction needs. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-surface-200/80 border border-surface-300/70 shadow-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Pricing Cards */}
        {loadingPlans ? (
          <div className="py-16 flex items-center justify-center">
            <Loader size="lg" text="Loading real-time plans from database..." />
          </div>
        ) : plansError ? (
          <div className="py-12 max-w-md mx-auto text-center p-6 rounded-3xl bg-rose-50 border border-rose-200 shadow-xs">
            <p className="text-xs font-semibold text-rose-700 mb-4">{plansError}</p>
            <Button size="sm" variant="outline" onClick={fetchPlans}>
              Retry Loading Plans
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white border border-surface-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3 text-surface-400">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-surface-800">No active plans currently available</p>
            <p className="text-xs text-surface-500 mt-1">
              Please check back shortly or contact our team for custom enterprise onboarding.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              plans.length === 1
                ? 'max-w-md mx-auto'
                : plans.length === 2
                ? 'md:grid-cols-2 max-w-4xl mx-auto'
                : plans.length === 4
                ? 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl'
                : 'md:grid-cols-2 lg:grid-cols-3'
            } gap-8 items-stretch`}
          >
            {plans.map((plan) => {
              const isYearly = billingCycle === 'yearly';
              const priceInr = isYearly
                ? (plan.yearly_price_inr ?? Math.round((plan.yearly_price_paise || 0) / 100))
                : (plan.monthly_price_inr ?? Math.round((plan.monthly_price_paise || 0) / 100));
              const periodText = isYearly ? '/year' : '/month';
              const isPopular = plan.is_popular;
              const planKey = plan.plan_id || plan.id;

              return (
                <div
                  key={planKey}
                  className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 bg-white border ${
                    isPopular
                      ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xl lg:-translate-y-2'
                      : 'border-surface-200 shadow-card hover:shadow-card-hover'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-surface-900">
                        {plan.name || plan.display_name || plan.plan_id}
                      </h3>
                      {isYearly && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {plan.discount_label || 'Save 17%'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-surface-600 mb-6 min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6 pb-6 border-b border-surface-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-surface-900 tracking-tight">
                          ₹{Number(priceInr || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-semibold text-surface-500">
                          {periodText}
                        </span>
                      </div>
                      <span className="text-[11px] text-surface-400 mt-1 block">
                        {isYearly ? 'Billed annually (Includes 2 months free)' : 'Billed monthly, cancel anytime'}
                      </span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 mb-8">
                      <div className="text-xs font-bold text-surface-800 uppercase tracking-wider">
                        Included Features:
                      </div>
                      {(plan.features || []).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-surface-700">
                          <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4">
                    <Button
                      fullWidth
                      size="lg"
                      variant={isPopular ? 'primary' : 'outline'}
                      iconRight={ArrowRight}
                      onClick={() => handleChoosePlan(plan)}
                    >
                      {plan.cta_text || `Subscribe to ${plan.name || 'Plan'}`}
                    </Button>
                    <p className="text-[10px] text-center text-surface-400 mt-2.5">
                      Secure checkout powered by Razorpay (UPI, Cards & EMI)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Dedicated Free Trial Section (PART 4 Requirement) */}
        <div id="free-trial" className="mt-16 bg-gradient-to-br from-indigo-900 via-brand-900 to-surface-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <Sparkles className="w-96 h-96" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Zero Risk Trial Program</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">
              Start Your Free Trial
            </h3>

            <p className="mt-3 text-sm sm:text-base text-indigo-100 leading-relaxed max-w-2xl">
              Experience AST Extractor before choosing a premium subscription.
              Extract up to <strong className="text-white underline decoration-emerald-400 decoration-2 font-black">30 UNIQUE VENDOR RECORDS</strong> from verified business sources.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-indigo-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>30 Unique Vendor Records</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Repeated vendors don't consume quota</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Excel & CSV Export Enabled</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button
                size="lg"
                className="bg-white text-brand-700 hover:bg-surface-50 font-bold border-0 shadow-lg text-sm px-8"
                iconRight={ArrowRight}
                onClick={handleStartFreeTrial}
                isLoading={startingTrial}
              >
                {isAuthenticated ? 'Activate 30-Record Free Trial' : 'Start Free Trial Now'}
              </Button>
              <span className="text-xs text-indigo-300">
                Instantly accessible in your personal Customer Dashboard.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Supported Payment Methods & Security */}
      <section className="py-14 bg-surface-100/70 border-t border-surface-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bank-Grade Payment Security & Supported Channels</span>
          </div>
          <p className="text-xs text-surface-600 max-w-xl mx-auto mb-6">
            Transactions are encrypted with 256-bit SSL and processed directly through Razorpay. Supported payment channels include:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-semibold text-surface-700">
            <span className="px-3.5 py-1.5 rounded-lg bg-white border border-surface-200 shadow-xs">
              ⚡ UPI (Google Pay, PhonePe, Paytm, BHIM)
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-white border border-surface-200 shadow-xs">
              💳 Credit & Debit Cards (Visa, MasterCard, RuPay)
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-white border border-surface-200 shadow-xs">
              🏛️ Net Banking (50+ Indian Banks)
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-white border border-surface-200 shadow-xs">
              📅 Eligible Bank Card EMI & No Cost EMI
            </span>
          </div>
        </div>
      </section>

      {/* 6. Contact & FAQ Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest px-3 py-1 rounded-full bg-brand-50 border border-brand-100">
            Help & Questions
          </span>
          <h2 className="text-3xl font-extrabold text-surface-900 mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-surface-200">
            <h4 className="text-sm font-bold text-surface-900">
              How does the 30-Record Free Trial work?
            </h4>
            <p className="mt-2 text-xs text-surface-600 leading-relaxed">
              Every newly registered user can activate one Free Trial without providing credit card or payment information. You can extract up to 30 unique business leads. If the same vendor appears multiple times, repeated hits do not consume your 30-record allowance. When you reach 30 unique records, extraction pauses safely and your collected records remain saved.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-surface-200">
            <h4 className="text-sm font-bold text-surface-900">
              Can I upgrade, downgrade or cancel my subscription anytime?
            </h4>
            <p className="mt-2 text-xs text-surface-600 leading-relaxed">
              Yes. You can upgrade to a higher tier anytime via your Customer Dashboard. If you cancel, your subscription remains active until the end of the current billing cycle. Your saved collection data is never deleted after expiry.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-surface-200">
            <h4 className="text-sm font-bold text-surface-900">
              Are EMI payment options supported?
            </h4>
            <p className="mt-2 text-xs text-surface-600 leading-relaxed">
              Yes. Eligible credit cards and debit cards support EMI payment options directly through our official Razorpay checkout integration, subject to issuing bank eligibility. Available tenures and interest rates will be clearly displayed by your bank.
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-surface-200">
            <h4 className="text-sm font-bold text-surface-900">
              Need dedicated assistance or custom enterprise volume?
            </h4>
            <p className="mt-2 text-xs text-surface-600 leading-relaxed">
              Contact our solutions engineering team at <a href="mailto:support@andhrasofttech.com" className="text-brand-600 font-semibold underline">support@andhrasofttech.com</a> or reach out through your customer dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
