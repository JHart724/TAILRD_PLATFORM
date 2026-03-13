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
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#FBBF24',
      border: 'rgba(245, 158, 11, 0.2)',
      icon: BarChart3,
      defaultLabel: 'CMS Estimate',
    },
    verified: {
      bg: 'rgba(34, 197, 94, 0.12)',
      text: '#4ADE80',
      border: 'rgba(34, 197, 94, 0.2)',
      icon: Check,
      defaultLabel: 'Verified',
    },
    locked: {
      bg: 'rgba(255, 255, 255, 0.06)',
      text: '#8D96A8',
      border: 'rgba(255, 255, 255, 0.08)',
      icon: Lock,
      defaultLabel: 'Premium',
    },
    premium: {
      bg: 'rgba(61, 111, 148, 0.2)',
      text: '#A8C5DD',
      border: 'rgba(61, 111, 148, 0.3)',
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
