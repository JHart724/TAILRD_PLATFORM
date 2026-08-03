/**
 * PARITY GUARD for the duplicated canonical stringify (design doc R1, operator ruling 1).
 *
 * `src/lib/canonicalJson.ts#stableStringify` is a deliberate second copy of
 * `scripts/auditCanonical/lib/utils.ts#stableStringify` - the canonical pipeline lives under scripts/,
 * and importing scripts -> src is the wrong dependency direction for a runtime consumer.
 *
 * Duplication is only acceptable because THIS TEST makes it a mechanism rather than a hope: it imports
 * BOTH implementations and asserts byte-identical output over shared fixtures. If either copy is
 * edited without the other, CI fails here.
 *
 * If a third consumer ever appears, the right move is to relocate the canonical implementation into
 * src/lib/ and import it from scripts (fixing the dependency direction at the source) - that was
 * scoped out of the introducing PR because stableStringify has ten-plus importers across the
 * CI-gating canonical pipeline.
 */
import { stableStringify as srcStringify, criteriaHash, CRITERIA_HASH_LENGTH } from '../../src/lib/canonicalJson';
import { stableStringify as canonicalStringify } from '../../scripts/auditCanonical/lib/utils';

/** Shared fixtures: shapes the two consumers actually see, plus the edge cases that break naive impls. */
const FIXTURES: Array<{ name: string; value: unknown }> = [
  { name: 'primitive string', value: 'hello' },
  { name: 'primitive number', value: 42 },
  { name: 'primitive zero', value: 0 },
  { name: 'primitive false', value: false },
  { name: 'null', value: null },
  { name: 'empty object', value: {} },
  { name: 'empty array', value: [] },
  { name: 'flat object, keys out of order', value: { zebra: 1, alpha: 2, mike: 3 } },
  { name: 'nested objects, keys out of order', value: { b: { d: 1, c: 2 }, a: { f: 3, e: 4 } } },
  { name: 'array of objects (order preserved)', value: [{ b: 1, a: 2 }, { d: 3, c: 4 }] },
  { name: 'mixed nesting', value: { list: [1, { z: 1, a: 2 }, 'x'], meta: { n: null, t: true } } },
  { name: 'numeric-ish keys sort as strings', value: { '10': 'a', '9': 'b', '1': 'c' } },
  // Escapes, not literals: DRIFT-44 keeps source ASCII, and the escaped form produces the identical
  // string, so the unicode-handling coverage this fixture exists for is unchanged.
  { name: 'unicode values', value: { note: 'caf\u00e9 na\u00efve \u2014 dash' } },
  { name: 'deeply nested', value: { a: { b: { c: { d: { e: { f: 'deep' } } } } } } },
  // The shape this hash is actually for: a trial's structured criteria.
  {
    name: 'TrialCriterion array (the real payload)',
    value: [
      { polarity: 'inclusion', criterionId: 'hf-dx', type: 'dx', codes: ['I50'] },
      { op: '>=', criterionId: 'age-adult', polarity: 'inclusion', type: 'age', value: 18 },
      { criterionId: 'lvef-reduced', slug: 'lvef', polarity: 'inclusion', type: 'lab', op: '<=', value: 40 },
      { codes: ['1488564', '1545653'], criterionId: 'sglt2i-naive', polarity: 'exclusion', type: 'med' },
    ],
  },
];

describe('canonicalJson parity: src/lib copy is byte-identical to the canonical pipeline copy', () => {
  it.each(FIXTURES.map(f => [f.name, f.value] as const))(
    'produces identical output for: %s',
    (_name, value) => {
      expect(srcStringify(value)).toBe(canonicalStringify(value));
    },
  );

  it('is identical at non-default indents too', () => {
    for (const indent of [0, 2, 4]) {
      for (const f of FIXTURES) {
        expect(srcStringify(f.value, indent)).toBe(canonicalStringify(f.value, indent));
      }
    }
  });

  it('both copies reject a circular reference with the same message', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => srcStringify(a)).toThrow(/circular reference detected/);
    expect(() => canonicalStringify(a)).toThrow(/circular reference detected/);
  });

  it('both copies emit the trailing newline (POSIX-friendly diffs)', () => {
    expect(srcStringify({ a: 1 }).endsWith('\n')).toBe(true);
    expect(canonicalStringify({ a: 1 }).endsWith('\n')).toBe(true);
  });
});

describe('criteriaHash: the criteriaVersion content hash (design doc R1)', () => {
  const criteria = [
    { criterionId: 'hf-dx', polarity: 'inclusion', type: 'dx', codes: ['I50'] },
    { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
  ];

  it('is deterministic', () => {
    expect(criteriaHash(criteria)).toBe(criteriaHash(criteria));
  });

  it('is INDEPENDENT of key order - the whole point of hashing canonical form', () => {
    const reordered = [
      { type: 'dx', codes: ['I50'], polarity: 'inclusion', criterionId: 'hf-dx' },
      { value: 40, op: '<=', slug: 'lvef', type: 'lab', polarity: 'inclusion', criterionId: 'lvef' },
    ];
    expect(criteriaHash(reordered)).toBe(criteriaHash(criteria));
  });

  it('CHANGES when a threshold changes (the detection this exists for)', () => {
    const edited = [criteria[0], { ...criteria[1], value: 35 }];
    expect(criteriaHash(edited)).not.toBe(criteriaHash(criteria));
  });

  it('CHANGES when a criterion is added or removed', () => {
    expect(criteriaHash([...criteria, { criterionId: 'x', polarity: 'exclusion', type: 'med', codes: ['1'] }]))
      .not.toBe(criteriaHash(criteria));
    expect(criteriaHash([criteria[0]])).not.toBe(criteriaHash(criteria));
  });

  it('CHANGES when criteria are REORDERED (array order is semantic to the caller, so it must count)', () => {
    expect(criteriaHash([criteria[1], criteria[0]])).not.toBe(criteriaHash(criteria));
  });

  it('is a fixed-length lowercase hex string', () => {
    const h = criteriaHash(criteria);
    expect(h).toHaveLength(CRITERIA_HASH_LENGTH);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it('distinguishes an empty criteria list from a missing one', () => {
    expect(criteriaHash([])).not.toBe(criteriaHash(null));
  });
});
