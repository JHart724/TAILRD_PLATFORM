import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { normalizeSource, type Provenance } from '../types/provenance';

/**
 * AUDIT-208: the hook now SURFACES the payload's own provenance instead of discarding it.
 *
 * The backend has always emitted `source` on these payloads (`modules.ts` sends 'database'), and
 * before this change zero components read it - the one machine-generated provenance signal in the
 * system was computed by the server and dropped at the client boundary. That is the AUDIT-325 class
 * in miniature, which is why it is the first thing this arc fixes.
 *
 * `provenance` degrades to 'unsourced' for any payload that does not say - an unknown source must
 * never read as a database claim.
 */
export function useModuleDashboard(moduleSlug: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<Provenance>('unsourced');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/modules/${moduleSlug}/dashboard`)
      .then(d => {
        if (!cancelled) {
          setData(d);
          setProvenance(normalizeSource((d as { source?: string } | null)?.source));
          setError(null);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load');
          setProvenance('unsourced');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleSlug]);
  return { data, loading, error, provenance };
}
