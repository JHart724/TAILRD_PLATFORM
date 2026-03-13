export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatValue(value: number, unit: string): string {
  switch (unit) {
    case 'currency': return formatCurrency(value);
    case 'percent': return formatPercent(value);
    case 'days': return `${value.toFixed(1)} days`;
    case 'ratio': return value.toFixed(2);
    default: return formatNumber(value);
  }
}

export function getStatusColor(status: 'above' | 'at' | 'below'): string {
  switch (status) {
    case 'above': return 'text-emerald-600';
    case 'at': return 'text-amber-600';
    case 'below': return 'text-arterial-600';
  }
}

export function getStatusBg(status: 'above' | 'at' | 'below'): string {
  switch (status) {
    case 'above': return 'bg-emerald-500';
    case 'at': return 'bg-amber-500';
    case 'below': return 'bg-arterial-500';
  }
}

export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return 'bg-arterial-600';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-chrome-500';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}
