import React, { useState } from 'react';
import { Download, FileText, File, Database, ChevronDown } from 'lucide-react';
import { DataExportService, ExportData, ExportOptions } from '../../utils/dataExport';

interface ExportButtonProps {
  data: ExportData;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showFormatOptions?: boolean;
  defaultFormat?: 'csv' | 'excel' | 'pdf';
  label?: string;
}

const ExportButton = React.memo<ExportButtonProps>(({
  data,
  className = '',
  variant = 'outline',
  size = 'md',
  showFormatOptions = true,
  defaultFormat = 'excel',
  label = 'Export'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      const options: ExportOptions = {
        format,
        includeTimestamp: true,
        includeMetadata: true
      };
      
      DataExportService.export(data, options);
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] hover:scale-105';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-blue-500/30 hover:shadow-xl focus:ring-blue-500`;
      case 'secondary':
        return `${baseClasses} bg-gradient-to-r from-steel-100 to-steel-200 text-steel-800 hover:from-steel-200 hover:to-steel-300 shadow-md hover:shadow-lg focus:ring-steel-500`;
      case 'outline':
      default:
        return `${baseClasses} border border-white/30 bg-white/60 backdrop-blur-md text-steel-700 hover:bg-white/80 shadow-md hover:shadow-lg focus:ring-blue-500`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-xs rounded-xl';
      case 'lg':
        return 'px-8 py-4 text-base rounded-2xl';
      case 'md':
      default:
        return 'px-6 py-3 text-sm rounded-xl';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      case 'md':
      default:
        return 'w-4 h-4';
    }
  };

  if (!showFormatOptions) {
    return (
      <button
        onClick={() => handleExport(defaultFormat)}
        disabled={isExporting}
        className={`${getVariantClasses()} ${getSizeClasses()} ${className} ${
          isExporting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        aria-label={isExporting ? 'Exporting data, please wait' : `Export data as ${defaultFormat.toUpperCase()}`}
        aria-describedby="export-info"
      >
        {isExporting ? (
          <>
            <div 
              className={`${getIconSize()} mr-2 animate-spin rounded-full border-2 border-current border-t-transparent`}
              aria-hidden="true"
            />
            Exporting...
          </>
        ) : (
          <>
            <Download className={`${getIconSize()} mr-2`} aria-hidden="true" />
            {label}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`${getVariantClasses()} ${getSizeClasses()} ${className} ${
          isExporting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        aria-label={isExporting ? 'Exporting data, please wait' : `Export data - choose format`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-describedby="export-info"
      >
        {isExporting ? (
          <>
            <div 
              className={`${getIconSize()} mr-2 animate-spin rounded-full border-2 border-current border-t-transparent`}
              aria-hidden="true"
            />
            Exporting...
          </>
        ) : (
          <>
            <Download className={`${getIconSize()} mr-2`} aria-hidden="true" />
            {label}
            <ChevronDown 
              className={`${getIconSize()} ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && !isExporting && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div 
            className="absolute right-0 mt-3 w-52 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 z-20 overflow-hidden animate-in slide-in-from-top-2 duration-200"
            role="menu"
            aria-label="Export format options"
          >
            <div className="py-1">
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-3 text-left text-sm text-steel-700 hover:bg-white/60 focus:bg-white/60 focus:outline-none flex items-center transition-all duration-200 hover:scale-[1.02] hover:translate-x-1"
                role="menuitem"
                aria-label="Export as Excel (.xlsx) - Recommended format"
              >
                <Database className="w-4 h-4 mr-3 text-medical-green-600" aria-hidden="true" />
                Excel (.xlsx)
                <span className="ml-auto text-xs text-steel-500">Recommended</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-3 text-left text-sm text-steel-700 hover:bg-white/60 focus:bg-white/60 focus:outline-none flex items-center transition-all duration-200 hover:scale-[1.02] hover:translate-x-1"
                role="menuitem"
                aria-label="Export as CSV (.csv) - Plain text format"
              >
                <File className="w-4 h-4 mr-3 text-medical-blue-600" aria-hidden="true" />
                CSV (.csv)
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-3 text-left text-sm text-steel-700 hover:bg-white/60 focus:bg-white/60 focus:outline-none flex items-center transition-all duration-200 hover:scale-[1.02] hover:translate-x-1"
                role="menuitem"
                aria-label="Export as PDF (.pdf) - Formatted document"
              >
                <FileText className="w-4 h-4 mr-3 text-medical-red-600" aria-hidden="true" />
                PDF (.pdf)
              </button>
            </div>
          </div>
        </>
      )}
      
      <div id="export-info" className="sr-only">
        Export current data to various formats including Excel, CSV, and PDF
      </div>
    </div>
  );
});

export default ExportButton;