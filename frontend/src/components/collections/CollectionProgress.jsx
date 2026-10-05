import React from 'react';
import { ProgressBar } from '../common/ProgressBar';
import { formatNumber } from '../../utils/formatters';

export function CollectionProgress({ found = 0, target = 1000, progress = 0, status = 'running' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-surface-600 font-medium">
          Progress: {formatNumber(found)} / {formatNumber(target)} leads
        </span>
        <span className="font-bold text-surface-900">{progress}%</span>
      </div>
      <ProgressBar
        value={progress}
        size="md"
        color={status === 'completed' ? 'emerald' : status === 'failed' ? 'rose' : 'brand'}
        animated={status === 'running'}
      />
    </div>
  );
}

export default CollectionProgress;
