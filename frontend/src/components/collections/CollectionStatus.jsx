import React from 'react';
import { Badge } from '../common/Badge';

const statusVariantMap = {
  running: 'running',
  completed: 'completed',
  paused: 'duplicate',
  failed: 'failed',
  cancelled: 'neutral',
  pending: 'pending',
};

export function CollectionStatus({ status = 'pending' }) {
  const variant = statusVariantMap[status] || 'neutral';
  return (
    <Badge variant={variant} dot pulse={status === 'running'}>
      {status.toUpperCase()}
    </Badge>
  );
}

export default CollectionStatus;
