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
    if (!DATA_SOURCE.useRealApi) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('tailrd-session-token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${DATA_SOURCE.apiUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
