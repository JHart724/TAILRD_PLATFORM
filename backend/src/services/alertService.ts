import { logger } from '../utils/logger';

/**
 * Alert Service
 * Manages clinical alerts and decision support for cardiovascular patients
 * Triggers real-time alerts based on EMR data
 */

export interface ClinicalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'cardiac' | 'medication' | 'lab' | 'vitals' | 'clinical';
  title: string;
  message: string;
  patientId: string;
  facilityCode: string;
  triggered: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1 = lowest, 5 = highest
  actionRequired: boolean;
  recommendations?: string[];
  relatedData?: any;
}

export interface CardiovascularAlertParams {
  patientId: string;
  visitId?: string;
  eventType: string;
  patientClass: string;
  location: any;
}

export interface CardiacLabAlertParams {
  patientId: string;
  results: any[];
  procedure: any;
  facilityCode: string;
}

export interface MedicationAlertParams {
  patientId: string;
  procedure: any;
  provider: any;
  facilityCode: string;
}

export class AlertService {
  private readonly ALERT_RULES = {
    // Troponin thresholds
    TROPONIN_CRITICAL: 0.04, // ng/mL
    TROPONIN_ELEVATED: 0.014,
    
    // BNP thresholds
    BNP_CRITICAL: 400, // pg/mL
    BNP_ELEVATED: 100,
    
    // NT-proBNP thresholds
    NT_PRO_BNP_CRITICAL: 1800, // pg/mL
    NT_PRO_BNP_ELEVATED: 450,
    
    // Creatinine thresholds
    CREATININE_CRITICAL: 2.0, // mg/dL
    CREATININE_ELEVATED: 1.5,
    
    // Potassium thresholds
    POTASSIUM_HIGH: 5.5, // mEq/L
    POTASSIUM_LOW: 3.5,
    POTASSIUM_CRITICAL_HIGH: 6.0,
    POTASSIUM_CRITICAL_LOW: 3.0
  };

  /**
   * Check for cardiovascular alerts based on patient admission/visit data
   */
  async checkCardiovascularAlerts(params: CardiovascularAlertParams): Promise<ClinicalAlert[]> {
    const alerts: ClinicalAlert[] = [];

    try {
      const { patientId, visitId, eventType, patientClass, location } = params;

      // Alert for cardiac unit admissions
      if (this.isCardiacUnit(location) && eventType === 'Admission') {
        alerts.push({
          id: this.generateAlertId(),
          type: 'info',
          category: 'cardiac',
          title: 'Cardiac Unit Admission',
          message: 'Patient admitted to cardiac unit - TAILRD monitoring activated',
          patientId,
          facilityCode: location.FacilityCode || 'unknown',
          triggered: new Date().toISOString(),
          acknowledged: false,
          severity: 3,
          actionRequired: true,
          recommendations: [
            'Review patient for GDMT optimization',
            'Assess discharge planning needs',
            'Monitor for readmission risk factors'
          ],
          relatedData: { visitId, location, eventType }
        });
      }

      // Alert for ICU/CCU admissions
      if (this.isIntensiveCareUnit(location) && patientClass === 'Inpatient') {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          category: 'cardiac',
          title: 'ICU/CCU Admission',
          message: 'High-risk cardiac patient in intensive care',
          patientId,
          facilityCode: location.FacilityCode || 'unknown',
          triggered: new Date().toISOString(),
          acknowledged: false,
          severity: 4,
          actionRequired: true,
          recommendations: [
            'Initiate advanced cardiac monitoring',
            'Consider cardiology consultation',
            'Review hemodynamic status'
          ],
          relatedData: { visitId, location, patientClass }
        });
      }

      // Alert for emergency department cardiac presentations
      if (this.isEmergencyDepartment(location)) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          category: 'cardiac',
          title: 'ED Cardiac Presentation',
          message: 'Potential cardiac event in emergency department',
          patientId,
          facilityCode: location.FacilityCode || 'unknown',
          triggered: new Date().toISOString(),
          acknowledged: false,
          severity: 4,
          actionRequired: true,
          recommendations: [
            'Order cardiac biomarkers if not done',
            'Consider EKG if not recent',
            'Assess chest pain protocol compliance'
          ],
          relatedData: { visitId, location }
        });
      }

      if (alerts.length > 0) {
        logger.info('Cardiovascular alerts triggered', {
          patientId,
          alertCount: alerts.length,
          eventType,
          location: location.Department
        });

        // Store alerts in database
        await this.storeAlerts(alerts);
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to check cardiovascular alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: params.patientId
      });

      return [];
    }
  }

  /**
   * Check for cardiac lab result alerts
   */
  async checkCardiacLabAlerts(params: CardiacLabAlertParams): Promise<ClinicalAlert[]> {
    const alerts: ClinicalAlert[] = [];

    try {
      const { patientId, results, procedure, facilityCode } = params;

      for (const result of results) {
        const value = parseFloat(result.Value);
        
        if (isNaN(value)) continue;

        // Troponin alerts
        if (this.isTroponinTest(result)) {
          if (value >= this.ALERT_RULES.TROPONIN_CRITICAL) {
            alerts.push({
              id: this.generateAlertId(),
              type: 'critical',
              category: 'lab',
              title: 'Critical Troponin Elevation',
              message: `Troponin I: ${value} ng/mL (Critical: >${this.ALERT_RULES.TROPONIN_CRITICAL})`,
              patientId,
              facilityCode,
              triggered: new Date().toISOString(),
              acknowledged: false,
              severity: 5,
              actionRequired: true,
              recommendations: [
                'Immediate cardiology consultation',
                'Consider cardiac catheterization',
                'Initiate ACS protocol',
                'Serial cardiac biomarkers'
              ],
              relatedData: { result, procedure }
            });
          } else if (value >= this.ALERT_RULES.TROPONIN_ELEVATED) {
            alerts.push({
              id: this.generateAlertId(),
              type: 'warning',
              category: 'lab',
              title: 'Elevated Troponin',
              message: `Troponin I: ${value} ng/mL (Elevated: >${this.ALERT_RULES.TROPONIN_ELEVATED})`,
              patientId,
              facilityCode,
              triggered: new Date().toISOString(),
              acknowledged: false,
              severity: 4,
              actionRequired: true,
              recommendations: [
                'Consider cardiology consultation',
                'Review EKG changes',
                'Monitor for ACS progression'
              ],
              relatedData: { result, procedure }
            });
          }
        }

        // BNP/NT-proBNP alerts
        if (this.isBNPTest(result)) {
          if (value >= this.ALERT_RULES.BNP_CRITICAL) {
            alerts.push({
              id: this.generateAlertId(),
              type: 'critical',
              category: 'lab',
              title: 'Critical BNP Elevation',
              message: `BNP: ${value} pg/mL (Critical: >${this.ALERT_RULES.BNP_CRITICAL})`,
              patientId,
              facilityCode,
              triggered: new Date().toISOString(),
              acknowledged: false,
              severity: 5,
              actionRequired: true,
              recommendations: [
                'Assess for acute heart failure',
                'Consider IV diuretics',
                'Monitor fluid balance',
                'Heart failure consultation'
              ],
              relatedData: { result, procedure }
            });
          }
        }

        if (this.isNTproBNPTest(result)) {
          if (value >= this.ALERT_RULES.NT_PRO_BNP_CRITICAL) {
            alerts.push({
              id: this.generateAlertId(),
              type: 'critical',
              category: 'lab',
              title: 'Critical NT-proBNP Elevation',
              message: `NT-proBNP: ${value} pg/mL (Critical: >${this.ALERT_RULES.NT_PRO_BNP_CRITICAL})`,
              patientId,
              facilityCode,
              triggered: new Date().toISOString(),
              acknowledged: false,
              severity: 5,
              actionRequired: true,
              recommendations: [
                'Assess for acute heart failure',
                'Consider urgent echo',
                'Review GDMT optimization',
                'Monitor closely for decompensation'
              ],
              relatedData: { result, procedure }
            });
          }
        }

        // Potassium alerts (critical for cardiac patients)
        if (this.isPotassiumTest(result)) {
          if (value >= this.ALERT_RULES.POTASSIUM_CRITICAL_HIGH || value <= this.ALERT_RULES.POTASSIUM_CRITICAL_LOW) {
            alerts.push({
              id: this.generateAlertId(),
              type: 'critical',
              category: 'lab',
              title: 'Critical Potassium Level',
              message: `Potassium: ${value} mEq/L (Critical range)`,
              patientId,
              facilityCode,
              triggered: new Date().toISOString(),
              acknowledged: false,
              severity: 5,
              actionRequired: true,
              recommendations: [
                'Immediate EKG',
                'Consider urgent correction',
                'Monitor cardiac rhythm',
                'Review medications affecting K+'
              ],
              relatedData: { result, procedure }
            });
          }
        }
      }

      if (alerts.length > 0) {
        logger.info('Cardiac lab alerts triggered', {
          patientId,
          alertCount: alerts.length,
          procedure: procedure.Description
        });

        await this.storeAlerts(alerts);
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to check cardiac lab alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: params.patientId
      });

      return [];
    }
  }

  /**
   * Check for medication interaction alerts
   */
  async checkMedicationAlerts(params: MedicationAlertParams): Promise<ClinicalAlert[]> {
    const alerts: ClinicalAlert[] = [];

    try {
      const { patientId, procedure, facilityCode } = params;

      // Check for high-risk cardiac medications
      if (this.isHighRiskCardiacMedication(procedure)) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          category: 'medication',
          title: 'High-Risk Cardiac Medication',
          message: `High-risk medication ordered: ${procedure.Description}`,
          patientId,
          facilityCode,
          triggered: new Date().toISOString(),
          acknowledged: false,
          severity: 3,
          actionRequired: true,
          recommendations: [
            'Verify appropriate dosing',
            'Check renal function',
            'Monitor for drug interactions',
            'Consider therapeutic monitoring'
          ],
          relatedData: { procedure }
        });
      }

      if (alerts.length > 0) {
        await this.storeAlerts(alerts);
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to check medication alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: params.patientId
      });

      return [];
    }
  }

  // Helper methods for location identification
  private isCardiacUnit(location: any): boolean {
    const department = location.Department?.toLowerCase() || '';
    const cardiacUnits = ['cardiology', 'cardiac', 'heart', 'cath lab', 'catheterization'];
    return cardiacUnits.some(unit => department.includes(unit));
  }

  private isIntensiveCareUnit(location: any): boolean {
    const department = location.Department?.toLowerCase() || '';
    const icuUnits = ['icu', 'ccu', 'intensive care', 'coronary care', 'critical care'];
    return icuUnits.some(unit => department.includes(unit));
  }

  private isEmergencyDepartment(location: any): boolean {
    const department = location.Department?.toLowerCase() || '';
    const edUnits = ['emergency', 'ed', 'er', 'trauma'];
    return edUnits.some(unit => department.includes(unit));
  }

  // Helper methods for lab test identification
  private isTroponinTest(result: any): boolean {
    const description = result.Description?.toLowerCase() || '';
    const code = result.Code || '';
    return description.includes('troponin') || 
           ['48641-3', '49563-0', '42757-5'].includes(code);
  }

  private isBNPTest(result: any): boolean {
    const description = result.Description?.toLowerCase() || '';
    const code = result.Code || '';
    return (description.includes('bnp') && !description.includes('nt-pro')) ||
           ['30934-4', '33762-6'].includes(code);
  }

  private isNTproBNPTest(result: any): boolean {
    const description = result.Description?.toLowerCase() || '';
    const code = result.Code || '';
    return description.includes('nt-probnp') || description.includes('nt-pro-bnp') ||
           ['33763-4', '83107-3'].includes(code);
  }

  private isPotassiumTest(result: any): boolean {
    const description = result.Description?.toLowerCase() || '';
    const code = result.Code || '';
    return description.includes('potassium') || description.includes('k+') ||
           ['2823-3', '6298-4'].includes(code);
  }

  private isHighRiskCardiacMedication(procedure: any): boolean {
    const description = procedure.Description?.toLowerCase() || '';
    const highRiskMeds = [
      'digoxin', 'warfarin', 'amiodarone', 'procainamide', 
      'quinidine', 'flecainide', 'propafenone', 'dofetilide'
    ];
    return highRiskMeds.some(med => description.includes(med));
  }

  /**
   * Store alerts in database
   */
  private async storeAlerts(alerts: ClinicalAlert[]): Promise<void> {
    try {
      for (const alert of alerts) {
        // In production, store in database
        logger.info('Storing clinical alert', {
          alertId: alert.id,
          type: alert.type,
          category: alert.category,
          patientId: alert.patientId,
          severity: alert.severity
        });

        // Mock database insert
        // await db.insert(clinicalAlerts).values(alert);
      }
    } catch (error) {
      logger.error('Failed to store alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertCount: alerts.length
      });
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alerts for patient
   */
  async getAlertsForPatient(patientId: string, facilityCode?: string): Promise<ClinicalAlert[]> {
    try {
      // In production, query database
      logger.info('Fetching alerts for patient', { patientId, facilityCode });
      
      // Mock data
      return [];

    } catch (error) {
      logger.error('Failed to get alerts for patient', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId
      });

      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      logger.info('Acknowledging alert', { alertId, acknowledgedBy });

      // In production, update database
      // await db.update(clinicalAlerts)
      //   .set({ 
      //     acknowledged: true, 
      //     acknowledgedBy, 
      //     acknowledgedAt: new Date().toISOString() 
      //   })
      //   .where(eq(clinicalAlerts.id, alertId));

    } catch (error) {
      logger.error('Failed to acknowledge alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId
      });

      throw error;
    }
  }
}