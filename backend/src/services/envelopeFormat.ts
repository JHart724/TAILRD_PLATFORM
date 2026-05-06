/**
 * AUDIT-016 ciphertext envelope format — V0/V1/V2 schema.
 *
 * Pure parse/build utilities for PHI ciphertext envelopes. Does not perform
 * encryption or decryption — those live in `keyRotation.ts`. Splitting here
 * isolates serialization/deserialization for testability and makes PR 2's
 * KMS wiring a one-call swap (encryptWithCurrent will switch from buildV1 to
 * buildV2 with kmsService-supplied wrappedDEK).
 *
 * Envelope versions:
 *   V0 (legacy untagged):  enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *                          4 colon-parts; current production ciphertext.
 *   V1 (single-key versioned): enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *                          5 colon-parts; AES-256-GCM with PHI_ENCRYPTION_KEY.
 *                          Emitted by AUDIT-016 PR 1 for all new writes.
 *   V2 (KMS-wrapped DEK):  enc:v2:<wrappedDEK-base64>:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 *                          6 colon-parts; AES-256-GCM with KMS-generated DEK.
 *                          Emitted by AUDIT-016 PR 2 (not yet shipped).
 *
 * Schema rationale (signal-shape-honesty over single-format-evolution):
 *   The original AUDIT-016 design doc (PR #252) collapsed V1 + KMS into a
 *   single "v1" envelope that would carry a placeholder wrappedDEK during PR 1
 *   and a real KMS-wrapped DEK in PR 2. A §17.1 consumer audit during PR 1
 *   implementation flagged that as signal-shape-lying — a "wrappedDEK" field
 *   not actually wrapping anything. The V0/V1/V2 split makes each production
 *   data-flow stage (V0 → V1 → V2) explicit and observable. Design doc revised
 *   inline 2026-05-07.
 *
 * AUDIT-022 SQL-filter compatibility:
 *   `audit-022-legacy-json-phi-backfill.ts` and `verify-phi-legacy-json.js`
 *   detect encrypted JSON via `column::text LIKE '"enc:%'`. V0 / V1 / V2 all
 *   start with `enc:`, so the existing filter correctly identifies all three
 *   as encrypted (not legacy). Verified in tests.
 *
 * AUDIT-015 fail-loud invariant:
 *   parseEnvelope throws EnvelopeFormatError on missing prefix, wrong segment
 *   count, or empty fields. Caller should let the throw propagate; never
 *   silently return ciphertext.
 */

export type KeyVersion = 'v0' | 'v1' | 'v2';

/** V0 — legacy production ciphertext (no version tag). */
export interface EnvelopeV0 {
  readonly version: 'v0';
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

/** V1 — single-key versioned ciphertext (AUDIT-016 PR 1 emission). */
export interface EnvelopeV1 {
  readonly version: 'v1';
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

/** V2 — KMS-wrapped DEK envelope (AUDIT-016 PR 2 emission; not yet shipped). */
export interface EnvelopeV2 {
  readonly version: 'v2';
  readonly wrappedDEK: string;
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

export type Envelope = EnvelopeV0 | EnvelopeV1 | EnvelopeV2;

/**
 * Thrown when an envelope string fails parse — missing prefix, wrong segment
 * count, empty fields, or unrecognized version tag. Sister to AUDIT-015
 * fail-loud pattern: never silently return ciphertext on malformed input.
 */
export class EnvelopeFormatError extends Error {
  readonly envelopePreview?: string;

  constructor(reason: string, envelope?: string) {
    const preview = envelope && envelope.length > 24 ? `${envelope.slice(0, 24)}...` : envelope;
    super(`PHI envelope parse failed: ${reason}${preview ? ` (envelope start: ${preview})` : ''}`);
    this.name = 'EnvelopeFormatError';
    this.envelopePreview = preview;
  }
}

const ENC_PREFIX = 'enc:';

/**
 * Parse a serialized envelope string into a discriminated union.
 *
 * Routing logic (by 2nd colon-part):
 *   parts[1] === 'v1' → V1 (5 parts total)
 *   parts[1] === 'v2' → V2 (6 parts total)
 *   else              → V0 (4 parts total)
 *
 * @throws EnvelopeFormatError on any parse failure
 */
export function parseEnvelope(envelope: string): Envelope {
  if (typeof envelope !== 'string') {
    throw new EnvelopeFormatError('not a string');
  }
  if (!envelope.startsWith(ENC_PREFIX)) {
    throw new EnvelopeFormatError('missing enc: prefix', envelope);
  }
  const parts = envelope.split(':');

  if (parts[1] === 'v1') {
    if (parts.length !== 5) {
      throw new EnvelopeFormatError(`v1 expects 5 colon-parts, got ${parts.length}`, envelope);
    }
    const [, , iv, authTag, ciphertext] = parts;
    if (!iv || !authTag || !ciphertext) {
      throw new EnvelopeFormatError('v1 has empty field(s)', envelope);
    }
    return { version: 'v1', iv, authTag, ciphertext };
  }

  if (parts[1] === 'v2') {
    if (parts.length !== 6) {
      throw new EnvelopeFormatError(`v2 expects 6 colon-parts, got ${parts.length}`, envelope);
    }
    const [, , wrappedDEK, iv, authTag, ciphertext] = parts;
    if (!wrappedDEK || !iv || !authTag || !ciphertext) {
      throw new EnvelopeFormatError('v2 has empty field(s)', envelope);
    }
    return { version: 'v2', wrappedDEK, iv, authTag, ciphertext };
  }

  // Unrecognized version tag — looks like 'v<N>' but not v1/v2.
  if (parts[1] && /^v\d+$/.test(parts[1])) {
    throw new EnvelopeFormatError(`unrecognized version tag: ${parts[1]}`, envelope);
  }

  // V0 — legacy untagged.
  if (parts.length !== 4) {
    throw new EnvelopeFormatError(`v0 expects 4 colon-parts, got ${parts.length}`, envelope);
  }
  const [, iv, authTag, ciphertext] = parts;
  if (!iv || !authTag || !ciphertext) {
    throw new EnvelopeFormatError('v0 has empty field(s)', envelope);
  }
  return { version: 'v0', iv, authTag, ciphertext };
}

/**
 * Build a V0 envelope. **For tests only** — production write path always
 * emits V1 via `buildV1`. V0 builder exists so tests can craft legacy
 * fixtures to verify V0 backwards-compat.
 */
export function buildV0(iv: string, authTag: string, ciphertext: string): string {
  return `${ENC_PREFIX}${iv}:${authTag}:${ciphertext}`;
}

/** Build a V1 envelope (single-key versioned). Production write path. */
export function buildV1(iv: string, authTag: string, ciphertext: string): string {
  return `${ENC_PREFIX}v1:${iv}:${authTag}:${ciphertext}`;
}

/**
 * Build a V2 envelope (KMS-wrapped DEK). Used by AUDIT-016 PR 2 once
 * kmsService wiring lands. Exported now so PR 2 can swap the production
 * write path from buildV1 to buildV2 in a single call site.
 */
export function buildV2(wrappedDEK: string, iv: string, authTag: string, ciphertext: string): string {
  return `${ENC_PREFIX}v2:${wrappedDEK}:${iv}:${authTag}:${ciphertext}`;
}
