// Mock HF API client with realistic data
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const hfAPI = {
  // Executive endpoints
  async getFinancialWaterfall(month: string) {
    await delay(300);
    return {
      month,
      gdmt_revenue: 1250000,
      devices_revenue: 2100000,
      phenotypes_revenue: 850000,
      _340b_revenue: 450000,
      total_revenue: 4650000,
      realized_revenue: 3890000,
    };
  },

  async getBenchmarks() {
    await delay(300);
    return {
      sinai_quadruple_therapy: 73.4,
      national_quadruple_therapy: 65.2,
      sinai_device_utilization: 81.7,
      national_device_utilization: 74.3,
      sinai_phenotype_detection: 42.1,
      national_phenotype_detection: 28.5,
      sinai_readmission_rate: 8.7,
      national_readmission_rate: 12.3,
    };
  },

  async getOpportunityHeatmap() {
    await delay(300);
    return [
      { site_id: "MS-Manhattan", opp_revenue: 1250000, rank: 1 },
      { site_id: "MS-Brooklyn", opp_revenue: 980000, rank: 2 },
      { site_id: "MS-Queens", opp_revenue: 720000, rank: 3 },
      { site_id: "MS-Bronx", opp_revenue: 650000, rank: 4 },
      { site_id: "MS-Staten Island", opp_revenue: 420000, rank: 5 },
    ];
  },

  async getRevenueTracking() {
    await delay(300);
    return {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      projected: [450000, 480000, 510000, 520000, 550000, 580000, 610000, 640000, 670000, 700000],
      realized: [420000, 465000, 498000, 512000, 541000, 572000, 603000, 635000, 668000, 695000],
    };
  },

  // Service Line endpoints
  async getGDMTByPhysician(segment: string) {
    await delay(300);
    return [
      { physician_id: "DR001", physician_name: "Dr. Rivera", patients: 87, pct_quadruple: 78.2, pct_target_bb: 65.4, pct_sglt2i: 82.1, pct_arni: 71.3, pct_mra: 68.9 },
      { physician_id: "DR002", physician_name: "Dr. Chen", patients: 72, pct_quadruple: 81.9, pct_target_bb: 72.1, pct_sglt2i: 86.5, pct_arni: 76.4, pct_mra: 74.2 },
      { physician_id: "DR003", physician_name: "Dr. Patel", patients: 64, pct_quadruple: 68.4, pct_target_bb: 58.7, pct_sglt2i: 75.3, pct_arni: 64.1, pct_mra: 62.8 },
      { physician_id: "DR004", physician_name: "Dr. Lewis", patients: 91, pct_quadruple: 73.6, pct_target_bb: 67.2, pct_sglt2i: 79.8, pct_arni: 70.5, pct_mra: 71.4 },
      { physician_id: "DR005", physician_name: "Dr. Ahmed", patients: 58, pct_quadruple: 75.9, pct_target_bb: 69.8, pct_sglt2i: 81.2, pct_arni: 73.1, pct_mra: 70.7 },
    ];
  },

  async getGDMTHeatmap(segment: string) {
    await delay(300);
    return [
      { site_id: "MS-Manhattan", score: 78.5, pct_quadruple: 76.2, opp_revenue: 450000 },
      { site_id: "MS-Brooklyn", score: 71.3, pct_quadruple: 69.8, opp_revenue: 580000 },
      { site_id: "MS-Queens", score: 68.7, pct_quadruple: 66.4, opp_revenue: 620000 },
      { site_id: "MS-Bronx", score: 73.2, pct_quadruple: 71.5, opp_revenue: 520000 },
      { site_id: "MS-Staten Island", score: 75.6, pct_quadruple: 73.9, opp_revenue: 480000 },
    ];
  },

  async getDeviceFunnels(segment: string) {
    await delay(300);
    return [
      { device_type: "CRT", eligible: 127, referred: 98, completed: 76, median_days_referral: 12 },
      { device_type: "ICD", eligible: 89, referred: 72, completed: 58, median_days_referral: 9 },
      { device_type: "CardioMEMS", eligible: 45, referred: 34, completed: 28, median_days_referral: 15 },
      { device_type: "LVAD", eligible: 12, referred: 11, completed: 8, median_days_referral: 45 },
      { device_type: "MitraClip", eligible: 32, referred: 28, completed: 24, median_days_referral: 18 },
      { device_type: "AF Ablation", eligible: 67, referred: 54, completed: 47, median_days_referral: 14 },
      { device_type: "BAT", eligible: 8, referred: 7, completed: 6, median_days_referral: 21 },
      { device_type: "ILR", eligible: 23, referred: 19, completed: 17, median_days_referral: 7 },
    ];
  },

  async getPhenotypeSummary(segment: string) {
    await delay(300);
    return [
      { name: "Cardiac Amyloidosis", prevalence_est: 156, detected: 23, detection_rate: 14.7 },
      { name: "Iron Deficiency", prevalence_est: 624, detected: 89, detection_rate: 14.3 },
      { name: "HCM", prevalence_est: 25, detected: 12, detection_rate: 48.0 },
      { name: "Fabry Disease", prevalence_est: 12, detected: 3, detection_rate: 25.0 },
      { name: "Anderson-Fabry", prevalence_est: 8, detected: 2, detection_rate: 25.0 },
      { name: "Chagas", prevalence_est: 31, detected: 5, detection_rate: 16.1 },
      { name: "Cardiac Sarcoidosis", prevalence_est: 19, detected: 7, detection_rate: 36.8 },
      { name: "Tachy-CM", prevalence_est: 94, detected: 56, detection_rate: 59.6 },
      { name: "Chemo-CM", prevalence_est: 78, detected: 34, detection_rate: 43.6 },
      { name: "Peripartum CM", prevalence_est: 6, detected: 4, detection_rate: 66.7 },
      { name: "Non-Compaction", prevalence_est: 15, detected: 8, detection_rate: 53.3 },
      { name: "Autoimmune-Related", prevalence_est: 37, detected: 14, detection_rate: 37.8 },
    ];
  },

  async getEquityGaps(metric: string, segment: string) {
    await delay(300);
    return {
      metric,
      segment,
      stratified: [
        { group: "White", value: 76.3, count: 487 },
        { group: "Black", value: 68.9, count: 312 },
        { group: "Hispanic", value: 71.2, count: 289 },
        { group: "Asian", value: 79.1, count: 156 },
        { group: "Other", value: 72.5, count: 103 },
      ],
    };
  },

  // Care Team endpoints
  async getWorklist(filter: string) {
    await delay(300);
    const basePatients = [
      { id: "HF0001", mrn_hash: "abc123", name: "Patient 1", age: 72, ef: 28, nyha: 3, pillars_count: 2, subtarget_flags: ["bb_subtarget", "mra_absent"], phenotype_badges: ["amyloidosis"], device_flags: ["crt_eligible"], last_admit: "2025-09-15", opp_revenue: 45000, physician: "Dr. Rivera" },
      { id: "HF0002", mrn_hash: "def456", name: "Patient 2", age: 68, ef: 55, nyha: 2, pillars_count: 3, subtarget_flags: ["sglt2i_absent"], phenotype_badges: ["iron_deficiency"], device_flags: [], last_admit: "2025-08-22", opp_revenue: 12000, physician: "Dr. Chen" },
      { id: "HF0003", mrn_hash: "ghi789", name: "Patient 3", age: 81, ef: 32, nyha: 3, pillars_count: 1, subtarget_flags: ["arni_absent", "bb_subtarget", "mra_absent"], phenotype_badges: [], device_flags: ["icd_eligible", "crt_eligible"], last_admit: "2025-10-01", opp_revenue: 67000, physician: "Dr. Patel" },
      { id: "HF0004", mrn_hash: "jkl012", name: "Patient 4", age: 65, ef: 58, nyha: 2, pillars_count: 4, subtarget_flags: [], phenotype_badges: ["hcm"], device_flags: [], last_admit: "2025-07-14", opp_revenue: 8000, physician: "Dr. Lewis" },
      { id: "HF0005", mrn_hash: "mno345", name: "Patient 5", age: 76, ef: 25, nyha: 4, pillars_count: 2, subtarget_flags: ["bb_subtarget", "sglt2i_absent"], phenotype_badges: ["iron_deficiency", "chagas"], device_flags: ["lvad_eligible"], last_admit: "2025-10-05", opp_revenue: 185000, physician: "Dr. Ahmed" },
    ];

    if (filter === "hfpef_65_lvh_no_pyp") {
      return basePatients.filter((p) => p.ef >= 50 && p.age >= 65 && p.phenotype_badges.length > 0);
    }
    if (filter === "ef_le_35_qrs_ge_130_no_crt_ref") {
      return basePatients.filter((p) => p.ef <= 35 && p.device_flags.includes("crt_eligible"));
    }
    if (filter === "iron_def_no_iv_iron") {
      return basePatients.filter((p) => p.phenotype_badges.includes("iron_deficiency"));
    }
    if (filter === "gdmt_gaps") {
      return basePatients.filter((p) => p.pillars_count < 4);
    }

    return basePatients;
  },

  async createReferral(patientId: string, destination: string) {
    await delay(500);
    return {
      success: true,
      referral_id: `REF-${Date.now()}`,
      patient_id: patientId,
      destination,
      created_at: new Date().toISOString(),
    };
  },

  async getPersistenceTimeline(patientId: string) {
    await delay(300);
    return {
      patient_id: patientId,
      events: [
        { date: "2025-08-01", type: "medication_start", drug_class: "arni", agent: "sacubitril/valsartan", dose: "24/26mg BID" },
        { date: "2025-08-15", type: "medication_start", drug_class: "bb", agent: "carvedilol", dose: "6.25mg BID" },
        { date: "2025-09-01", type: "dose_change", drug_class: "bb", agent: "carvedilol", dose: "12.5mg BID" },
        { date: "2025-09-20", type: "refill_gap", drug_class: "arni", gap_days: 14 },
        { date: "2025-10-01", type: "medication_start", drug_class: "sglt2i", agent: "dapagliflozin", dose: "10mg daily" },
      ],
    };
  },
};
