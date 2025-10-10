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
      { physician_id: "DR001", physician_name: "Dr. Rivera", patients: 87, pct_quadruple: 7
