import React from 'react';
import { Download, Database, Upload } from 'lucide-react';

interface HeaderProps {
  hasUploadedFiles: boolean;
  onBackToMain?: () => void;
}

const Header: React.FC<HeaderProps> = ({ hasUploadedFiles }) => {
  return (
    <div className="flex items-center justify-between">
      {/* Left side — data source badges */}
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
          <span className="inline-flex items-center gap-1.5 bg-chrome-50 text-teal-700 text-xs font-body font-medium px-2.5 py-1 rounded-full">
            <Upload className="w-3 h-3" />
            Uploaded Data
          </span>
        )}
      </div>

      {/* Right side */}
      <button type="button" className="inline-flex items-center gap-1.5 border border-chrome-300 text-chrome-700 hover:bg-chrome-50 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors duration-150">
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  );
};

export default Header;
