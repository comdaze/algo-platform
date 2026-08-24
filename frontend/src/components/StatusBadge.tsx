import React from 'react';
import StatusIndicator, { StatusIndicatorProps } from '@cloudscape-design/components/status-indicator';

interface StatusBadgeProps {
  status: 'draft' | 'staging' | 'production' | 'archived';
}

const statusMap: Record<string, { type: StatusIndicatorProps.Type; text: string }> = {
  draft: { type: 'pending', text: 'Draft' },
  staging: { type: 'in-progress', text: 'Staging' },
  production: { type: 'success', text: 'Production' },
  archived: { type: 'stopped', text: 'Archived' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusMap[status] || { type: 'pending' as const, text: status };
  return <StatusIndicator type={config.type}>{config.text}</StatusIndicator>;
};

export default StatusBadge;
