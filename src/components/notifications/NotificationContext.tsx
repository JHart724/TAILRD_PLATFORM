import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { MOCK_NOTIFICATIONS, type CareGapNotification } from './notificationMockData';

/**
 * Single source of truth for notification state (AUDIT-304 shell batch).
 *
 * Before this, the unread count was duplicated across three surfaces that could
 * disagree: the TopBar bell (a static demo dot), the UserMenu "Notifications"
 * badge (hardcoded '3'), and the NotificationPanel body (derived 4). They now
 * all read unreadCount from this provider, so the number is consistent and
 * mark-as-read in the panel updates the bell/menu live.
 *
 * Backed by MOCK_NOTIFICATIONS until the notifications API is wired.
 */
interface NotificationContextValue {
  notifications: CareGapNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<CareGapNotification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead }),
    [notifications, unreadCount, markRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
