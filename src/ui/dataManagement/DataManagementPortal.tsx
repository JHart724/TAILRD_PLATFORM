import React, { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { DATA_SOURCE } from '../../config/dataSource';

interface UploadJob {
  jobId: string;
  status: 'PENDING' | 'VALIDATING' | 'PROCESSING' | 'DETECTING_GAPS' | 'COMPLETE' | 'FAILED' | 'REJECTED_PHI';
  fileName?: string;
  totalRows?: number;
  processedRows?: number;
  errorRows?: number;
  patientsCreated?: number;
  patientsUpdated?: number;
  gapFlagsCreated?: number;
  errorMessage?: string;
  createdAt?: string;
}

const DataManagementPortal: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [moduleId, setModuleId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<UploadJob | null>(null);
  const [uploadHistory] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules = [
    { id: 'hf', name: 'Heart Failure' },
    { id: 'ep', name: 'Electrophysiology' },
    { id: 'cad', name: 'Coronary Intervention' },
    { id: 'sh', name: 'Structural Heart' },
    { id: 'vd', name: 'Valvular Disease' },
    { id: 'pv', name: 'Peripheral Vascular' },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv'))) {
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !moduleId) return;
    setUploading(true);

    try {
      const content = await selectedFile.text();
      const token = localStorage.getItem('tailrd_token');
      const response = await fetch(`${DATA_SOURCE.apiUrl}/data/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          csvContent: content,
          moduleId,
          fileName: selectedFile.name,
        }),
      });

      const result = await response.json();
      setCurrentJob(result);

      if (result.status === 'COMPLETE') {
        setSelectedFile(null);
        setModuleId('');
      }
    } catch (_error) {
      setCurrentJob({ jobId: '', status: 'FAILED', errorMessage: 'Network error - could not reach server' });
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETE: 'bg-[#F0F5FA] text-[#2C4A60]',
      FAILED: 'bg-red-100 text-red-800',
      REJECTED_PHI: 'bg-[#FAF6E8] text-[#8B6914]',
      PENDING: 'bg-slate-100 text-slate-600',
      VALIDATING: 'bg-blue-100 text-blue-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      DETECTING_GAPS: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Upload className="w-7 h-7 text-[#2C4A60]" />
          <div>
            <h1 className="text-2xl font-bold text-[#2C4A60]">Data Management</h1>
            <p className="text-sm text-slate-500">Upload de-identified clinical data for gap detection analysis</p>
          </div>
        </div>

        {/* Section 1: Upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload New File</h2>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#2C4A60] bg-slate-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600">Drag and drop a CSV or TSV file here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />

          <div className="flex items-center gap-4 mt-4">
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">Select module...</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || !moduleId || uploading}
              className="px-5 py-2 bg-[#2C4A60] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a5d77] transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </button>
          </div>
        </div>

        {/* Section 2: Processing Status */}
        {currentJob && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Processing Status</h2>

            {currentJob.status === 'REJECTED_PHI' ? (
              <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#6B7280] mt-0.5" />
                  <div>
                    <p className="font-medium text-[#6B7280]">File Rejected -- Potential PHI Detected</p>
                    <p className="text-sm text-[#6B7280] mt-1">Please verify the file is fully de-identified and re-upload.</p>
                  </div>
                </div>
              </div>
            ) : currentJob.status === 'FAILED' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Processing Failed</p>
                    <p className="text-sm text-red-700 mt-1">{currentJob.errorMessage || 'An error occurred during processing.'}</p>
                  </div>
                </div>
              </div>
            ) : currentJob.status === 'COMPLETE' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#2C4A60]">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Processing Complete</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#2C4A60]">{currentJob.processedRows || 0}</p>
                    <p className="text-xs text-slate-500">Rows Processed</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#2C4A60]">{currentJob.patientsCreated || 0}</p>
                    <p className="text-xs text-slate-500">New Patients</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{currentJob.patientsUpdated || 0}</p>
                    <p className="text-xs text-slate-500">Updated</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#2C4A60]">{currentJob.gapFlagsCreated || 0}</p>
                    <p className="text-xs text-slate-500">Gaps Identified</p>
                  </div>
                </div>
                {(currentJob.errorRows || 0) > 0 && (
                  <p className="text-xs text-[#6B7280]">{currentJob.errorRows} rows had validation errors</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(['VALIDATING', 'PROCESSING', 'DETECTING_GAPS', 'COMPLETE'] as const).map((step, i) => {
                  const steps = ['VALIDATING', 'PROCESSING', 'DETECTING_GAPS', 'COMPLETE'];
                  const currentIdx = steps.indexOf(currentJob.status);
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      {done ? <CheckCircle className="w-4 h-4 text-[#2C4A60]" /> :
                       active ? <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" /> :
                       <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                      <span className={`text-sm ${active ? 'text-blue-700 font-medium' : done ? 'text-[#2C4A60]' : 'text-slate-400'}`}>
                        {step.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Upload History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload History</h2>
          {uploadHistory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No previous uploads</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-2 text-slate-500 font-medium">File</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Status</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Patients</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Gaps</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((job) => (
                  <tr key={job.jobId} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '--'}</td>
                    <td className="py-2 text-slate-700">{job.fileName || '--'}</td>
                    <td className="py-2">{statusBadge(job.status)}</td>
                    <td className="py-2 text-right text-slate-600">{(job.patientsCreated || 0) + (job.patientsUpdated || 0)}</td>
                    <td className="py-2 text-right text-slate-600">{job.gapFlagsCreated || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagementPortal;
