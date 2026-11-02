/**
 * Customer User Collections Page
 * Location: frontend/src/pages/user/UserCollections.jsx
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  PlayCircle,
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ExternalLink,
} from 'lucide-react';
import { collectionService } from '@/services/collectionService';
import { exportService } from '@/services/exportService';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function UserCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const toast = useToast();

  const loadData = async () => {
    try {
      const data = await collectionService.listCollections();
      setCollections(data);
    } catch (err) {
      console.error('[UserCollections] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for live collection progress
    return () => clearInterval(interval);
  }, []);

  const handleDownloadExcel = async (col) => {
    setExportingId(col.id);
    try {
      toast.info('Generating formatted Excel (.xlsx) file...');
      const res = await exportService.createExport({
        collection_id: col.id,
        format: 'xlsx',
      });
      if (res?.export_id) {
        exportService.downloadExport(res.export_id);
        toast.success('Excel download started.');
      } else {
        toast.error('Export failed to generate.');
      }
    } catch (err) {
      toast.error(err.message || 'Excel export failed.');
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading your collection jobs..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            My Collections
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Monitor real-time progress, telemetry, deduplication, and export datasets.
          </p>
        </div>

        <Link to="/app/start-collection">
          <Button size="sm" variant="primary" iconLeft={PlayCircle}>
            Start New Collection
          </Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-surface-200 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-surface-900">
            No Collections Yet
          </h3>
          <p className="text-xs text-surface-500 mt-1 mb-6">
            You haven't run any lead extractions yet. Launch your first extraction job now.
          </p>
          <Link to="/app/start-collection">
            <Button size="md" variant="primary" iconLeft={PlayCircle}>
              Start Collection
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Job / Target</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Found / Valid</th>
                  <th className="px-6 py-4">Status & Telemetry</th>
                  <th className="px-6 py-4">Started At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {collections.map((col) => {
                  const status = col.status || 'pending';
                  const isCompleted = status === 'completed';
                  const isRunning = status === 'running';
                  const isPaused = status === 'paused';
                  const isFailed = status === 'failed';

                  return (
                    <tr key={col.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-surface-900">
                          {col.category} in {col.location}
                        </div>
                        <div className="text-[10px] text-surface-400 font-mono mt-0.5">
                          {col.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-surface-600">
                        {col.source_name || col.source}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-surface-900">
                          {col.valid_count || col.valid || 0} valid leads
                        </div>
                        <div className="text-[10px] text-surface-500">
                          {col.duplicate_count || col.duplicate || 0} duplicates filtered
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        ) : isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                            <span>Running ({col.progress || 0}%)</span>
                          </span>
                        ) : isPaused ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <PauseCircle className="w-3 h-3 text-amber-600" />
                            <span>Paused (Limit Reached)</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 text-surface-600">
                            <Clock className="w-3 h-3" />
                            <span className="capitalize">{status}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-surface-600">
                        {col.started_at ? new Date(col.started_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          iconLeft={Download}
                          isLoading={exportingId === col.id}
                          disabled={(col.valid_count || col.valid || 0) === 0}
                          onClick={() => handleDownloadExcel(col)}
                        >
                          Excel (XLSX)
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserCollections;

