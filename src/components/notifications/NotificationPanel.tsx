import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Shield,
  Send,
  Activity,
} from 'lucide-react';
import CareGapOrchestrationCard from './CareGapOrchestrationCard';
import {
  MOCK_NOTIFICATIONS,
  MOCK_ORCHESTRATIONS,
  type CareGapNotification,
  type SeverityLevel,
} from './notificationMockData';

// ── Helpers ─────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD}d ago`;
}

const severityConfig: Record<
  SeverityLevel,
  { border: string; bg: string; icon: React.ElementType; iconColor: string }
> = {
  critical: { border: 'border-l-arterial-600', bg: 'bg-arterial-50', icon: AlertTriangle, iconColor: 'text-arterial-600' },
  high: { border: 'border-l-[#6B7280]', bg: 'bg-[#F0F5FA]', icon: AlertTriangle, iconColor: 'text-[#6B7280]' },
  warning: { border: 'border-l-[#6B7280]', bg: 'bg-[#F0F5FA]', icon: Info, iconColor: 'text-[#6B7280]' },
  info: { border: 'border-l-chrome-500', bg: 'bg-chrome-50', icon: Info, iconColor: 'text-chrome-600' },
  success: { border: 'border-l-emerald-500', bg: 'bg-[#F0F5FA]', icon: CheckCircle, iconColor: 'text-[#2C4A60]' },
};

const typeIcons: Record<string, React.ElementType> = {
  care_gap: Activity,
  referral: ArrowRight,
  escalation: Shield,
  system: Info,
  resolution: CheckCircle,
};

// ── Component ───────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'orchestration'>('notifications');
  const [notifications, setNotifications] = useState<CareGapNotification[]>(MOCK_NOTIFICATIONS);

  // Escape key closes panel
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Sort: unread first, then by timestamp
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [notifications]);

  // Sort orchestrations: featured first, then by detectedAt
  const sortedOrchestrations = useMemo(() => {
    return [...MOCK_ORCHESTRATIONS].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 bg-white border-l border-titanium-200 shadow-chrome-elevated flex flex-col transform transition-transform duration-300 ease-out"
        role="dialog"
        aria-label="Notification Center"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-titanium-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-chrome-600" />
            <h2 className="font-body font-semibold text-titanium-900 text-base">
              Notification Center
            </h2>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-arterial-600 text-white text-[10px] font-data font-semibold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-titanium-400 hover:text-titanium-600 hover:bg-titanium-100 transition-colors"
            aria-label="Close notification panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-titanium-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 text-sm font-body font-medium transition-colors relative ${
              activeTab === 'notifications'
                ? 'text-chrome-700'
                : 'text-titanium-500 hover:text-titanium-700'
            }`}
          >
            Notifications
            {unreadCount > 0 && activeTab !== 'notifications' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-arterial-600 text-white text-[9px] font-data">
                {unreadCount}
              </span>
            )}
            {activeTab === 'notifications' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-chrome-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('orchestration')}
            className={`flex-1 px-4 py-3 text-sm font-body font-medium transition-colors relative ${
              activeTab === 'orchestration'
                ? 'text-chrome-700'
                : 'text-titanium-500 hover:text-titanium-700'
            }`}
          >
            Care Gap Tracker
            {activeTab === 'orchestration' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-chrome-600" />
            )}
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'notifications' && (
            <div>
              {/* Mark all read */}
              {unreadCount > 0 && (
                <div className="px-5 py-2 flex justify-end border-b border-titanium-100">
                  <button
                    onClick={markAllRead}
                    className="text-xs font-body text-chrome-600 hover:text-chrome-700 hover:underline transition-colors"
                  >
                    Mark all as read
                  </button>
                </div>
              )}

              {/* Notification list */}
              <div className="divide-y divide-titanium-100">
                {sortedNotifications.map((notif) => {
                  const sev = severityConfig[notif.severity];
                  const TypeIcon = typeIcons[notif.type] || Info;
                  const SevIcon = sev.icon;

                  return (
                    <button
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={`w-full text-left px-5 py-3.5 transition-colors border-l-3 ${sev.border} ${
                        notif.isRead ? 'bg-white' : 'bg-chrome-50/60'
                      } hover:bg-chrome-50`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${sev.bg}`}
                        >
                          <SevIcon size={13} className={sev.iconColor} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`text-xs font-body leading-snug ${
                                notif.isRead
                                  ? 'font-medium text-titanium-700'
                                  : 'font-semibold text-titanium-900'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="font-data text-[10px] text-titanium-400 flex-shrink-0 mt-0.5">
                              {formatTimestamp(notif.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] font-body text-titanium-500 mt-1 leading-relaxed line-clamp-3">
                            {notif.message}
                          </p>
                          {/* Module + patient tags */}
                          {(notif.moduleLabel || notif.patientName) && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {notif.moduleLabel && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-body font-medium bg-chrome-100 text-chrome-700">
                                  {notif.moduleLabel}
                                </span>
                              )}
                              {notif.patientName && (
                                <span className="text-[10px] font-data text-titanium-400">
                                  {notif.patientName}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Unread indicator dot */}
                          {!notif.isRead && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-arterial-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'orchestration' && (
            <div className="p-4 space-y-3">
              {/* Header text */}
              <div className="px-1 pb-2">
                <p className="text-xs font-body text-titanium-500 leading-relaxed">
                  Active care gap orchestrations with real-time status tracking.
                  Each case follows the TAILRD pathway: Detection &rarr; Notification &rarr;
                  Response Window &rarr; Escalation &rarr; Safety Net.
                </p>
              </div>

              {/* Orchestration cards */}
              {sortedOrchestrations.map((orch) => (
                <div key={orch.id} className="relative">
                  {orch.isFeatured && (
                    <div className="absolute -top-1 right-3 z-10">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-body font-bold uppercase tracking-wider bg-arterial-600 text-white shadow-sm">
                        Active Escalation
                      </span>
                    </div>
                  )}
                  <CareGapOrchestrationCard
                    orchestration={orch}
                    defaultExpanded={orch.isFeatured === true}
                  />
                </div>
              ))}

              {/* Summary callout */}
              <div className="mt-4 bg-chrome-50 rounded-lg px-4 py-3 border border-chrome-200">
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-chrome-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-body font-semibold text-chrome-700">
                      TAILRD Active Orchestration
                    </p>
                    <p className="text-[11px] font-body text-titanium-600 mt-0.5 leading-relaxed">
                      Unlike passive EMR prompts that miss up to 40% of severe cases,
                      TAILRD&apos;s detection-to-referral pipeline ensures every identified
                      patient receives timely evaluation through automated escalation
                      and safety-net referrals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-titanium-200 bg-chrome-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-data text-titanium-400">
              {notifications.length} notifications &middot; {MOCK_ORCHESTRATIONS.length} active cases
            </span>
            <span className="text-[10px] font-body text-titanium-400">
              Powered by TAILRD Detection Engine
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
