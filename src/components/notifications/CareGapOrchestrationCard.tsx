import React, { useState } from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Shield,
  Send,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  FileText,
} from 'lucide-react';
import type { CareGapOrchestration, OrchestrationStage } from './notificationMockData';

// ── Helpers ─────────────────────────────────────────────────

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function getCountdown(): string {
  // Static countdown for demo purposes
  return '3h 47m';
}

const stageIcons: Record<string, React.ElementType> = {
  Detection: Activity,
  'Physician Notification': Send,
  'Response Window': Clock,
  'Physician Response': CheckCircle,
  Escalation: AlertTriangle,
  'Auto-Referral Safety Net': Shield,
  'Referral & Scheduling': FileText,
  Resolved: CheckCircle,
  'Awaiting Response': Clock,
  Resolution: CheckCircle,
};

// ── Component ───────────────────────────────────────────────

interface Props {
  orchestration: CareGapOrchestration;
  defaultExpanded?: boolean;
}

export default function CareGapOrchestrationCard({ orchestration, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showOptOut, setShowOptOut] = useState(false);
  const [optOutReason, setOptOutReason] = useState('');
  const [actionTaken, setActionTaken] = useState<string | null>(null);

  const o = orchestration;
  const hasActiveStage = o.stages.some((s) => s.status === 'active');
  const isResolved = o.severity === 'success';

  const handleConfirmReferral = () => {
    setActionTaken('confirmed');
    // Use global toast if available
    if (typeof window !== 'undefined' && (window as any).addToast) {
      (window as any).addToast({
        type: 'success',
        title: 'Referral Confirmed',
        message: `Referral to ${o.moduleLabel} initiated for ${o.patientName}. Coordinator will be assigned.`,
        duration: 5000,
      });
    }
  };

  const handleOptOut = () => {
    if (!optOutReason.trim()) return;
    setActionTaken('opted_out');
    setShowOptOut(false);
    if (typeof window !== 'undefined' && (window as any).addToast) {
      (window as any).addToast({
        type: 'info',
        title: 'Opt-Out Recorded',
        message: `Opt-out logged for ${o.patientName}. Reason documented in audit trail.`,
        duration: 5000,
      });
    }
  };

  // ── Severity border color ──
  const borderColor = isResolved
    ? 'border-l-emerald-500'
    : o.severity === 'critical'
    ? 'border-l-arterial-600'
    : o.severity === 'high'
    ? 'border-l-[#6B7280]'
    : 'border-l-chrome-500';

  return (
    <div className={`bg-white rounded-lg border border-titanium-200 shadow-chrome-card overflow-hidden border-l-4 ${borderColor}`}>
      {/* ── Patient Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-chrome-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-chrome-100 flex items-center justify-center">
            <User size={16} className="text-chrome-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-body font-semibold text-titanium-900 text-sm">
                {o.patientName}
              </span>
              <span className="font-data text-xs text-titanium-500">
                {o.patientAge}{o.patientSex} &middot; {o.patientMRN}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-body font-medium ${
                  isResolved
                    ? 'bg-[#F0F5FA] text-[#2C4A60] border border-[#C8D4DC]'
                    : o.severity === 'critical'
                    ? 'bg-arterial-50 text-arterial-700 border border-arterial-200'
                    : 'bg-[#F0F5FA] text-[#6B7280] border border-[#C8D4DC]'
                }`}
              >
                {o.condition}
              </span>
              <span className="text-xs text-titanium-400 font-body">{o.moduleLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Current stage pill */}
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-body font-medium ${
              isResolved
                ? 'bg-[#F0F5FA] text-[#2C4A60]'
                : hasActiveStage
                ? 'bg-arterial-50 text-arterial-700'
                : 'bg-chrome-100 text-chrome-700'
            }`}
          >
            {isResolved
              ? 'Resolved'
              : o.stages.find((s) => s.status === 'active')?.stage || o.currentStage}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-titanium-400" />
          ) : (
            <ChevronDown size={16} className="text-titanium-400" />
          )}
        </div>
      </button>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div className="border-t border-titanium-100 px-5 py-4 space-y-5">
          {/* Echo data strip */}
          {o.echo && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Aortic Valve Area', value: o.echo.avArea, critical: true },
                { label: 'Mean Gradient', value: o.echo.meanGradient, critical: true },
                { label: 'Peak Velocity', value: o.echo.peakVelocity, critical: true },
                { label: 'LVEF', value: o.echo.ef, critical: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-chrome-50 rounded-lg px-3 py-2.5 border border-chrome-100"
                >
                  <div className="text-[10px] uppercase tracking-wider text-titanium-500 font-body mb-1">
                    {item.label}
                  </div>
                  <div
                    className={`font-data text-base font-semibold ${
                      item.critical ? 'text-arterial-600' : 'text-chrome-700'
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guideline basis */}
          <div className="flex items-start gap-2 bg-chrome-50/50 rounded-lg px-3 py-2.5 border border-chrome-100">
            <FileText size={14} className="text-chrome-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-titanium-600 font-body leading-relaxed">
              <span className="font-semibold">Guideline:</span> {o.guidelineBasis}
            </p>
          </div>

          {/* ── Orchestration Timeline ── */}
          <div className="relative pl-6">
            {o.stages.map((stage, idx) => {
              const isLast = idx === o.stages.length - 1;
              const IconComponent = stageIcons[stage.stage] || Circle;

              return (
                <div key={stage.id} className="relative pb-5 last:pb-0">
                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={`absolute left-[-12px] top-6 w-0.5 bottom-0 ${
                        stage.status === 'completed'
                          ? 'bg-chrome-300'
                          : stage.status === 'active'
                          ? 'bg-gradient-to-b from-arterial-400 to-titanium-200'
                          : 'bg-titanium-200'
                      }`}
                    />
                  )}

                  {/* Node */}
                  <div
                    className={`absolute left-[-20px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                      stage.status === 'completed'
                        ? 'bg-chrome-600'
                        : stage.status === 'active'
                        ? 'bg-arterial-600 animate-pulse'
                        : 'bg-white border-2 border-titanium-300'
                    }`}
                  >
                    {stage.status === 'completed' ? (
                      <CheckCircle size={10} className="text-white" />
                    ) : stage.status === 'active' ? (
                      <IconComponent size={8} className="text-white" />
                    ) : null}
                  </div>

                  {/* Stage content */}
                  <div className="ml-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-body font-semibold ${
                          stage.status === 'active'
                            ? 'text-arterial-700'
                            : stage.status === 'completed'
                            ? 'text-titanium-800'
                            : 'text-titanium-400'
                        }`}
                      >
                        {stage.stage}
                      </span>
                      {stage.timestamp && (
                        <span className="font-data text-[11px] text-titanium-400">
                          {formatTimestamp(stage.timestamp)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-body mt-0.5 leading-relaxed ${
                        stage.status === 'pending' ? 'text-titanium-400' : 'text-titanium-600'
                      }`}
                    >
                      {stage.description}
                    </p>
                    {stage.detail && stage.status !== 'pending' && (
                      <p className="text-[11px] font-body text-titanium-500 mt-1 leading-relaxed">
                        {stage.detail}
                      </p>
                    )}
                    {stage.actor && (
                      <div className="flex items-center gap-1 mt-1">
                        <User size={10} className="text-titanium-400" />
                        <span className="text-[10px] font-body text-titanium-400">
                          {stage.actor}
                        </span>
                      </div>
                    )}

                    {/* Active stage: countdown + actions */}
                    {stage.status === 'active' && !actionTaken && !isResolved && (
                      <div className="mt-3 space-y-3">
                        {o.severity === 'critical' && (
                          <div className="flex items-center gap-2 bg-arterial-50 rounded-lg px-3 py-2 border border-arterial-100">
                            <Clock size={14} className="text-arterial-600" />
                            <span className="font-data text-sm font-semibold text-arterial-700">
                              Auto-referral in {getCountdown()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleConfirmReferral}
                            className="px-4 py-1.5 rounded-lg text-xs font-body font-semibold text-white bg-gradient-to-r from-arterial-600 to-arterial-700 hover:from-arterial-700 hover:to-arterial-800 shadow-sm transition-all"
                          >
                            Confirm Referral
                          </button>
                          <button
                            onClick={() => setShowOptOut(!showOptOut)}
                            className="px-4 py-1.5 rounded-lg text-xs font-body font-semibold text-titanium-600 border border-titanium-300 hover:bg-titanium-50 transition-colors"
                          >
                            Opt Out
                          </button>
                        </div>
                        {showOptOut && (
                          <div className="bg-titanium-50 rounded-lg p-3 border border-titanium-200 space-y-2">
                            <label className="text-xs font-body font-semibold text-titanium-700">
                              Reason for opt-out (required):
                            </label>
                            <textarea
                              value={optOutReason}
                              onChange={(e) => setOptOutReason(e.target.value)}
                              placeholder="e.g., Patient has significant frailty / life-limiting comorbidity / patient preference..."
                              className="w-full px-3 py-2 text-xs font-body border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-400 resize-none"
                              rows={2}
                            />
                            <button
                              onClick={handleOptOut}
                              disabled={!optOutReason.trim()}
                              className="px-3 py-1 rounded text-xs font-body font-semibold text-white bg-titanium-600 hover:bg-titanium-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Submit Opt-Out
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action confirmation */}
                    {stage.status === 'active' && actionTaken && (
                      <div
                        className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body font-medium ${
                          actionTaken === 'confirmed'
                            ? 'bg-[#F0F5FA] text-[#2C4A60] border border-[#C8D4DC]'
                            : 'bg-titanium-100 text-titanium-600 border border-titanium-200'
                        }`}
                      >
                        <CheckCircle size={14} />
                        {actionTaken === 'confirmed'
                          ? 'Referral confirmed — coordinator will be assigned'
                          : 'Opt-out recorded — documented in audit trail'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Impact callout (featured AS cases only) ── */}
          {o.module === 'structural' && o.condition.includes('Aortic Stenosis') && (
            <div className="bg-chrome-50 rounded-lg px-4 py-3 border border-chrome-200">
              <p className="text-xs font-body text-titanium-600 leading-relaxed">
                <span className="font-semibold text-chrome-700">Why this matters:</span>{' '}
                Studies show passive echo prompts achieve only ~60% referral rates for severe AS,
                with unreferred patients facing 19.6% mortality vs 2.3% for referred patients.
                TAILRD&apos;s active orchestration with escalation achieves 94% referral rates
                within 72 hours — ensuring patients like {o.patientName} are not missed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
