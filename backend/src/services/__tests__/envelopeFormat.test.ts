/**
 * envelopeFormat.ts — pure parse/build tests.
 *
 * Covers V0 (legacy untagged), V1 (single-key versioned), V2 (KMS-wrapped DEK)
 * envelope schemas. Tests are pure (no crypto / no env) so they isolate the
 * serialization layer from rotation / KMS concerns.
 */

import {
  parseEnvelope,
  buildV0,
  buildV1,
  buildV2,
  EnvelopeFormatError,
  type EnvelopeV0,
  type EnvelopeV1,
  type EnvelopeV2,
} from '../envelopeFormat';

describe('buildV0 / buildV1 / buildV2 — serializers', () => {
  it('buildV0 emits 4-colon-part envelope: enc:iv:authTag:ciphertext', () => {
    expect(buildV0('iv0', 'tag0', 'ct0')).toBe('enc:iv0:tag0:ct0');
  });
  it('buildV1 emits 5-colon-part envelope: enc:v1:iv:authTag:ciphertext', () => {
    expect(buildV1('iv1', 'tag1', 'ct1')).toBe('enc:v1:iv1:tag1:ct1');
  });
  it('buildV2 emits 6-colon-part envelope: enc:v2:wrappedDEK:iv:authTag:ciphertext', () => {
    expect(buildV2('w2', 'iv2', 'tag2', 'ct2')).toBe('enc:v2:w2:iv2:tag2:ct2');
  });
});

describe('parseEnvelope — version dispatch', () => {
  it('parses V0 envelope into discriminated union with version=v0', () => {
    const parsed = parseEnvelope('enc:abcd:1234:dead');
    expect(parsed.version).toBe('v0');
    const v0 = parsed as EnvelopeV0;
    expect(v0.iv).toBe('abcd');
    expect(v0.authTag).toBe('1234');
    expect(v0.ciphertext).toBe('dead');
  });
  it('parses V1 envelope into discriminated union with version=v1', () => {
    const parsed = parseEnvelope('enc:v1:abcd:1234:dead');
    expect(parsed.version).toBe('v1');
    const v1 = parsed as EnvelopeV1;
    expect(v1.iv).toBe('abcd');
    expect(v1.authTag).toBe('1234');
    expect(v1.ciphertext).toBe('dead');
    // Compile-time + runtime check: V1 has NO wrappedDEK field.
    expect((v1 as any).wrappedDEK).toBeUndefined();
  });
  it('parses V2 envelope into discriminated union with version=v2 + wrappedDEK', () => {
    const parsed = parseEnvelope('enc:v2:wrappedKey:abcd:1234:dead');
    expect(parsed.version).toBe('v2');
    const v2 = parsed as EnvelopeV2;
    expect(v2.wrappedDEK).toBe('wrappedKey');
    expect(v2.iv).toBe('abcd');
    expect(v2.authTag).toBe('1234');
    expect(v2.ciphertext).toBe('dead');
  });
  it('round-trip: buildV0 → parseEnvelope preserves all fields', () => {
    const built = buildV0('a', 'b', 'c');
    const parsed = parseEnvelope(built);
    expect(parsed).toEqual({ version: 'v0', iv: 'a', authTag: 'b', ciphertext: 'c' });
  });
  it('round-trip: buildV1 → parseEnvelope preserves all fields', () => {
    const built = buildV1('a', 'b', 'c');
    const parsed = parseEnvelope(built);
    expect(parsed).toEqual({ version: 'v1', iv: 'a', authTag: 'b', ciphertext: 'c' });
  });
  it('round-trip: buildV2 → parseEnvelope preserves all fields', () => {
    const built = buildV2('w', 'a', 'b', 'c');
    const parsed = parseEnvelope(built);
    expect(parsed).toEqual({ version: 'v2', wrappedDEK: 'w', iv: 'a', authTag: 'b', ciphertext: 'c' });
  });
});

describe('parseEnvelope — fail-loud (AUDIT-015 sister pattern)', () => {
  it('throws EnvelopeFormatError on missing enc: prefix', () => {
    expect(() => parseEnvelope('plaintext')).toThrow(EnvelopeFormatError);
    expect(() => parseEnvelope('plaintext')).toThrow(/missing enc: prefix/);
  });
  it('throws on V0 with too few segments', () => {
    expect(() => parseEnvelope('enc:onlyOne')).toThrow(EnvelopeFormatError);
    expect(() => parseEnvelope('enc:onlyOne')).toThrow(/v0 expects 4 colon-parts/);
  });
  it('throws on V0 with too many segments', () => {
    expect(() => parseEnvelope('enc:a:b:c:d:e')).toThrow(EnvelopeFormatError);
  });
  it('throws on V1 with wrong segment count', () => {
    expect(() => parseEnvelope('enc:v1:tooFew')).toThrow(/v1 expects 5 colon-parts/);
    expect(() => parseEnvelope('enc:v1:a:b:c:d')).toThrow(/v1 expects 5 colon-parts/);
  });
  it('throws on V2 with wrong segment count', () => {
    expect(() => parseEnvelope('enc:v2:a:b:c')).toThrow(/v2 expects 6 colon-parts/);
    expect(() => parseEnvelope('enc:v2:a:b:c:d:e')).toThrow(/v2 expects 6 colon-parts/);
  });
  it('throws on V0 with empty fields', () => {
    expect(() => parseEnvelope('enc::tag:ct')).toThrow(/empty field/);
  });
  it('throws on V1 with empty fields', () => {
    expect(() => parseEnvelope('enc:v1::tag:ct')).toThrow(/v1 has empty field/);
  });
  it('throws on V2 with empty fields', () => {
    expect(() => parseEnvelope('enc:v2::iv:tag:ct')).toThrow(/v2 has empty field/);
  });
  it('throws on unrecognized version tag (e.g., v9)', () => {
    expect(() => parseEnvelope('enc:v9:a:b:c:d')).toThrow(/unrecognized version tag: v9/);
  });
  it('throws on non-string input', () => {
    expect(() => parseEnvelope(null as unknown as string)).toThrow(/not a string/);
    expect(() => parseEnvelope(undefined as unknown as string)).toThrow(/not a string/);
  });
  it('error includes envelope preview (truncated)', () => {
    const longEnvelope = 'enc:v1:' + 'a'.repeat(100);
    try {
      parseEnvelope(longEnvelope);
    } catch (err: any) {
      expect(err.envelopePreview).toMatch(/\.\.\.$/);
      expect(err.envelopePreview!.length).toBeLessThanOrEqual(28);
    }
  });
});

describe('AUDIT-022 SQL-filter compatibility (`enc:%` matches all 3 versions)', () => {
  it('V0 envelope starts with enc:', () => {
    expect(buildV0('a', 'b', 'c').startsWith('enc:')).toBe(true);
  });
  it('V1 envelope starts with enc:', () => {
    expect(buildV1('a', 'b', 'c').startsWith('enc:')).toBe(true);
  });
  it('V2 envelope starts with enc:', () => {
    expect(buildV2('w', 'a', 'b', 'c').startsWith('enc:')).toBe(true);
  });
});
