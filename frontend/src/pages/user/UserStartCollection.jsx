/**
 * Customer User Start Collection Page
 * Location: frontend/src/pages/user/UserStartCollection.jsx
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlayCircle,
  Layers,
  MapPin,
  Tag,
  Hash,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { collectionService } from '@/services/collectionService';
import { billingService } from '@/services/billingService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function UserStartCollection() {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState(30);
  const [source, setSource] = useState('google_places');
  const [presetId, setPresetId] = useState('preset_furniture_leads');

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadAllowance() {
      try {
        const data = await billingService.getUserDashboard();
        if (isMounted) {
          setDashboardData(data);
          // Default target count to remaining trial if on trial
          if (data.trial_remaining && !data.has_active_subscription) {
            setTargetCount(Math.min(30, data.trial_remaining));
          } else if (data.has_active_subscription) {
            setTargetCount(100);
          }
        }
      } catch (err) {
        console.error('[UserStartCollection] Allowance check error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAllowance();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!category.trim() || !location.trim()) {
      setError('Please provide both an industry category and location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await collectionService.createCollection({
        category: category.trim(),
        location: location.trim(),
        target_count: parseInt(targetCount, 10) || 30,
        source,
        preset_id: presetId,
      });

      toast.success('Collection job dispatched successfully!');
      navigate('/app/collections');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to start collection.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Verifying extraction allowance..." />
      </div>
    );
  }

  const d = dashboardData || {};
  const isTrialExhausted = !d.has_active_subscription && d.trial_remaining <= 0;

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Launch Lead Extraction
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Initiate asynchronous collection jobs across verified business directories with automatic deduplication.
        </p>
      </div>

      {isTrialExhausted ? (
        <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-amber-950">
            Free Trial Limit Reached (30/30 Records)
          </h3>
          <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
            You have used all 30 unique records available in your Free Trial. To continue collecting business opportunities, please select a premium plan.
          </p>
          <div className="pt-2">
            <Link to="/app/pricing">
              <Button size="lg" variant="primary" iconRight={Sparkles}>
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-xs">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Business Category / Industry"
              type="text"
              placeholder="e.g. Furniture Manufacturers, Hotels, Hospitals, Gyms"
              iconLeft={Tag}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />

            <Input
              label="Geographic Location (City, State, Region)"
              type="text"
              placeholder="e.g. Visakhapatnam, Rajahmundry, Vijayawada, Hyderabad"
              iconLeft={MapPin}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
                  Data Source Connector
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="google_places">Google Maps / Google Places API</option>
                  <option value="justdial">Justdial Business Directory</option>
                  <option value="magicpin">Magicpin Merchant Network</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
                  Target Unique Leads
                </label>
                <input
                  type="number"
                  min="1"
                  max={d.has_active_subscription ? 5000 : (d.trial_remaining || 30)}
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  required
                />
                <span className="text-[10px] text-surface-400 block mt-1">
                  {d.has_active_subscription
                    ? 'Available monthly quota'
                    : `Remaining Free Trial quota: ${d.trial_remaining || 30} leads`}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                fullWidth
                size="lg"
                variant="primary"
                type="submit"
                iconRight={PlayCircle}
                isLoading={submitting}
              >
                Launch Lead Extraction Job
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserStartCollection;

