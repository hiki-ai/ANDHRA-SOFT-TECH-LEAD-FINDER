/**
 * Customer User Usage Statistics Page
 * Location: frontend/src/pages/user/UserUsage.jsx
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { collectionService } from '@/services/collectionService';
import { Loader } from '@/components/common/Loader';
import { Button } from '@/components/common/Button';

export function UserUsage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [dash, colls] = await Promise.all([
          billingService.getUserDashboard(),
          collectionService.listCollections().catch(() => []),
        ]);
        if (isMounted) {
          setDashboardData(dash);
          setCollections(colls);
        }
      } catch (err) {
        console.error('[UserUsage] Error loading statistics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Calculating usage statistics..." />
      </div>
    );
  }

  const d = dashboardData || {};
  const isTrial = d.has_trial && d.trial_status === 'active';
  const isSub = d.has_active_subscription;

  // Compute source-wise distribution
  const sourceStats = {};
  collections.forEach((c) => {
    const sName = c.source_name || c.source || 'Google Maps / Places API';
    sourceStats[sName] = (sourceStats[sName] || 0) + (c.valid_count || c.valid || 0);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Usage Statistics
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Real-time telemetry on your allowed extraction records, unique vendor deduplication, and source quotas.
          </p>
        </div>

        <Link to="/app/pricing">
          <Button size="sm" variant="primary" iconRight={Sparkles}>
            Increase Limits
          </Button>
        </Link>
      </div>

      {/* Primary Quota Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
          <span className="text-xs font-bold text-surface-400 uppercase tracking-wider block">
            Allowed Extraction Records
          </span>
          <div className="text-3xl font-black text-surface-900 mt-2">
            {isSub
              ? d.subscription?.plan_details?.limits?.extraction_limit?.toLocaleString('en-IN') || '25,000'
              : `${d.trial_limit || 30} Records (Free Trial)`}
          </div>
          <span className="text-[11px] text-surface-500 mt-1 block">
            {isSub ? 'Monthly allocated quota' : 'Free Trial allowance'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
          <span className="text-xs font-bold text-surface-400 uppercase tracking-wider block">
            Used Records
          </span>
          <div className="text-3xl font-black text-indigo-600 mt-2">
            {isSub ? d.total_leads_collected || 0 : d.trial_used || 0}
          </div>
          <span className="text-[11px] text-surface-500 mt-1 block">
            Unique verified vendor records
          </span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
          <span className="text-xs font-bold text-surface-400 uppercase tracking-wider block">
            Remaining Quota
          </span>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {isSub ? 'Active Quota' : `${d.trial_remaining || 0} leads`}
          </div>
          <span className="text-[11px] text-surface-500 mt-1 block">
            Available for immediate extraction
          </span>
        </div>
      </div>

      {/* Source-wise Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Source Connector Breakdown
        </h3>
        {Object.keys(sourceStats).length === 0 ? (
          <p className="text-xs text-surface-500">No collection jobs run yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(sourceStats).map(([src, count]) => (
              <div key={src} className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-50 border border-surface-200/60">
                <span className="font-semibold text-surface-800">{src}</span>
                <span className="font-mono font-bold text-surface-900">{count} verified leads</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserUsage;

