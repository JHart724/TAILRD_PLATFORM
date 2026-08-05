import React from 'react';
import { Download, Database, Upload } from 'lucide-react';

/**
 * Data-source chips. A chip here is a CLAIM ABOUT PROVENANCE, so it may only name a source this
 * surface actually draws on.
 *
 * The `AHA 2024` chip was REMOVED 2026-08-05 (AUDIT-233). Nothing on this surface came from an
 * American Heart Association dataset. The AHA publishes GUIDELINES - which the gap rules cite, in
 * their evidence objects, in the backend - not the population or financial benchmarks rendered
 * here. The chip took a real citation from one layer and displayed it as a data source on another.
 *
 * `CMS 2024` stays: the DRG, procedure-volume and reimbursement figures on this surface are built
 * from CMS public-use files, which is what that chip asserts.
 */

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
