import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface OnboardingBannerProps {
  hasUploadedFiles: boolean;
}

const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ hasUploadedFiles }) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  if (hasUploadedFiles) return null;
  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-4">
        {/* Left: Info icon */}
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-10 h-10 text-amber-600" />
        </div>

        {/* Center: Text content */}
        <div className="flex-1">
          <h3 className="text-sm font-body font-semibold text-amber-800">
            Enhance Your Analytics
          </h3>
          <p className="text-sm text-amber-700 font-body">
            Upload your facility data to unlock verified analytics, personalized
            benchmarking, and premium features. Your data stays in your browser.
          </p>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="text-sm font-body font-medium text-chrome-600 hover:text-chrome-700"
          >
            Learn More
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-titanium-400 hover:text-titanium-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingBanner;
