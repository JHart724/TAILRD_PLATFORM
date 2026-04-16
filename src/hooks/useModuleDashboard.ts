import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

export function useModuleDashboard(moduleSlug: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/modules/${moduleSlug}/dashboard`)
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError(e?.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleSlug]);
  return { data, loading, error };
}
