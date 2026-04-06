/**
 * Hook for fetching admin dashboard data from the real backend API.
 * Falls back to null when the backend is unavailable (frontend renders its own defaults).
 */

import { useState, useEffect } from 'react';
import { DATA_SOURCE } from '../config/dataSource';

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
  subscriptionStats: { subscriptionTier: string; _count: { subscriptionTier: number } }[];
  moduleStats: { module: string; hospitals: number }[];
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
        setData(json.data || json);
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
