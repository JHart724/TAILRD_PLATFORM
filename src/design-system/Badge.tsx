import React from 'react';
import { Lock, Check, BarChart3, Star } from 'lucide-react';

interface BadgeProps {
  variant: 'estimate' | 'verified' | 'locked' | 'premium';
  label?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant, label, className = '' }) => {
  const config = {
    estimate: {
      bg: 'rgba(245, 158, 11, 0.08)',
      text: '#92400e',
      border: 'rgba(245, 158, 11, 0.15)',
      icon: BarChart3,
      defaultLabel: 'CMS Estimate',
    },
    verified: {
      bg: 'rgba(34, 197, 94, 0.08)',
      text: '#15803d',
      border: 'rgba(34, 197, 94, 0.15)',
      icon: Check,
      defaultLabel: 'Verified',
    },
    locked: {
      bg: 'rgba(200, 212, 220, 0.20)',
      text: '#636D80',
      border: 'rgba(200, 212, 220, 0.40)',
      icon: Lock,
      defaultLabel: 'Premium',
    },
    premium: {
      bg: 'rgba(44, 74, 96, 0.08)',
      text: '#2C4A60',
      border: 'rgba(44, 74, 96, 0.15)',
      icon: Star,
      defaultLabel: 'Premium',
    },
  };

  const { bg, text, border, icon: Icon, defaultLabel } = config[variant];
  const displayLabel = label || defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-body ${className}`}
      style={{
        background: bg,
        color: text,
        border: `1px solid ${border}`,
      }}
    >
      <Icon className="w-3 h-3" />
      {displayLabel}
    </span>
  );
};

export default Badge;
