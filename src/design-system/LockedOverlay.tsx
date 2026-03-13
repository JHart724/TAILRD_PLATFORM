import React from 'react';
import { Lock } from 'lucide-react';

interface LockedOverlayProps {
  title?: string;
  ctaText?: string;
  children: React.ReactNode;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({
  title = 'Premium Feature',
  ctaText = 'Upgrade to Unlock',
  children,
}) => {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-surface-base/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4 z-10">
        <div
          className="glass-panel-elevated px-8 py-6 flex flex-col items-center gap-3 max-w-sm text-center"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(61, 111, 148, 0.15)',
              border: '1px solid rgba(61, 111, 148, 0.2)',
            }}
          >
            <Lock className="w-6 h-6 text-chrome-400" />
          </div>
          <h3 className="text-lg font-display font-bold text-chrome-100">
            {title}
          </h3>
          <p className="text-sm text-chrome-400 font-body">
            Unlock this feature with TAILRD Premium for real-time analytics and AI-powered insights.
          </p>
          <button className="mt-2 btn-primary text-sm">
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockedOverlay;
