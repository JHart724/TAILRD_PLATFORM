/**
 * AUDIT-011 platform-stat aggregation helper.
 *
 * Sum a tenant-scoped count across all hospitals so that EVERY PHI-model count stays
 * hospitalId-scoped and the Layer-3 tenant guard (prismaTenantGuard) keeps enforcing on
 * Patient / Alert / TherapyGap - instead of one unscoped cross-tenant count that would need a
 * `__tenantGuardBypass` on the very models the guard exists to protect. Mirrors the hospital-loop
 * pattern in clinicalAlertService.runDailyDigestForAllHospitals.
 *
 * The sum over ALL hospitals equals the old unscoped count because every PHI row carries a
 * hospitalId FK to a Hospital. The `counter` callback MUST scope its query by the given hospitalId.
 *
 * `hospitalIds` is passed in (fetched once by the caller via a Hospital query - Hospital is not a
 * guarded model) so the caller can reuse the same id list across several aggregations.
 */
export async function sumScopedCounts(
  hospitalIds: readonly string[],
  counter: (hospitalId: string) => Promise<number>,
): Promise<number> {
  const counts = await Promise.all(hospitalIds.map((id) => counter(id)));
  return counts.reduce((sum, n) => sum + n, 0);
}
