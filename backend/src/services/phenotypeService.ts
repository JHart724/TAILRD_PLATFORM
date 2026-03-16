import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface PhenotypeDetectionResult {
  id: string;
  patientId: string;
  hospitalId: string;
  phenotypeName: PhenotypeType;
  status: PhenotypeStatus;
  confidence: number;
  evidence: PhenotypeEvidence;
  riskScore?: number;
  riskFactors?: RiskFactor[];
  detectedAt: Date;
  recommendations?: string[];
}

export interface PhenotypeEvidence {
  clinicalCriteria: ClinicalCriterion[];
  labResults: LabEvidence[];
  imagingFindings: ImagingEvidence[];
  geneticMarkers?: GeneticMarker[];
  familyHistory?: FamilyHistoryItem[];
  medications?: string[];
  procedures?: string[];
}

export interface ClinicalCriterion {
  name: string;
  met: boolean;
  value?: string | number;
  unit?: string;
  source: string;
  date?: Date;
}

export interface LabEvidence {
  test: string;
  value: number;
  unit: string;
  normalRange: string;
  abnormal: boolean;
  date: Date;
  significance: 'low' | 'medium' | 'high';
}

export interface ImagingEvidence {
  modality: string; // Echo, MRI, CT, etc.
  finding: string;
  value?: number;
  unit?: string;
  interpretation: string;
  date: Date;
}

export interface GeneticMarker {
  gene: string;
  variant: string;
  pathogenicity: 'pathogenic' | 'likely_pathogenic' | 'vus' | 'likely_benign' | 'benign';
  significance: string;
}

export interface FamilyHistoryItem {
  condition: string;
  relationship: string;
  ageOfOnset?: number;
}

export interface RiskFactor {
  factor: string;
  present: boolean;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export enum PhenotypeType {
  CARDIAC_AMYLOIDOSIS = 'CARDIAC_AMYLOIDOSIS',
  CARDIAC_SARCOIDOSIS = 'CARDIAC_SARCOIDOSIS',
  HCM = 'HCM',
  ARVC = 'ARVC',
  LVNC = 'LVNC',
  FABRY_DISEASE = 'FABRY_DISEASE',
  IRON_DEFICIENCY_HF = 'IRON_DEFICIENCY_HF',
  PERIPARTUM_CARDIOMYOPATHY = 'PERIPARTUM_CARDIOMYOPATHY',
  CHEMOTHERAPY_CARDIOMYOPATHY = 'CHEMOTHERAPY_CARDIOMYOPATHY',
  CHAGAS_CARDIOMYOPATHY = 'CHAGAS_CARDIOMYOPATHY',
  TACHYCARDIA_CARDIOMYOPATHY = 'TACHYCARDIA_CARDIOMYOPATHY',
  AUTOIMMUNE_MYOCARDITIS = 'AUTOIMMUNE_MYOCARDITIS'
}

export enum PhenotypeStatus {
  DETECTED = 'DETECTED',
  SUSPECTED = 'SUSPECTED',
  RULED_OUT = 'RULED_OUT',
  CONFIRMED = 'CONFIRMED',
  MONITORING = 'MONITORING'
}

export class PhenotypeService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Run comprehensive phenotype screening for a patient
   */
  async runPhenotypeScreening(patientId: string, hospitalId: string): Promise<PhenotypeDetectionResult[]> {
    try {
      logger.info('Running phenotype screening', { patientId, hospitalId });

      const results: PhenotypeDetectionResult[] = [];

      // Run each phenotype screening algorithm
      const phenotypes = Object.values(PhenotypeType);
      
      for (const phenotype of phenotypes) {
        try {
          const result = await this.runSinglePhenotypeScreen(patientId, hospitalId, phenotype);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          logger.error(`Failed to screen for ${phenotype}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            patientId,
            phenotype
          });
        }
      }

      // Store results in database
      await this.storePhenotypeResults(results);

      logger.info('Phenotype screening completed', {
        patientId,
        resultCount: results.length,
        detectedPhenotypes: results.map(r => r.phenotypeName)
      });

      return results;

    } catch (error) {
      logger.error('Failed to run phenotype screening', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId
      });
      throw error;
    }
  }

  /**
   * Run screening for a specific phenotype
   */
  private async runSinglePhenotypeScreen(
    patientId: string, 
    hospitalId: string, 
    phenotype: PhenotypeType
  ): Promise<PhenotypeDetectionResult | null> {
    
    // Get patient data needed for screening
    const patientData = await this.getPatientDataForScreening(patientId);
    
    if (!patientData) {
      return null;
    }

    switch (phenotype) {
      case PhenotypeType.CARDIAC_AMYLOIDOSIS:
        return await this.screenCardiacAmyloidosis(patientId, hospitalId, patientData);
      case PhenotypeType.CARDIAC_SARCOIDOSIS:
        return await this.screenCardiacSarcoidosis(patientId, hospitalId, patientData);
      case PhenotypeType.HCM:
        return await this.screenHCM(patientId, hospitalId, patientData);
      case PhenotypeType.ARVC:
        return await this.screenARVC(patientId, hospitalId, patientData);
      case PhenotypeType.LVNC:
        return await this.screenLVNC(patientId, hospitalId, patientData);
      case PhenotypeType.FABRY_DISEASE:
        return await this.screenFabryDisease(patientId, hospitalId, patientData);
      case PhenotypeType.IRON_DEFICIENCY_HF:
        return await this.screenIronDeficiencyHF(patientId, hospitalId, patientData);
      case PhenotypeType.PERIPARTUM_CARDIOMYOPATHY:
        return await this.screenPeripartumCardiomyopathy(patientId, hospitalId, patientData);
      case PhenotypeType.CHEMOTHERAPY_CARDIOMYOPATHY:
        return await this.screenChemotherapyCardiomyopathy(patientId, hospitalId, patientData);
      case PhenotypeType.CHAGAS_CARDIOMYOPATHY:
        return await this.screenChagasCardiomyopathy(patientId, hospitalId, patientData);
      case PhenotypeType.TACHYCARDIA_CARDIOMYOPATHY:
        return await this.screenTachycardiaCardiomyopathy(patientId, hospitalId, patientData);
      case PhenotypeType.AUTOIMMUNE_MYOCARDITIS:
        return await this.screenAutoimmuneMycarditis(patientId, hospitalId, patientData);
      default:
        return null;
    }
  }

  /**
   * Cardiac Amyloidosis screening algorithm
   */
  private async screenCardiacAmyloidosis(
    patientId: string, 
    hospitalId: string, 
    patientData: any
  ): Promise<PhenotypeDetectionResult | null> {
    
    const evidence: PhenotypeEvidence = {
      clinicalCriteria: [],
      labResults: [],
      imagingFindings: []
    };

    let confidence = 0;
    let criteriaCount = 0;

    // Check for red flag symptoms
    const redFlags = [
      'bilateral carpal tunnel syndrome',
      'atrial fibrillation',
      'heart failure with preserved ejection fraction',
      'unexplained left ventricular hypertrophy',
      'low-flow low-gradient aortic stenosis'
    ];

    for (const flag of redFlags) {
      const hasFlag = this.checkClinicalCriterion(patientData, flag);
      evidence.clinicalCriteria.push({
        name: flag,
        met: hasFlag,
        source: 'clinical_history'
      });
      
      if (hasFlag) {
        confidence += 0.15;
        criteriaCount++;
      }
    }

    // Check echocardiographic findings
    const echoFindings = this.getImagingFindings(patientData, 'echo');
    const lvh = echoFindings.find(f => f.finding.includes('left ventricular hypertrophy'));
    const granularSparkling = echoFindings.find(f => f.finding.includes('granular sparkling'));
    
    if (lvh) {
      evidence.imagingFindings.push(lvh);
      confidence += 0.2;
    }
    
    if (granularSparkling) {
      evidence.imagingFindings.push(granularSparkling);
      confidence += 0.25;
    }

    // Check biomarkers
    const troponin = this.getLabValue(patientData, 'troponin');
    const bnp = this.getLabValue(patientData, 'bnp');
    
    if (troponin && troponin.value > 0.04) {
      evidence.labResults.push(troponin);
      confidence += 0.1;
    }
    
    if (bnp && bnp.value > 400) {
      evidence.labResults.push(bnp);
      confidence += 0.15;
    }

    // Risk factors
    const riskFactors: RiskFactor[] = [];
    if (patientData.age > 65) {
      riskFactors.push({ factor: 'Advanced age', present: true });
      confidence += 0.1;
    }

    // Determine status based on confidence
    let status: PhenotypeStatus;
    if (confidence >= 0.7) {
      status = PhenotypeStatus.SUSPECTED;
    } else if (confidence >= 0.4) {
      status = PhenotypeStatus.DETECTED;
    } else {
      return null; // Not enough evidence
    }

    return {
      id: this.generateId(),
      patientId,
      hospitalId,
      phenotypeName: PhenotypeType.CARDIAC_AMYLOIDOSIS,
      status,
      confidence,
      evidence,
      riskScore: confidence,
      riskFactors,
      detectedAt: new Date(),
      recommendations: this.getAmyloidosisRecommendations(confidence)
    };
  }

  /**
   * HCM screening algorithm
   */
  private async screenHCM(
    patientId: string,
    hospitalId: string,
    patientData: any
  ): Promise<PhenotypeDetectionResult | null> {
    
    const evidence: PhenotypeEvidence = {
      clinicalCriteria: [],
      labResults: [],
      imagingFindings: []
    };

    let confidence = 0;

    // Check for LV wall thickness
    const echoFindings = this.getImagingFindings(patientData, 'echo');
    const wallThickness = echoFindings.find(f => f.finding.includes('septal thickness') || f.finding.includes('wall thickness'));
    
    if (wallThickness && wallThickness.value && wallThickness.value >= 15) {
      evidence.imagingFindings.push(wallThickness);
      confidence += wallThickness.value >= 20 ? 0.4 : 0.3;
    }

    // Check for systolic anterior motion (SAM)
    const sam = echoFindings.find(f => f.finding.includes('systolic anterior motion'));
    if (sam) {
      evidence.imagingFindings.push(sam);
      confidence += 0.2;
    }

    // Check for family history
    const familyHistory = this.getFamilyHistory(patientData);
    const hcmFamilyHistory = familyHistory.filter(fh => 
      fh.condition.includes('hypertrophic cardiomyopathy') || 
      fh.condition.includes('sudden death')
    );
    
    if (hcmFamilyHistory.length > 0) {
      evidence.familyHistory = hcmFamilyHistory;
      confidence += 0.25;
    }

    // Check for symptoms
    const symptoms = ['dyspnea', 'chest pain', 'syncope', 'palpitations'];
    for (const symptom of symptoms) {
      const hasSymptom = this.checkClinicalCriterion(patientData, symptom);
      evidence.clinicalCriteria.push({
        name: symptom,
        met: hasSymptom,
        source: 'clinical_history'
      });
      
      if (hasSymptom) {
        confidence += 0.1;
      }
    }

    if (confidence < 0.3) {
      return null;
    }

    const status = confidence >= 0.6 ? PhenotypeStatus.SUSPECTED : PhenotypeStatus.DETECTED;

    return {
      id: this.generateId(),
      patientId,
      hospitalId,
      phenotypeName: PhenotypeType.HCM,
      status,
      confidence,
      evidence,
      riskScore: confidence,
      detectedAt: new Date(),
      recommendations: this.getHCMRecommendations(confidence)
    };
  }

  /**
   * Iron Deficiency Heart Failure screening
   */
  private async screenIronDeficiencyHF(
    patientId: string,
    hospitalId: string,
    patientData: any
  ): Promise<PhenotypeDetectionResult | null> {
    
    const evidence: PhenotypeEvidence = {
      clinicalCriteria: [],
      labResults: [],
      imagingFindings: []
    };

    let confidence = 0;

    // Check for heart failure diagnosis
    const hasHF = this.checkClinicalCriterion(patientData, 'heart failure');
    evidence.clinicalCriteria.push({
      name: 'heart failure diagnosis',
      met: hasHF,
      source: 'diagnosis_codes'
    });

    if (!hasHF) {
      return null; // Must have HF for this phenotype
    }

    // Check iron studies
    const ferritin = this.getLabValue(patientData, 'ferritin');
    const transferrinSat = this.getLabValue(patientData, 'transferrin_saturation');
    
    let ironDeficient = false;
    
    if (ferritin) {
      evidence.labResults.push(ferritin);
      if (ferritin.value < 100) {
        ironDeficient = true;
        confidence += 0.4;
      } else if (ferritin.value < 300 && transferrinSat && transferrinSat.value < 20) {
        ironDeficient = true;
        confidence += 0.3;
      }
    }

    if (transferrinSat) {
      evidence.labResults.push(transferrinSat);
    }

    // Check hemoglobin
    const hemoglobin = this.getLabValue(patientData, 'hemoglobin');
    if (hemoglobin) {
      evidence.labResults.push(hemoglobin);
      if (hemoglobin.value < 12) {
        confidence += 0.2;
      }
    }

    // Symptoms of iron deficiency
    const symptoms = ['fatigue', 'dyspnea', 'exercise intolerance'];
    for (const symptom of symptoms) {
      const hasSymptom = this.checkClinicalCriterion(patientData, symptom);
      evidence.clinicalCriteria.push({
        name: symptom,
        met: hasSymptom,
        source: 'clinical_symptoms'
      });
      
      if (hasSymptom) {
        confidence += 0.1;
      }
    }

    if (!ironDeficient || confidence < 0.3) {
      return null;
    }

    const status = confidence >= 0.6 ? PhenotypeStatus.SUSPECTED : PhenotypeStatus.DETECTED;

    return {
      id: this.generateId(),
      patientId,
      hospitalId,
      phenotypeName: PhenotypeType.IRON_DEFICIENCY_HF,
      status,
      confidence,
      evidence,
      riskScore: confidence,
      detectedAt: new Date(),
      recommendations: this.getIronDeficiencyRecommendations()
    };
  }

  // Placeholder methods for other phenotypes
  private async screenCardiacSarcoidosis(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenARVC(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenLVNC(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenFabryDisease(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenPeripartumCardiomyopathy(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenChemotherapyCardiomyopathy(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenChagasCardiomyopathy(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenTachycardiaCardiomyopathy(patientId: string, hospitalId: string, patientData: any) { return null; }
  private async screenAutoimmuneMycarditis(patientId: string, hospitalId: string, patientData: any) { return null; }

  /**
   * Get patient data needed for phenotype screening
   */
  private async getPatientDataForScreening(patientId: string): Promise<any> {
    try {
      return await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          encounters: true,
          observations: {
            orderBy: { observedDateTime: 'desc' },
            take: 100
          },
          orders: true,
          alerts: true
        }
      });
    } catch (error) {
      logger.error('Failed to get patient data for screening', { error, patientId });
      return null;
    }
  }

  /**
   * Store phenotype results in database
   */
  private async storePhenotypeResults(results: PhenotypeDetectionResult[]): Promise<void> {
    try {
      for (const result of results) {
        await this.prisma.phenotype.create({
          data: {
            patientId: result.patientId,
            hospitalId: result.hospitalId,
            phenotypeName: result.phenotypeName,
            status: result.status,
            confidence: result.confidence,
            evidence: result.evidence as any,
            riskScore: result.riskScore,
            riskFactors: result.riskFactors as any,
            detectedAt: result.detectedAt
          }
        });
      }

      logger.info('Stored phenotype results', { resultCount: results.length });
    } catch (error) {
      logger.error('Failed to store phenotype results', { error });
      throw error;
    }
  }

  /**
   * Get a single phenotype detection by ID
   */
  async getPhenotypeById(phenotypeId: string): Promise<PhenotypeDetectionResult | null> {
    try {
      const record = await this.prisma.phenotype.findUnique({
        where: { id: phenotypeId }
      });
      return record as unknown as PhenotypeDetectionResult | null;
    } catch (error) {
      logger.error('Failed to get phenotype by ID', { error, phenotypeId });
      return null;
    }
  }

  /**
   * Get phenotype summary for a patient (stub)
   */
  async getPatientPhenotypeSummary(patientId: string): Promise<{
    patientId: string;
    activePhenotypes: any[];
    screeningHistory: any[];
  }> {
    return { patientId, activePhenotypes: [], screeningHistory: [] };
  }

  /**
   * Get hospital-wide phenotype prevalence summary (stub)
   */
  async getHospitalPhenotypeSummary(hospitalId: string, filters?: any): Promise<{
    hospitalId: string;
    totalScreened: number;
    phenotypeCounts: Record<string, number>;
  }> {
    return { hospitalId, totalScreened: 0, phenotypeCounts: {} };
  }

  /**
   * Get phenotype history for patient
   */
  async getPhenotypeHistory(patientId: string): Promise<any[]> {
    try {
      return await this.prisma.phenotype.findMany({
        where: { patientId },
        orderBy: { detectedAt: 'desc' },
        include: {
          hospital: {
            select: { name: true }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get phenotype history', { error, patientId });
      return [];
    }
  }

  /**
   * Update phenotype status (e.g., confirmed by physician)
   */
  async updatePhenotypeStatus(
    phenotypeId: string, 
    status: PhenotypeStatus, 
    confirmedBy?: string
  ): Promise<void> {
    try {
      await this.prisma.phenotype.update({
        where: { id: phenotypeId },
        data: {
          status,
          confirmedAt: status === PhenotypeStatus.CONFIRMED ? new Date() : null,
          confirmedBy
        }
      });

      logger.info('Updated phenotype status', { phenotypeId, status, confirmedBy });
    } catch (error) {
      logger.error('Failed to update phenotype status', { error, phenotypeId });
      throw error;
    }
  }

  // Helper methods
  private checkClinicalCriterion(patientData: any, criterion: string): boolean {
    // Mock implementation - in reality would check diagnosis codes, clinical notes, etc.
    return Math.random() > 0.7; // Mock positive rate
  }

  private getImagingFindings(patientData: any, modality: string): ImagingEvidence[] {
    // Mock implementation - would parse imaging reports
    return [];
  }

  private getLabValue(patientData: any, test: string): LabEvidence | null {
    // Mock implementation - would find lab values from observations
    return null;
  }

  private getFamilyHistory(patientData: any): FamilyHistoryItem[] {
    // Mock implementation - would parse family history data
    return [];
  }

  private generateId(): string {
    return `phenotype_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAmyloidosisRecommendations(confidence: number): string[] {
    return [
      'Consider cardiac MRI with late gadolinium enhancement',
      'Nuclear imaging (99mTc-PYP or DPD scintigraphy)',
      'Serum and urine protein electrophoresis',
      'Free light chain analysis',
      'Cardiology consultation for further evaluation',
      'Consider tissue biopsy if other tests inconclusive'
    ];
  }

  private getHCMRecommendations(confidence: number): string[] {
    return [
      'Genetic testing for HCM gene mutations',
      'Family screening of first-degree relatives',
      'Exercise stress testing',
      'Holter monitoring for arrhythmias',
      'Cardiology consultation',
      'Consider cardiac MRI for tissue characterization'
    ];
  }

  private getIronDeficiencyRecommendations(): string[] {
    return [
      'Complete iron studies if not recent',
      'Investigate source of iron deficiency',
      'Consider IV iron replacement therapy',
      'Monitor hemoglobin and iron indices',
      'Nutritional counseling',
      'Gastroenterology evaluation if GI losses suspected'
    ];
  }
}