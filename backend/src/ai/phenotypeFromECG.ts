/**
 * Phenotype From ECG — Maps ECG AI findings to phenotype screening triggers
 *
 * Evaluates ECG inference results against known patterns for rare
 * cardiovascular phenotypes (e.g., cardiac amyloidosis, HCM, ARVC).
 */

import { logger } from '../utils/logger';
import type { ECGData } from './ecgInferencePipeline';
import type { ClinicalFindings } from './ecgPostprocessor';

export interface ECGPhenotypeResult {
  phenotypeType: string;
  confidence: number;
  supportingFindings: string[];
  recommendation: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
}

export class PhenotypeFromECG {
  private thresholds: Record<string, number>;

  constructor(config?: { thresholds?: Record<string, number> }) {
    this.thresholds = config?.thresholds || {
      cardiacAmyloidosis: 0.6,
      hcm: 0.65,
      arvc: 0.7,
      brugada: 0.75,
      lvnc: 0.6,
    };
  }

  async screenForPhenotypes(
    ecgData: ECGData,
    findings: ClinicalFindings
  ): Promise<ECGPhenotypeResult[]> {
    const results: ECGPhenotypeResult[] = [];

    // Low voltage + conduction abnormalities → Amyloidosis screen
    if (this.suggestsAmyloidosis(findings)) {
      results.push({
        phenotypeType: 'CARDIAC_AMYLOIDOSIS',
        confidence: 0.65,
        supportingFindings: ['low_voltage', 'pseudoinfarct_pattern'],
        recommendation: 'Consider cardiac MRI and serum free light chains',
        urgency: 'medium',
      });
    }

    // LVH pattern + repolarization abnormalities → HCM screen
    if (this.suggestsHCM(findings)) {
      results.push({
        phenotypeType: 'HCM',
        confidence: 0.6,
        supportingFindings: ['lvh_pattern', 'repolarization_abnormality'],
        recommendation: 'Consider echocardiogram with strain imaging',
        urgency: 'medium',
      });
    }

    // Epsilon waves + RBBB + T-wave inversions V1-V3 → ARVC screen
    if (this.suggestsARVC(findings)) {
      results.push({
        phenotypeType: 'ARVC',
        confidence: 0.55,
        supportingFindings: ['epsilon_waves', 't_wave_inversion_anterior'],
        recommendation: 'Consider cardiac MRI with RV assessment',
        urgency: 'high',
      });
    }

    logger.debug('ECG phenotype screening complete', {
      findingsCount: results.length,
    });

    return results;
  }

  private suggestsAmyloidosis(findings: ClinicalFindings): boolean {
    const abnormalities = findings.abnormalities?.abnormalities?.map(a => a.finding) || [];
    return (
      abnormalities.includes('low_voltage') &&
      (abnormalities.includes('pseudoinfarct_pattern') ||
       abnormalities.includes('conduction_abnormality'))
    );
  }

  private suggestsHCM(findings: ClinicalFindings): boolean {
    const abnormalities = findings.abnormalities?.abnormalities?.map(a => a.finding) || [];
    return (
      abnormalities.includes('lvh') &&
      abnormalities.includes('repolarization_abnormality')
    );
  }

  private suggestsARVC(findings: ClinicalFindings): boolean {
    const abnormalities = findings.abnormalities?.abnormalities?.map(a => a.finding) || [];
    return (
      abnormalities.includes('epsilon_waves') ||
      (abnormalities.includes('rbbb') && abnormalities.includes('t_wave_inversion_anterior'))
    );
  }
}
