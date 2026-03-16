import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, File, CheckCircle2, X, Plus } from 'lucide-react';
import { UploadedFile } from '../types';
import { formatFileSize } from '../utils';

interface FileUploadPanelProps {
  hasUploadedFiles: boolean;
  uploadedFiles: UploadedFile[];
  onFilesUploaded: (files: File[]) => void;
  onClearFiles?: () => void;
}

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  hasUploadedFiles,
  uploadedFiles,
  onFilesUploaded,
  onClearFiles,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesUploaded(files);
  }, [onFilesUploaded]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesUploaded(files);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onFilesUploaded]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Hidden file input shared across both states
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".csv,.xlsx,.xls,.hl7,.json"
      onChange={handleFileInput}
      className="hidden"
    />
  );

  // STATE A: No files uploaded — show drag-and-drop zone
  if (!hasUploadedFiles) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 transition-colors duration-200 text-center
          ${isDragActive
            ? 'border-chrome-600 bg-chrome-50'
            : 'border-chrome-300 bg-white hover:border-chrome-400 hover:bg-chrome-50/50'
          }
        `}
      >
        {fileInput}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isDragActive ? 'bg-chrome-200' : 'bg-chrome-100'
            }`}
          >
            <Upload
              className={`w-7 h-7 ${isDragActive ? 'text-chrome-700' : 'text-chrome-500'}`}
            />
          </div>
          <div>
            <h3 className="text-lg font-body font-semibold text-titanium-800">
              {isDragActive ? 'Drop files here' : 'Drag & drop your data files here'}
            </h3>
            <p className="text-sm text-titanium-500 font-body mt-1">
              Supports CSV, Excel, HL7, FHIR JSON
            </p>
          </div>
          <button
            onClick={handleBrowseClick}
            className="mt-2 px-5 py-2 border border-chrome-300 text-chrome-700 hover:bg-chrome-50 rounded-lg text-sm font-body font-medium transition-colors duration-200"
          >
            Browse Files
          </button>
          <p className="text-xs text-titanium-400 font-body mt-1">
            Supported formats: CSV, Excel (.xlsx), JSON
          </p>
        </div>
      </div>
    );
  }

  // STATE B: Files uploaded — show file list with management controls
  return (
    <div className="bg-white rounded-xl border border-chrome-200 shadow-chrome-card p-4">
      {fileInput}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-body font-semibold text-titanium-800">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBrowseClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium text-chrome-700 border border-chrome-300 rounded-lg hover:bg-chrome-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Upload More
          </button>
          {onClearFiles && (
            <button
              onClick={onClearFiles}
              className="text-xs font-body text-titanium-500 hover:text-titanium-700 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {uploadedFiles.map((file, index) => (
          <div
            key={file.name}
            className="flex items-center gap-3 p-2.5 bg-chrome-50 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-chrome-100 flex items-center justify-center flex-shrink-0">
              {file.type.includes('csv') ||
              file.type.includes('excel') ||
              file.name.endsWith('.xlsx') ||
              file.name.endsWith('.csv') ? (
                <FileText className="w-4 h-4 text-chrome-600" />
              ) : (
                <File className="w-4 h-4 text-chrome-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-medium text-titanium-800 truncate">
                {file.name}
              </p>
              <p className="text-xs text-titanium-400 font-body">
                {formatFileSize(file.size)} • Uploaded{' '}
                {file.uploadedAt.toLocaleTimeString()}
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploadPanel;
