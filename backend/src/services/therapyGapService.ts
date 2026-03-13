// Stub — therapy gap analysis service (CQL-driven)
// TODO: Implement therapy gap detection using CQL rules against patient FHIR data

export class TherapyGapService {
  async getGapSummaryForHospital(hospitalId: string) {
    // Placeholder: returns empty gap summary
    return {
      hospitalId,
      totalPatients: 0,
      patientsWithGaps: 0,
      gapCategories: [],
      generatedAt: new Date().toISOString(),
    };
  }

  async getPatientGaps(patientId: string) {
    return [];
  }

  async evaluateGaps(patientIds: string[]) {
    return { evaluated: 0, gapsFound: 0, results: [] };
  }
}
