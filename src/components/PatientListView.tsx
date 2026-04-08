import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

export function PatientListView() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm) return;
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('tailrd-session-token');
    fetch(`/api/patients?search=${encodeURIComponent(searchTerm)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setPatients(d.data?.patients || d.patients || []))
      .catch(() => setError('Failed to search patients'))
      .finally(() => setIsLoading(false));
  }, [searchTerm]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-chrome-500" />
        <h1 className="text-2xl font-semibold text-titanium-900">
          {searchTerm ? `Search results for "${searchTerm}"` : 'Patient Search'}
        </h1>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-titanium-500">Searching...</div>
      )}

      {error && (
        <div className="bg-arterial-50 border border-arterial-200 rounded-lg p-4 text-arterial-700">
          {error}
        </div>
      )}

      {!isLoading && !error && patients.length === 0 && searchTerm && (
        <div className="text-center py-12 text-titanium-500">
          No patients found matching "{searchTerm}"
        </div>
      )}

      {!isLoading && !error && !searchTerm && (
        <div className="text-center py-12 text-titanium-500">
          Enter a search term to find patients by name or MRN
        </div>
      )}

      {patients.length > 0 && (
        <div className="bg-white rounded-lg border border-titanium-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-titanium-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-titanium-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-titanium-600">MRN</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-titanium-600">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium-100">
              {patients.map((p: any) => (
                <tr key={p.id} className="hover:bg-titanium-50">
                  <td className="px-4 py-3 text-sm text-titanium-900">
                    {p.lastName}, {p.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm text-titanium-600">{p.mrn}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.riskCategory === 'HIGH' ? 'bg-arterial-100 text-arterial-700' :
                      p.riskCategory === 'MODERATE' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.riskCategory || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
