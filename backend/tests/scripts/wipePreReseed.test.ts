/**
 * AUDIT-188 re-seed PHASE 2 - wipePreReseed.ts coverage + safety guards.
 *
 * The load-bearing test is SCHEMA-COVERAGE: it parses schema.prisma for every model with a non-null
 * patientId FK and asserts the wipe sequence covers each (mapped to its Prisma delegate accessor). This
 * is exactly the check that catches the failure mode that bit the 2026-04 script - a newly-added
 * patient-FK table silently missing from the wipe, which would FK-fail the patient delete (onDelete:
 * Restrict). It will fail loudly the next time a patient-FK model is added without updating the wipe.
 */
import * as fs from "fs";
import * as path from "path";
import { WIPE_ORDER, CHILD_TABLES, DEMO_HOSPITAL_IDS } from "../../scripts/wipePreReseed";

const schema = fs.readFileSync(path.join(__dirname, "../../prisma/schema.prisma"), "utf8");

// Prisma JS delegate = model name with ONLY the first character lowercased (CQLResult -> cQLResult).
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Models with a non-null patientId FK (these block a patient delete under onDelete: Restrict). */
function nonNullPatientFkModels(): string[] {
  const out: string[] = [];
  const blocks = schema.split(/\nmodel\s+/).slice(1);
  for (const b of blocks) {
    const name = b.split(/\s+/)[0];
    const hasPatientRelation = /@relation\(fields:\s*\[patientId\]/.test(b);
    const nonNullPatientId = /\bpatientId\s+String\b(?!\?)/.test(b); // String but not String?
    if (hasPatientRelation && nonNullPatientId) out.push(name);
  }
  return out;
}

describe("wipePreReseed - schema coverage (catches a missing patient-FK table)", () => {
  const models = nonNullPatientFkModels();

  it("finds the expected non-null patient-FK models (sanity: >= 22)", () => {
    expect(models.length).toBeGreaterThanOrEqual(22);
  });

  it("WIPE_ORDER covers EVERY non-null patient-FK model (the FK-Restrict guarantee)", () => {
    const wipeSet = new Set<string>(WIPE_ORDER as readonly string[]);
    const missing = models.map(lowerFirst).filter((d) => !wipeSet.has(d));
    expect(missing).toEqual([]);
  });

  it("includes the 12 tables the 2026-04 wipeMCDData.ts missed", () => {
    const added = [
      "bpciEpisode", "carePlan", "cQLResult", "contraindicationAssessment", "crossReferral",
      "deviceEligibility", "drugInteractionAlert", "drugTitration", "interventionTracking",
      "phenotype", "recommendation", "riskScoreAssessment",
    ];
    for (const t of added) expect(CHILD_TABLES as readonly string[]).toContain(t);
  });

  it("EXCLUDES WebhookEvent (optional patientId -> SetNull, non-blocking, non-seed data)", () => {
    expect(WIPE_ORDER as readonly string[]).not.toContain("webhookEvent");
  });
});

describe("wipePreReseed - FK-order + safety invariants", () => {
  it("patient is deleted LAST (children-before-parent)", () => {
    expect(WIPE_ORDER[WIPE_ORDER.length - 1]).toBe("patient");
  });

  it("patient appears exactly once and nowhere but last", () => {
    expect((WIPE_ORDER as readonly string[]).filter((t) => t === "patient")).toEqual(["patient"]);
  });

  it("NEVER deletes hospital (rows preserved)", () => {
    expect(WIPE_ORDER as readonly string[]).not.toContain("hospital");
  });

  it("has no duplicate tables", () => {
    expect(new Set(WIPE_ORDER as readonly string[]).size).toBe(WIPE_ORDER.length);
  });

  it("scopes to exactly the 3 demo hospitals", () => {
    expect(DEMO_HOSPITAL_IDS).toEqual([
      "demo-medical-city-dallas",
      "demo-commonspirit",
      "demo-mount-sinai",
    ]);
  });
});
