/**
 * Hook for fetching admin dashboard data from the real backend API.
 * Falls back to null when the backend is unavailable (frontend renders its own defaults).
 */

import { useState, useEffect } from 'react';
import { DATA_SOURCE } from '../config/dataSource';

/**
 * Flat shape consumed by admin dashboard components
 * (PlatformOverview, DataManagement, AuditSecurity).
 *
 * Components access these fields directly (e.g. `dashboard.totalPatients`)
 * so missing or undefined values cause runtime crashes
 * (`Cannot read properties of undefined (reading 'toLocaleString')`).
 *
 * The adapter `transformDashboard` below maps the backend's nested response
 * into this flat shape with defensive null-coalescing — every field defaults
 * to a safe zero/empty value rather than undefined.
 */
interface AdminDashboard {
  totalHospitals: number;
  activeHospitals: number;
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  recentPatients: number;
  totalWebhookEvents: number;
  recentWebhookEvents: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  /** Subscription counts by tier (lowercased keys: enterprise, professional, ...) */
  subscriptions: Record<string, number>;
  /** Hospital counts per clinical module */
  modules: Record<string, number>;
  recentHospitals: Array<Record<string, unknown>>;
}

/**
 * Nested shape that `/api/admin/dashboard` actually returns. Defined here
 * to keep the adapter visible alongside the consumer type.
 *
 * Source: backend/src/routes/admin.ts router.get('/dashboard') response body
 * (the `dashboardData` const, ~line 138).
 */
interface BackendDashboardResponse {
  overview?: {
    hospitals?: { total?: number; active?: number; inactive?: number };
    users?: { total?: number; active?: number; inactive?: number };
    patients?: { total?: number; recentlyAdded?: number };
    webhooks?: { total?: number; recent24h?: number };
    alerts?: { total?: number; unacknowledged?: number };
  };
  subscriptions?: Record<string, number>;
  modules?: Record<string, number>;
  recentHospitals?: Array<Record<string, unknown>>;
}

function transformDashboard(raw: BackendDashboardResponse | null | undefined): AdminDashboard {
  const safe = raw || {};
  return {
    totalHospitals: safe.overview?.hospitals?.total ?? 0,
    activeHospitals: safe.overview?.hospitals?.active ?? 0,
    totalUsers: safe.overview?.users?.total ?? 0,
    activeUsers: safe.overview?.users?.active ?? 0,
    totalPatients: safe.overview?.patients?.total ?? 0,
    recentPatients: safe.overview?.patients?.recentlyAdded ?? 0,
    totalWebhookEvents: safe.overview?.webhooks?.total ?? 0,
    recentWebhookEvents: safe.overview?.webhooks?.recent24h ?? 0,
    totalAlerts: safe.overview?.alerts?.total ?? 0,
    unacknowledgedAlerts: safe.overview?.alerts?.unacknowledged ?? 0,
    subscriptions: safe.subscriptions ?? {},
    modules: safe.modules ?? {},
    recentHospitals: safe.recentHospitals ?? [],
  };
}

interface AdminAnalytics {
  totalHospitals: number;
  activeUsers: number;
  totalPatients: number;
  totalGaps: number;
}

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DATA_SOURCE.useRealApi) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('tailrd-session-token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${DATA_SOURCE.apiUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(json => {
        // Backend returns nested objects (overview.patients.total, etc.) but
        // dashboard components consume flat fields (totalPatients, etc.).
        // Adapter maps the nested response into the flat shape with safe
        // defaults so missing fields render as 0 rather than crash.
        setData(transformDashboard(json.data || json));
        setError(null);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/admin/analytics')
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

/** Fetch hospitals list from admin API */
export function useAdminHospitals() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/admin/hospitals')
      .then(d => setData(Array.isArray(d) ? d : d?.hospitals || null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, refetch: () => {
    setLoading(true);
    adminFetch('/admin/hospitals').then(d => setData(Array.isArray(d) ? d : d?.hospitals || null)).finally(() => setLoading(false));
  }};
}

/** Fetch a single user's login history + recent actions from admin API */
export interface UserActivityLogin {
  id: string;
  timestamp: string;
  ip: string | null;
  success: boolean;
  action: string;
  description: string | null;
}

export interface UserActivityAction {
  id: string;
  timestamp: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  detail: string | null;
}

export interface UserActivity {
  userId: string;
  userEmail: string;
  hospitalId: string;
  loginHistory: UserActivityLogin[];
  recentActions: UserActivityAction[];
}

export function useUserActivity(userId: string | null | undefined) {
  const [data, setData] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    adminFetch(`/admin/users/${encodeURIComponent(userId)}/activity?limit=20`)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading };
}

/** Fetch users list from admin API */
export function useAdminUsers() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/admin/users')
      .then(d => setData(Array.isArray(d) ? d : d?.users || null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, refetch: () => {
    setLoading(true);
    adminFetch('/admin/users').then(d => setData(Array.isArray(d) ? d : d?.users || null)).finally(() => setLoading(false));
  }};
}

/** Shared admin API fetch with auth */
async function adminFetch(path: string): Promise<any> {
  if (!DATA_SOURCE.useRealApi) return null;

  const token = localStorage.getItem('tailrd-session-token');
  if (!token) return null;

  try {
    const r = await fetch(`${DATA_SOURCE.apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const json = await r.json();
    return json.data || json;
  } catch {
    return null;
  }
}
