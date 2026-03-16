import React, { useState } from 'react';
import { Download, FileText, File, Database, ChevronDown } from 'lucide-react';
import { DataExportService, ExportData, ExportOptions } from '../../utils/dataExport';
import { toast } from './Toast';

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

  const formatLabels: Record<string, string> = { excel: 'Excel', csv: 'CSV', pdf: 'PDF' };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
 setIsExporting(true);
 setIsOpen(false);
 const formatLabel = formatLabels[format] || format.toUpperCase();

 toast.info('Preparing Export', `Preparing ${formatLabel} export...`);

 try {
 const options: ExportOptions = {
 format,
 includeTimestamp: true,
 includeMetadata: true
 };

 DataExportService.export(data, options);

 // Add a small delay to show the loading state
 await new Promise(resolve => setTimeout(resolve, 500));

 toast.success('Export Complete', `${data.title || 'Report'} exported as ${formatLabel}.`);
 } catch (error) {
 console.error('Export failed:', error);
 toast.error('Export Failed', 'Export failed. Please try again.', {
   actions: [{ label: 'Retry', onClick: () => handleExport(format), variant: 'primary' }]
 });
 } finally {
 setIsExporting(false);
 }
  };

  const getVariantClasses = () => {
 const baseClasses = 'inline-flex items-center justify-center font-body font-semibold transition-all duration-200 ease-chrome focus:outline-none focus:ring-2 focus:ring-offset-2';

 switch (variant) {
 case 'primary':
 return `${baseClasses} bg-chrome-600 text-white hover:bg-chrome-700 shadow-chrome-card hover:shadow-chrome-card-hover focus:ring-chrome-500`;
 case 'secondary':
 return `${baseClasses} bg-titanium-100 text-titanium-800 hover:bg-titanium-200 shadow-chrome-card hover:shadow-chrome-card-hover focus:ring-titanium-500`;
 case 'outline':
 default:
 return `${baseClasses} bg-white border border-titanium-200 text-titanium-700 hover:bg-titanium-50 shadow-chrome-card hover:shadow-chrome-card-hover focus:ring-chrome-500`;
 }
  };

  const getSizeClasses = () => {
 switch (size) {
 case 'sm':
 return 'px-3 py-1.5 text-xs rounded-lg';
 case 'lg':
 return 'px-6 py-3 text-base rounded-lg';
 case 'md':
 default:
 return 'px-4 py-2 text-sm rounded-lg';
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
 className={`${getIconSize()} ml-2 transition-transform ease-chrome ${isOpen ? 'rotate-180' : ''}`}
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
 className="absolute right-0 mt-1 w-52 bg-white border border-titanium-200 rounded-lg shadow-chrome-elevated z-20 overflow-hidden"
 role="menu"
 aria-label="Export format options"
 >
 <div className="py-1">
 <button
 onClick={() => handleExport('excel')}
 className="w-full px-4 py-2 text-left text-sm font-body text-titanium-700 hover:bg-chrome-50 focus:bg-chrome-50 focus:outline-none flex items-center transition-colors duration-200 ease-chrome"
 role="menuitem"
 aria-label="Export as Excel (.xlsx) - Recommended format"
 >
 <Database className="w-4 h-4 mr-3 text-green-600" aria-hidden="true" />
 Excel (.xlsx)
 <span className="ml-auto text-xs font-body text-titanium-500">Recommended</span>
 </button>
 <button
 onClick={() => handleExport('csv')}
 className="w-full px-4 py-2 text-left text-sm font-body text-titanium-700 hover:bg-chrome-50 focus:bg-chrome-50 focus:outline-none flex items-center transition-colors duration-200 ease-chrome"
 role="menuitem"
 aria-label="Export as CSV (.csv) - Plain text format"
 >
 <File className="w-4 h-4 mr-3 text-chrome-600" aria-hidden="true" />
 CSV (.csv)
 </button>
 <button
 onClick={() => handleExport('pdf')}
 className="w-full px-4 py-2 text-left text-sm font-body text-titanium-700 hover:bg-chrome-50 focus:bg-chrome-50 focus:outline-none flex items-center transition-colors duration-200 ease-chrome"
 role="menuitem"
 aria-label="Export as PDF (.pdf) - Formatted document"
 >
 <FileText className="w-4 h-4 mr-3 text-arterial-600" aria-hidden="true" />
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
