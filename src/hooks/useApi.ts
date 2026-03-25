/**
 * Lightweight data-fetching hooks for TAILRD Platform.
 * No external dependencies (no react-query / tanstack).
 * Caches responses for 5 minutes and falls back to mock data
 * when DATA_SOURCE.useRealApi is false.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DATA_SOURCE } from '../config/dataSource';
import {
  getModuleGaps,
  getGapPatients,
  getPlatformTotals,
  getExecutiveDashboard,
  getRegistryCases,
  getTrials,
  type ClinicalGap,
  type GapPatient,
  type PlatformTotals,
  type ExecutiveData,
  type RegistryCase,
  type Trial,
  type TrialFilters,
} from '../services/api';

// ─── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string, staleTime: number): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < staleTime) {
    return entry.data as T;
  }
  return undefined;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Generic useApiQuery ────────────────────────────────────────────────────

export interface UseApiQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApiQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { enabled?: boolean; staleTime?: number }
): UseApiQueryResult<T> {
  const enabled = options?.enabled !== false;
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  const [data, setData] = useState<T | undefined>(() => getCached<T>(key, staleTime));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = getCached<T>(key, staleTime);
    if (cached !== undefined) {
      setData(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setCache(key, result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [key, enabled, staleTime, fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return { data, isLoading, error, refetch };
}

// ─── Domain-specific hooks ──────────────────────────────────────────────────

/**
 * Fetch clinical gaps for a module.
 * Returns undefined (no fetch) when useRealApi is false.
 */
export function useModuleGaps(moduleId: string) {
  return useApiQuery<ClinicalGap[]>(
    `module-gaps-${moduleId}`,
    () => getModuleGaps(moduleId),
    { enabled: DATA_SOURCE.useRealApi && !!moduleId }
  );
}

export function useGapPatients(gapId: string) {
  return useApiQuery<GapPatient[]>(
    `gap-patients-${gapId}`,
    () => getGapPatients(gapId),
    { enabled: DATA_SOURCE.useRealApi && !!gapId }
  );
}

export function usePlatformTotals() {
  return useApiQuery<PlatformTotals>(
    'platform-totals',
    () => getPlatformTotals(),
    { enabled: DATA_SOURCE.useRealApi }
  );
}

export function useExecutiveDashboard(moduleId: string) {
  return useApiQuery<ExecutiveData>(
    `executive-dashboard-${moduleId}`,
    () => getExecutiveDashboard(moduleId),
    { enabled: DATA_SOURCE.useRealApi && !!moduleId }
  );
}

export function useRegistryCases(registryType: string) {
  return useApiQuery<RegistryCase[]>(
    `registry-cases-${registryType}`,
    () => getRegistryCases(registryType),
    { enabled: DATA_SOURCE.useRealApi && !!registryType }
  );
}

export function useTrials(filters?: TrialFilters) {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  return useApiQuery<Trial[]>(
    `trials-${filterKey}`,
    () => getTrials(filters),
    { enabled: DATA_SOURCE.useRealApi }
  );
}
