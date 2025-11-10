import React from 'react';
import { Brain, User } from 'lucide-react';

interface ReferralOriginBadgeProps {
  originType: 'upstream' | 'standard';
  customLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ReferralOriginBadge: React.FC<ReferralOriginBadgeProps> = ({
  originType,
  customLabel,
  size = 'sm',
  className = ''
}) => {
  const getConfig = () => {
    switch (originType) {
      case 'upstream':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: Brain,
          label: customLabel || 'TAILRD AI',
          tooltip: 'TAILRD AI-identified patient from upstream screening'
        };
      case 'standard':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: User,
          label: customLabel || 'Standard',
          tooltip: 'Traditional referral pathway'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: User,
          label: 'Standard',
          tooltip: 'Traditional referral pathway'
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 'px-2 py-0.5',
          textSize: 'text-xs',
          iconSize: 'w-3 h-3'
        };
      case 'md':
        return {
          padding: 'px-3 py-1',
          textSize: 'text-sm',
          iconSize: 'w-4 h-4'
        };
      case 'lg':
        return {
          padding: 'px-4 py-1.5',
          textSize: 'text-base',
          iconSize: 'w-5 h-5'
        };
      default:
        return {
          padding: 'px-2 py-0.5',
          textSize: 'text-xs',
          iconSize: 'w-3 h-3'
        };
    }
  };

  const config = getConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeConfig.padding} ${sizeConfig.textSize}
        font-medium transition-all duration-200
        hover:shadow-sm cursor-help
        ${className}
      `}
      title={config.tooltip}
    >
      <IconComponent className={`${sizeConfig.iconSize} flex-shrink-0`} />
      <span className="leading-none">{config.label}</span>
    </div>
  );
};

export default ReferralOriginBadge;