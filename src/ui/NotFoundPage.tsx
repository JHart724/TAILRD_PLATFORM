import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full" style={{ background: 'rgba(212, 42, 62, 0.1)', border: '1px solid rgba(212, 42, 62, 0.2)' }}>
            <AlertTriangle className="w-10 h-10 text-arterial-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-chrome-100 font-display mb-3">404</h1>
        <h2 className="text-lg font-semibold text-chrome-300 mb-2">Page Not Found</h2>
        <p className="text-chrome-500 text-sm mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Platform Home
        </button>
      </div>
    </div>
  );
}
