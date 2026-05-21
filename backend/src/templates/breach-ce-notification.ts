/**
 * breach-ce-notification - BA-to-CE breach notification template.
 *
 * Renders the §164.410 notification a Business Associate sends to its
 * Covered Entity upon discovery of a PHI breach. Template-with-variable-
 * substitution per Q-5BRC-E (template source code carries no PHI; the
 * BreachIncident + CoveredEntity record fields are projected in at render
 * time via the input contract below).
 *
 * Required content per 45 CFR 164.404(c)(1) [incorporated by reference at
 * 164.410(c)(1)]:
 *   A. Identification of each individual whose unsecured PHI has been, or
 *      is reasonably believed to have been, accessed/acquired/used/disclosed
 *      during the breach (may be a count + class identification per
 *      164.404(c)(1)(A) when individual list is not yet finalized).
 *   B. Brief description of what happened including the date of breach and
 *      date of discovery, if known.
 *   C. Description of the types of unsecured PHI involved (name, SSN,
 *      account number, date of birth, etc.) without naming any individuals.
 *   D. Steps individuals should take to protect themselves from potential
 *      harm resulting from the breach.
 *   E. Brief description of what the BA is doing to investigate, mitigate
 *      harm, and protect against further breaches.
 *   F. Contact procedures for the individual to ask questions (toll-free
 *      phone, email, website, or postal address).
 *
 * Additional 164.410-specific elements:
 *   - 60-day deadline from discovery (BA must notify CE without unreasonable
 *     delay and in no case later than 60 calendar days from discovery).
 *   - BA-acts-as-agent determination per 164.402: if BA is an agent of the
 *     CE (per federal common law of agency), breach is deemed discovered by
 *     CE at moment of BA discovery. If non-agent, CE's 60-day clock starts
 *     when CE receives notification from BA.
 *
 * Source code discipline: hyphen-only formatting per DRIFT-44. Rendered
 * output may legitimately include em-dashes if breach record source data
 * (e.g., a clinician-authored breach description) contains them; the
 * template substitution is opaque to character class.
 */

import type { BreachType } from '@prisma/client';

// ─── Input contract ────────────────────────────────────────────────────────

export interface BreachCeNotificationTemplateInput {
  // Breach identity
  breachId: string;

  // Covered Entity recipient identity
  ceName: string;
  ceLegalName: string | null;
  cePrimaryContactName: string | null;

  // Required content A: affected individuals
  affectedIndividualsCount: number;
  affectedIndividualsDescription: string;

  // Required content B: brief description
  discoveredAt: Date;
  breachOccurredAt: Date | null;
  breachDescription: string;
  breachType: BreachType;

  // Required content C: types of PHI involved
  typesOfPhiInvolved: string[];

  // Required content D: steps individuals should take
  mitigationStepsForIndividuals: string[];

  // Required content E: BA investigation + mitigation
  baMitigationActions: string;

  // Required content F: contact procedures
  baContactName: string;
  baContactEmail: string;
  baContactPhone: string;
  baContactAddress: string | null;

  // 164.410-specific elements
  sixtyDayDeadline: Date;
  baActsAsAgent: boolean;
  baActsAsAgentRationale: string | null;
}

export interface RenderedBreachCeNotification {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

// ─── Rendering helpers ─────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatBreachType(type: BreachType): string {
  const labels: Record<BreachType, string> = {
    UNAUTHORIZED_ACCESS: 'Unauthorized access to PHI',
    UNAUTHORIZED_DISCLOSURE: 'Unauthorized disclosure of PHI',
    LOSS_OF_DATA: 'Loss of PHI-containing data',
    THEFT_OF_DATA: 'Theft of PHI-containing data',
    IMPROPER_DISPOSAL: 'Improper disposal of PHI',
    HACKING_IT_INCIDENT: 'Hacking or IT security incident affecting PHI',
    OTHER: 'Other PHI breach incident',
  };
  return labels[type] ?? 'PHI breach incident';
}

function bulletList(items: string[]): string {
  if (items.length === 0) {
    return '(none documented at time of notification)';
  }
  return items.map((item) => `  - ${item}`).join('\n');
}

function bulletListHtml(items: string[]): string {
  if (items.length === 0) {
    return '<p><em>None documented at time of notification.</em></p>';
  }
  const lis = items.map((item) => `    <li>${escapeHtml(item)}</li>`).join('\n');
  return `<ul>\n${lis}\n</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Public render API ─────────────────────────────────────────────────────

export function renderBreachCeNotification(
  input: BreachCeNotificationTemplateInput,
): RenderedBreachCeNotification {
  const subject = `HIPAA Breach Notification under 45 CFR 164.410 - Breach ${input.breachId}`;

  const agentLine = input.baActsAsAgent
    ? `BA acts as an agent of the Covered Entity per 164.402 (rationale: ${input.baActsAsAgentRationale ?? 'documented in BAA'}). Breach is deemed discovered by the Covered Entity at the moment of BA discovery.`
    : `BA does not act as an agent of the Covered Entity per 164.402 (rationale: ${input.baActsAsAgentRationale ?? 'documented in BAA'}). The Covered Entity 60-day notification clock starts upon receipt of this notification.`;

  const occurredLine = input.breachOccurredAt
    ? `Date of breach: ${formatDate(input.breachOccurredAt)}`
    : 'Date of breach: unknown at time of notification';

  const bodyText = [
    `BUSINESS ASSOCIATE BREACH NOTIFICATION`,
    `45 CFR 164.410`,
    ``,
    `To: ${input.cePrimaryContactName ?? 'Privacy Officer'}, ${input.ceLegalName ?? input.ceName}`,
    `From: ${input.baContactName}`,
    `Breach ID: ${input.breachId}`,
    ``,
    `This notification is provided by TAILRD Heart Platform as a Business Associate under 45 CFR 164.410. Notification is being delivered to the Covered Entity without unreasonable delay and in any event no later than ${formatDate(input.sixtyDayDeadline)} (within 60 calendar days from discovery).`,
    ``,
    `--- 164.404(c)(1)(A): Affected Individuals ---`,
    `Number of affected individuals: ${input.affectedIndividualsCount}`,
    `Description: ${input.affectedIndividualsDescription}`,
    ``,
    `--- 164.404(c)(1)(B): Description of the Breach ---`,
    `Type: ${formatBreachType(input.breachType)}`,
    `Date of discovery: ${formatDate(input.discoveredAt)}`,
    occurredLine,
    `Brief description: ${input.breachDescription}`,
    ``,
    `--- 164.404(c)(1)(C): Types of PHI Involved ---`,
    bulletList(input.typesOfPhiInvolved),
    ``,
    `--- 164.404(c)(1)(D): Steps Individuals Should Take ---`,
    bulletList(input.mitigationStepsForIndividuals),
    ``,
    `--- 164.404(c)(1)(E): BA Investigation and Mitigation ---`,
    input.baMitigationActions,
    ``,
    `--- 164.404(c)(1)(F): Contact Procedures ---`,
    `Contact name: ${input.baContactName}`,
    `Email: ${input.baContactEmail}`,
    `Phone: ${input.baContactPhone}`,
    input.baContactAddress ? `Address: ${input.baContactAddress}` : '',
    ``,
    `--- 164.410: Agency Determination ---`,
    agentLine,
    ``,
    `--- Acknowledgment Request ---`,
    `Please acknowledge receipt of this notification at your earliest convenience to enable the burden-of-proof retention record required under 164.414(b). Acknowledgment may be returned by reply email to ${input.baContactEmail}.`,
    ``,
    `End of notification.`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const bodyHtml = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 32px; color: #1E293B;">
  <h1 style="color: #2C4A60; font-size: 22px; margin: 0 0 8px;">Business Associate Breach Notification</h1>
  <p style="color: #64748B; font-size: 13px; margin: 0 0 24px;">45 CFR 164.410 | Breach ID: <code>${escapeHtml(input.breachId)}</code></p>
  <p><strong>To:</strong> ${escapeHtml(input.cePrimaryContactName ?? 'Privacy Officer')}, ${escapeHtml(input.ceLegalName ?? input.ceName)}<br />
     <strong>From:</strong> ${escapeHtml(input.baContactName)}</p>
  <p>This notification is provided by TAILRD Heart Platform as a Business Associate under 45 CFR 164.410. Notification is being delivered to the Covered Entity without unreasonable delay and in any event no later than <strong>${formatDate(input.sixtyDayDeadline)}</strong> (within 60 calendar days from discovery).</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(A): Affected Individuals</h2>
  <p>Number of affected individuals: <strong>${input.affectedIndividualsCount}</strong></p>
  <p>${escapeHtml(input.affectedIndividualsDescription)}</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(B): Description of the Breach</h2>
  <p>Type: ${escapeHtml(formatBreachType(input.breachType))}<br />
     Date of discovery: ${formatDate(input.discoveredAt)}<br />
     ${escapeHtml(occurredLine)}</p>
  <p>${escapeHtml(input.breachDescription)}</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(C): Types of PHI Involved</h2>
  ${bulletListHtml(input.typesOfPhiInvolved)}
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(D): Steps Individuals Should Take</h2>
  ${bulletListHtml(input.mitigationStepsForIndividuals)}
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(E): BA Investigation and Mitigation</h2>
  <p>${escapeHtml(input.baMitigationActions)}</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.404(c)(1)(F): Contact Procedures</h2>
  <p>Contact name: ${escapeHtml(input.baContactName)}<br />
     Email: <a href="mailto:${escapeHtml(input.baContactEmail)}">${escapeHtml(input.baContactEmail)}</a><br />
     Phone: ${escapeHtml(input.baContactPhone)}${input.baContactAddress ? `<br />Address: ${escapeHtml(input.baContactAddress)}` : ''}</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">164.410: Agency Determination</h2>
  <p>${escapeHtml(agentLine)}</p>
  <h2 style="font-size: 16px; margin-top: 24px; color: #2C4A60;">Acknowledgment Request</h2>
  <p>Please acknowledge receipt of this notification at your earliest convenience to enable the burden-of-proof retention record required under 164.414(b). Acknowledgment may be returned by reply email to <a href="mailto:${escapeHtml(input.baContactEmail)}">${escapeHtml(input.baContactEmail)}</a>.</p>
  <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">End of notification.</p>
</body>
</html>`;

  return { subject, bodyText, bodyHtml };
}
