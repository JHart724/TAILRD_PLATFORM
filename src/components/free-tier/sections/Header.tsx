import React from 'react';
import { ArrowLeft, Download, Database, Upload } from 'lucide-react';

interface HeaderProps {
  hasUploadedFiles: boolean;
  onBackToMain: () => void;
}

const Header: React.FC<HeaderProps> = ({ hasUploadedFiles, onBackToMain }) => {
  return (
    <div className="flex items-center justify-between">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBackToMain}
          className="bg-chrome-200 hover:bg-chrome-300 rounded-lg p-2 transition-colors duration-150"
          aria-label="Back to main dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-chrome-700" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-chrome-800 text-2xl tracking-tight">
            TAILRD
          </span>
          <span className="bg-arterial-600 text-white text-xs font-body font-medium px-2 py-0.5 rounded-full">
            HEART
          </span>
        </div>

        <div className="h-8 w-px bg-chrome-200" />

        <div>
          <h1 className="text-xl font-display font-bold text-titanium-800">
            Cardiovascular Service Line Intelligence
          </h1>
          <p className="text-sm text-titanium-500 font-body">
            Free Tier &mdash; CMS Benchmark Analytics
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-chrome-100 text-chrome-700 text-xs font-body font-medium px-2.5 py-1 rounded-full">
            <Database className="w-3 h-3" />
            CMS 2024
          </span>
          <span className="inline-flex items-center gap-1.5 bg-chrome-100 text-chrome-700 text-xs font-body font-medium px-2.5 py-1 rounded-full">
            <Database className="w-3 h-3" />
            AHA 2024
          </span>
          {hasUploadedFiles && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-body font-medium px-2.5 py-1 rounded-full">
              <Upload className="w-3 h-3" />
              Uploaded Data
            </span>
          )}
        </div>

        <button className="inline-flex items-center gap-1.5 border border-chrome-300 text-chrome-700 hover:bg-chrome-50 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors duration-150">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
};

export default Header;
