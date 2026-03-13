/**
 * ECG Preprocessor - Signal processing and format conversion for ECG data
 * 
 * Handles parsing of standard ECG formats, signal processing operations,
 * and preparation of data for AI model inference.
 */

import { logger } from '../utils/logger';
import * as fs from 'fs/promises';

// Re-export interfaces from the main pipeline
export interface ECGData {
  patientId: string;
  acquisitionDateTime: Date;
  samplingRate: number;
  duration: number;
  leads: ECGLead[];
  metadata?: ECGMetadata;
}

export interface ECGLead {
  name: string;
  samples: number[];
  quality?: number;
  gain?: number;
  offset?: number;
}

export interface ECGMetadata {
  deviceModel?: string;
  softwareVersion?: string;
  filterSettings?: {
    lowPass?: number;
    highPass?: number;
    notch?: number;
  };
  patientPosition?: 'supine' | 'sitting' | 'standing';
  clinicalContext?: string;
}

// Preprocessing specific interfaces
export interface PreprocessingOptions {
  targetSamplingRate: number;
  windowSize: number;
  windowOverlap: number;
  filterConfig: FilterConfig;
  normalizationMethod: 'z-score' | 'min-max' | 'per-lead' | 'global';
  qualityThreshold: number;
}

export interface FilterConfig {
  rhythmFilter: { low: number; high: number };
  morphologyFilter: { low: number; high: number };
  removeBaselineWander: boolean;
  powerLineFrequency: 50 | 60;
}

export interface PreprocessedECG {
  originalData: ECGData;
  processedLeads: ProcessedLead[];
  windows: ECGWindow[];
  qualityMetrics: LeadQualityMetrics[];
  processingMetadata: ProcessingMetadata;
  config: PreprocessingOptions;
}

export interface ProcessedLead {
  name: string;
  originalSamples: number[];
  filteredSamples: number[];
  normalizedSamples: number[];
  samplingRate: number;
  quality: LeadQuality;
  artifacts: ArtifactDetection[];
}

export interface LeadQuality {
  overallScore: number; // 0-1
  snr: number; // Signal-to-noise ratio
  baselineStability: number; // 0-1
  saturationDetected: boolean;
  leadOffDetected: boolean;
  noiseLevel: number; // 0-1
  usable: boolean;
}

export interface ArtifactDetection {
  type: ArtifactType;
  confidence: number;
  timeRange: [number, number]; // Start and end sample indices
  severity: 'low' | 'medium' | 'high';
}

export enum ArtifactType {
  BASELINE_WANDER = 'baseline_wander',
  POWER_LINE = 'power_line',
  MUSCLE_ARTIFACT = 'muscle_artifact',
  ELECTRODE_POP = 'electrode_pop',
  MOTION_ARTIFACT = 'motion_artifact',
  LEAD_OFF = 'lead_off',
  SATURATION = 'saturation',
  IMPULSE_NOISE = 'impulse_noise'
}

export interface ECGWindow {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  startSample: number;
  endSample: number;
  leads: WindowLead[];
  quality: WindowQuality;
}

export interface WindowLead {
  name: string;
  samples: number[]; // Windowed and normalized samples
  quality: number; // 0-1
}

export interface WindowQuality {
  overallQuality: number; // 0-1
  leadQualities: Record<string, number>;
  artifactCount: number;
  usableLeads: string[];
  recommendation: 'use' | 'caution' | 'discard';
}

export interface LeadQualityMetrics {
  leadName: string;
  qualityScore: number;
  metrics: {
    snr: number;
    baselineVariance: number;
    saturationPercentage: number;
    zeroLineDuration: number; // seconds of flat line
    amplitudeRange: [number, number]; // [min, max] in mV
    frequencyDomainFeatures: FrequencyFeatures;
  };
  issues: QualityIssue[];
}

export interface FrequencyFeatures {
  dominantFrequency: number; // Hz
  spectralEntropy: number;
  powerBands: {
    baseline: number; // 0-0.5 Hz
    rhythm: number; // 0.5-40 Hz
    morphology: number; // 40-150 Hz
    noise: number; // >150 Hz
  };
}

export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  timeRange?: [number, number];
}

export interface ProcessingMetadata {
  processingTime: number; // milliseconds
  originalFormat: string;
  steps: ProcessingStep[];
  warnings: string[];
  errors: string[];
}

export interface ProcessingStep {
  name: string;
  duration: number; // milliseconds
  parameters: any;
  inputShape: number[];
  outputShape: number[];
}

// Format-specific parsers
export interface ECGParser {
  canParse(data: Buffer | string): boolean;
  parse(data: Buffer | string): Promise<ECGData>;
  getSupportedFormats(): string[];
}

// Standard ECG formats
export interface SCPECGData {
  sections: SCPSection[];
  patientInfo: any;
  acquisitionInfo: any;
}

export interface SCPSection {
  tag: number;
  length: number;
  data: Buffer;
}

export interface HL7AECGData {
  clinicalDocument: any;
  waveformData: WaveformData[];
}

export interface WaveformData {
  leadName: string;
  samplingRate: number;
  gain: number;
  offset: number;
  units: string;
  data: number[];
}

export interface DICOMECGData {
  metadata: any;
  waveformSequence: WaveformSequenceItem[];
}

export interface WaveformSequenceItem {
  samplingFrequency: number;
  numberOfSamples: number;
  channelDefinitionSequence: ChannelDefinition[];
  waveformData: Buffer;
}

export interface ChannelDefinition {
  waveformChannelNumber: number;
  channelLabel: string;
  channelStatus: string;
  channelSourceModifierSequence?: any;
}

export class ECGPreprocessor {
  private parsers: Map<string, ECGParser> = new Map();
  private filterCache: Map<string, any> = new Map();

  constructor() {
    this.registerParsers();
  }

  /**
   * Initialize the preprocessor
   */
  async initialize(): Promise<void> {
    logger.info('Initializing ECG preprocessor...');
    
    // Pre-compute filter coefficients for common configurations
    await this.precomputeFilters();
    
    logger.info('ECG preprocessor initialized');
  }

  /**
   * Process ECG data according to specified options
   */
  async process(ecgData: ECGData, options: PreprocessingOptions): Promise<PreprocessedECG> {
    const startTime = Date.now();
    const steps: ProcessingStep[] = [];

    try {
      logger.info(`Processing ECG for patient ${ecgData.patientId}`);

      // Step 1: Quality assessment of raw data
      const qualityMetrics = await this.assessRawQuality(ecgData);
      steps.push({
        name: 'quality_assessment',
        duration: Date.now() - startTime,
        parameters: {},
        inputShape: [ecgData.leads.length, ecgData.leads[0]?.samples.length || 0],
        outputShape: [qualityMetrics.length]
      });

      // Step 2: Filter leads based on quality threshold
      const usableLeads = this.filterUsableLeads(ecgData, qualityMetrics, options.qualityThreshold);
      
      if (usableLeads.length < 6) {
        logger.warn(`Only ${usableLeads.length} usable leads found for patient ${ecgData.patientId}`);
      }

      // Step 3: Resample to target sampling rate
      const resampledLeads = await this.resampleLeads(usableLeads, options.targetSamplingRate);
      steps.push({
        name: 'resampling',
        duration: Date.now() - steps[steps.length - 1].duration,
        parameters: { targetSamplingRate: options.targetSamplingRate },
        inputShape: [usableLeads.length, usableLeads[0]?.samples.length || 0],
        outputShape: [resampledLeads.length, resampledLeads[0]?.samples.length || 0]
      });

      // Step 4: Apply filters
      const filteredLeads = await this.applyFilters(resampledLeads, options.filterConfig);
      steps.push({
        name: 'filtering',
        duration: Date.now() - steps[steps.length - 1].duration,
        parameters: options.filterConfig,
        inputShape: [resampledLeads.length, resampledLeads[0]?.samples.length || 0],
        outputShape: [filteredLeads.length, filteredLeads[0]?.samples.length || 0]
      });

      // Step 5: Artifact detection and handling
      const artifactResults = await this.detectArtifacts(filteredLeads);
      steps.push({
        name: 'artifact_detection',
        duration: Date.now() - steps[steps.length - 1].duration,
        parameters: {},
        inputShape: [filteredLeads.length],
        outputShape: [artifactResults.length]
      });

      // Step 6: Normalize data
      const normalizedLeads = await this.normalizeData(filteredLeads, options.normalizationMethod);
      steps.push({
        name: 'normalization',
        duration: Date.now() - steps[steps.length - 1].duration,
        parameters: { method: options.normalizationMethod },
        inputShape: [filteredLeads.length, filteredLeads[0]?.samples.length || 0],
        outputShape: [normalizedLeads.length, normalizedLeads[0]?.samples.length || 0]
      });

      // Step 7: Create processing windows
      const windows = await this.createWindows(normalizedLeads, options.windowSize, options.windowOverlap, options.targetSamplingRate);
      steps.push({
        name: 'windowing',
        duration: Date.now() - steps[steps.length - 1].duration,
        parameters: { windowSize: options.windowSize, overlap: options.windowOverlap },
        inputShape: [normalizedLeads.length, normalizedLeads[0]?.samples.length || 0],
        outputShape: [windows.length, windows[0]?.leads.length || 0, windows[0]?.leads[0]?.samples.length || 0]
      });

      // Build processed leads
      const processedLeads = this.buildProcessedLeads(usableLeads, resampledLeads, filteredLeads, normalizedLeads, qualityMetrics, artifactResults);

      const result: PreprocessedECG = {
        originalData: ecgData,
        processedLeads,
        windows,
        qualityMetrics,
        processingMetadata: {
          processingTime: Date.now() - startTime,
          originalFormat: 'standard', // Would be detected from parser
          steps,
          warnings: [],
          errors: []
        },
        config: options
      };

      logger.info(`ECG processing completed for patient ${ecgData.patientId} in ${result.processingMetadata.processingTime}ms`);
      return result;

    } catch (error) {
      logger.error(`ECG processing failed for patient ${ecgData.patientId}:`, error);
      throw error;
    }
  }

  /**
   * Parse ECG data from various formats
   */
  async parseECG(data: Buffer | string, format?: string): Promise<ECGData> {
    let parser: ECGParser | undefined;

    if (format) {
      parser = this.parsers.get(format.toLowerCase());
      if (!parser) {
        throw new Error(`Unsupported ECG format: ${format}`);
      }
    } else {
      // Auto-detect format
      for (const [, p] of this.parsers) {
        if (p.canParse(data)) {
          parser = p;
          break;
        }
      }
    }

    if (!parser) {
      throw new Error('Unable to detect ECG format or no suitable parser found');
    }

    logger.info(`Parsing ECG data using ${parser.constructor.name}`);
    return await parser.parse(data);
  }

  /**
   * Get supported ECG formats
   */
  getSupportedFormats(): string[] {
    const formats: string[] = [];
    for (const parser of this.parsers.values()) {
      formats.push(...parser.getSupportedFormats());
    }
    return [...new Set(formats)];
  }

  // Private methods

  private registerParsers(): void {
    this.parsers.set('scp', new SCPECGParser());
    this.parsers.set('hl7', new HL7AECGParser());
    this.parsers.set('dicom', new DICOMECGParser());
    this.parsers.set('raw', new RawECGParser());
    this.parsers.set('json', new JSONECGParser());
  }

  private async precomputeFilters(): Promise<void> {
    // Pre-compute commonly used filter coefficients
    const commonConfigs = [
      { low: 0.5, high: 40 }, // Rhythm analysis
      { low: 0.05, high: 150 }, // Morphology analysis
      { low: 1, high: 30 }  // General diagnostic
    ];

    for (const config of commonConfigs) {
      const key = `${config.low}-${config.high}`;
      this.filterCache.set(key, {
        // Would contain actual filter coefficients
        coefficients: this.computeFilterCoefficients(config.low, config.high),
        config
      });
    }
  }

  private async assessRawQuality(ecgData: ECGData): Promise<LeadQualityMetrics[]> {
    const metrics: LeadQualityMetrics[] = [];

    for (const lead of ecgData.leads) {
      const leadMetrics = await this.assessLeadQuality(lead, ecgData.samplingRate);
      metrics.push(leadMetrics);
    }

    return metrics;
  }

  private async assessLeadQuality(lead: ECGLead, samplingRate: number): Promise<LeadQualityMetrics> {
    const samples = lead.samples;
    
    // Calculate basic statistics
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // Calculate amplitude range
    const minVal = Math.min(...samples);
    const maxVal = Math.max(...samples);
    const amplitudeRange: [number, number] = [minVal, maxVal];

    // Detect saturation
    const maxPossible = 10; // Assume max range of ±10mV
    const saturationCount = samples.filter(val => Math.abs(val) >= maxPossible * 0.95).length;
    const saturationPercentage = (saturationCount / samples.length) * 100;

    // Detect zero line (lead off)
    const zeroThreshold = 0.001; // 1µV
    let zeroLineDuration = 0;
    let consecutiveZeros = 0;
    
    for (const sample of samples) {
      if (Math.abs(sample) < zeroThreshold) {
        consecutiveZeros++;
      } else {
        if (consecutiveZeros > samplingRate) { // More than 1 second
          zeroLineDuration += consecutiveZeros / samplingRate;
        }
        consecutiveZeros = 0;
      }
    }

    // Frequency domain analysis
    const frequencyFeatures = this.analyzeFrequencyDomain(samples, samplingRate);

    // Calculate SNR (simplified)
    const signalPower = this.calculateSignalPower(samples, frequencyFeatures.powerBands.rhythm);
    const noisePower = frequencyFeatures.powerBands.noise;
    const snr = signalPower > 0 ? 10 * Math.log10(signalPower / Math.max(noisePower, 1e-10)) : 0;

    // Calculate baseline stability
    const baselineStability = this.calculateBaselineStability(samples, samplingRate);

    // Identify quality issues
    const issues: QualityIssue[] = [];
    
    if (saturationPercentage > 1) {
      issues.push({
        type: 'saturation',
        severity: saturationPercentage > 5 ? 'high' : 'medium',
        description: `${saturationPercentage.toFixed(1)}% of samples are saturated`,
        recommendation: 'Check electrode placement and ECG machine settings'
      });
    }

    if (zeroLineDuration > 1) {
      issues.push({
        type: 'lead_off',
        severity: 'high',
        description: `${zeroLineDuration.toFixed(1)} seconds of flat line detected`,
        recommendation: 'Check electrode contact and connections'
      });
    }

    if (snr < 10) {
      issues.push({
        type: 'poor_signal_quality',
        severity: snr < 5 ? 'high' : 'medium',
        description: `Low signal-to-noise ratio: ${snr.toFixed(1)} dB`,
        recommendation: 'Reduce electrical interference and improve electrode contact'
      });
    }

    if (baselineStability < 0.5) {
      issues.push({
        type: 'baseline_wander',
        severity: baselineStability < 0.3 ? 'high' : 'medium',
        description: `Unstable baseline detected`,
        recommendation: 'Ensure patient is still and check electrode placement'
      });
    }

    // Calculate overall quality score
    const qualityScore = this.calculateOverallQuality(snr, baselineStability, saturationPercentage, zeroLineDuration);

    return {
      leadName: lead.name,
      qualityScore,
      metrics: {
        snr,
        baselineVariance: variance,
        saturationPercentage,
        zeroLineDuration,
        amplitudeRange,
        frequencyDomainFeatures: frequencyFeatures
      },
      issues
    };
  }

  private analyzeFrequencyDomain(samples: number[], samplingRate: number): FrequencyFeatures {
    // Simplified FFT analysis - in practice would use a proper FFT library
    const fftSize = Math.min(samples.length, 4096);
    const fftSamples = samples.slice(0, fftSize);
    
    // Mock frequency analysis results
    return {
      dominantFrequency: 1.2, // Typical heart rate around 72 BPM
      spectralEntropy: 0.8,
      powerBands: {
        baseline: 0.1,
        rhythm: 0.7,
        morphology: 0.2,
        noise: 0.05
      }
    };
  }

  private calculateSignalPower(samples: number[], rhythmPower: number): number {
    // Simplified signal power calculation
    const rms = Math.sqrt(samples.reduce((sum, val) => sum + val * val, 0) / samples.length);
    return rms * rms * rhythmPower;
  }

  private calculateBaselineStability(samples: number[], samplingRate: number): number {
    // Calculate baseline stability by analyzing low-frequency variations
    const windowSize = samplingRate * 2; // 2-second windows
    const numWindows = Math.floor(samples.length / windowSize);
    
    if (numWindows < 2) return 1.0;
    
    const windowMeans: number[] = [];
    for (let i = 0; i < numWindows; i++) {
      const start = i * windowSize;
      const end = start + windowSize;
      const windowSamples = samples.slice(start, end);
      const mean = windowSamples.reduce((sum, val) => sum + val, 0) / windowSamples.length;
      windowMeans.push(mean);
    }
    
    // Calculate variance of window means
    const overallMean = windowMeans.reduce((sum, val) => sum + val, 0) / windowMeans.length;
    const variance = windowMeans.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / windowMeans.length;
    
    // Convert to stability score (lower variance = higher stability)
    return Math.exp(-variance * 1000); // Scaled exponential
  }

  private calculateOverallQuality(
    snr: number,
    baselineStability: number,
    saturationPercentage: number,
    zeroLineDuration: number
  ): number {
    let quality = 1.0;
    
    // SNR contribution (0-1)
    quality *= Math.min(1.0, Math.max(0.0, (snr - 5) / 15)); // 5-20 dB range
    
    // Baseline stability contribution
    quality *= baselineStability;
    
    // Saturation penalty
    quality *= Math.max(0.0, 1.0 - saturationPercentage / 10);
    
    // Zero line penalty
    quality *= Math.max(0.0, 1.0 - zeroLineDuration / 10);
    
    return Math.max(0.0, Math.min(1.0, quality));
  }

  private filterUsableLeads(ecgData: ECGData, qualityMetrics: LeadQualityMetrics[], threshold: number): ECGLead[] {
    return ecgData.leads.filter((lead, index) => {
      const metrics = qualityMetrics[index];
      return metrics && metrics.qualityScore >= threshold;
    });
  }

  private async resampleLeads(leads: ECGLead[], targetSamplingRate: number): Promise<ECGLead[]> {
    return leads.map(lead => {
      const currentRate = lead.samples.length; // Simplified - would calculate from metadata
      
      if (Math.abs(currentRate - targetSamplingRate) < 1) {
        // No resampling needed
        return lead;
      }
      
      // Simple linear interpolation resampling
      const resampledSamples = this.resampleSignal(lead.samples, currentRate, targetSamplingRate);
      
      return {
        ...lead,
        samples: resampledSamples
      };
    });
  }

  private resampleSignal(samples: number[], currentRate: number, targetRate: number): number[] {
    if (currentRate === targetRate) return samples;
    
    const ratio = targetRate / currentRate;
    const newLength = Math.round(samples.length * ratio);
    const resampled: number[] = [];
    
    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i / ratio;
      const lowerIndex = Math.floor(sourceIndex);
      const upperIndex = Math.ceil(sourceIndex);
      
      if (upperIndex >= samples.length) {
        resampled.push(samples[samples.length - 1]);
      } else if (lowerIndex === upperIndex) {
        resampled.push(samples[lowerIndex]);
      } else {
        // Linear interpolation
        const fraction = sourceIndex - lowerIndex;
        const interpolated = samples[lowerIndex] * (1 - fraction) + samples[upperIndex] * fraction;
        resampled.push(interpolated);
      }
    }
    
    return resampled;
  }

  private async applyFilters(leads: ECGLead[], filterConfig: FilterConfig): Promise<ECGLead[]> {
    return leads.map(lead => {
      let samples = [...lead.samples];
      
      // Apply bandpass filter based on analysis type
      if (filterConfig.rhythmFilter) {
        samples = this.applyBandpassFilter(samples, filterConfig.rhythmFilter.low, filterConfig.rhythmFilter.high);
      }
      
      // Remove baseline wander if requested
      if (filterConfig.removeBaselineWander) {
        samples = this.removeBaselineWander(samples);
      }
      
      // Remove power line interference
      if (filterConfig.powerLineFrequency) {
        samples = this.removeNotchFilter(samples, filterConfig.powerLineFrequency);
      }
      
      return {
        ...lead,
        samples
      };
    });
  }

  private applyBandpassFilter(samples: number[], lowCut: number, highCut: number): number[] {
    // Simplified bandpass filter - in practice would use proper DSP library
    const key = `${lowCut}-${highCut}`;
    const cachedFilter = this.filterCache.get(key);
    
    if (cachedFilter) {
      return this.convolveWithFilter(samples, cachedFilter.coefficients);
    }
    
    // Apply simple moving average as placeholder
    const windowSize = Math.max(3, Math.floor(samples.length / 100));
    return this.movingAverageFilter(samples, windowSize);
  }

  private removeBaselineWander(samples: number[]): number[] {
    // High-pass filter to remove low-frequency baseline wander
    const alpha = 0.99; // High-pass filter parameter
    const filtered: number[] = [samples[0]];
    
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + samples[i] - samples[i - 1]);
    }
    
    return filtered;
  }

  private removeNotchFilter(samples: number[], frequency: number): number[] {
    // Simplified notch filter to remove power line interference
    // In practice, would implement proper IIR notch filter
    return this.movingAverageFilter(samples, 3);
  }

  private computeFilterCoefficients(lowCut: number, highCut: number): number[] {
    // Placeholder for actual filter coefficient computation
    // Would implement proper FIR/IIR filter design
    return [0.1, 0.8, 0.1]; // Simple 3-tap filter
  }

  private convolveWithFilter(samples: number[], coefficients: number[]): number[] {
    const filtered: number[] = [];
    const halfLength = Math.floor(coefficients.length / 2);
    
    for (let i = 0; i < samples.length; i++) {
      let sum = 0;
      for (let j = 0; j < coefficients.length; j++) {
        const sampleIndex = i - halfLength + j;
        if (sampleIndex >= 0 && sampleIndex < samples.length) {
          sum += samples[sampleIndex] * coefficients[j];
        }
      }
      filtered.push(sum);
    }
    
    return filtered;
  }

  private movingAverageFilter(samples: number[], windowSize: number): number[] {
    const filtered: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < samples.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(samples.length - 1, i + halfWindow); j++) {
        sum += samples[j];
        count++;
      }
      
      filtered.push(sum / count);
    }
    
    return filtered;
  }

  private async detectArtifacts(leads: ECGLead[]): Promise<ArtifactDetection[][]> {
    return leads.map(lead => this.detectLeadArtifacts(lead));
  }

  private detectLeadArtifacts(lead: ECGLead): ArtifactDetection[] {
    const artifacts: ArtifactDetection[] = [];
    const samples = lead.samples;
    
    // Detect various types of artifacts
    artifacts.push(...this.detectSaturation(samples));
    artifacts.push(...this.detectImpulseNoise(samples));
    artifacts.push(...this.detectMotionArtifacts(samples));
    
    return artifacts;
  }

  private detectSaturation(samples: number[]): ArtifactDetection[] {
    const artifacts: ArtifactDetection[] = [];
    const threshold = 9.5; // Assume ±10mV range, detect at 95%
    
    let inSaturation = false;
    let start = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const isSaturated = Math.abs(samples[i]) >= threshold;
      
      if (isSaturated && !inSaturation) {
        inSaturation = true;
        start = i;
      } else if (!isSaturated && inSaturation) {
        inSaturation = false;
        artifacts.push({
          type: ArtifactType.SATURATION,
          confidence: 0.9,
          timeRange: [start, i - 1],
          severity: 'high'
        });
      }
    }
    
    return artifacts;
  }

  private detectImpulseNoise(samples: number[]): ArtifactDetection[] {
    const artifacts: ArtifactDetection[] = [];
    const threshold = 5; // Threshold for detecting impulse noise
    
    for (let i = 1; i < samples.length - 1; i++) {
      const current = samples[i];
      const prev = samples[i - 1];
      const next = samples[i + 1];
      
      // Check for sudden spikes
      if (Math.abs(current - prev) > threshold && Math.abs(current - next) > threshold) {
        artifacts.push({
          type: ArtifactType.IMPULSE_NOISE,
          confidence: 0.7,
          timeRange: [i, i],
          severity: 'medium'
        });
      }
    }
    
    return artifacts;
  }

  private detectMotionArtifacts(samples: number[]): ArtifactDetection[] {
    const artifacts: ArtifactDetection[] = [];
    const windowSize = 250; // 1 second at 250Hz
    
    for (let i = 0; i < samples.length - windowSize; i += windowSize) {
      const window = samples.slice(i, i + windowSize);
      const variance = this.calculateVariance(window);
      
      if (variance > 2.0) { // High variance indicates motion artifact
        artifacts.push({
          type: ArtifactType.MOTION_ARTIFACT,
          confidence: Math.min(0.9, variance / 5.0),
          timeRange: [i, i + windowSize - 1],
          severity: variance > 5.0 ? 'high' : 'medium'
        });
      }
    }
    
    return artifacts;
  }

  private calculateVariance(samples: number[]): number {
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    return samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  }

  private async normalizeData(leads: ECGLead[], method: string): Promise<ECGLead[]> {
    switch (method) {
      case 'z-score':
        return this.zScoreNormalization(leads);
      case 'min-max':
        return this.minMaxNormalization(leads);
      case 'per-lead':
        return this.perLeadNormalization(leads);
      case 'global':
        return this.globalNormalization(leads);
      default:
        throw new Error(`Unsupported normalization method: ${method}`);
    }
  }

  private zScoreNormalization(leads: ECGLead[]): ECGLead[] {
    return leads.map(lead => {
      const samples = lead.samples;
      const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
      const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
      const stdDev = Math.sqrt(variance);
      
      const normalizedSamples = samples.map(sample => 
        stdDev > 0 ? (sample - mean) / stdDev : 0
      );
      
      return { ...lead, samples: normalizedSamples };
    });
  }

  private minMaxNormalization(leads: ECGLead[]): ECGLead[] {
    return leads.map(lead => {
      const samples = lead.samples;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const range = max - min;
      
      const normalizedSamples = samples.map(sample => 
        range > 0 ? (sample - min) / range : 0
      );
      
      return { ...lead, samples: normalizedSamples };
    });
  }

  private perLeadNormalization(leads: ECGLead[]): ECGLead[] {
    // Same as z-score for individual leads
    return this.zScoreNormalization(leads);
  }

  private globalNormalization(leads: ECGLead[]): ECGLead[] {
    // Calculate global statistics across all leads
    const allSamples = leads.flatMap(lead => lead.samples);
    const globalMean = allSamples.reduce((sum, val) => sum + val, 0) / allSamples.length;
    const globalVariance = allSamples.reduce((sum, val) => sum + Math.pow(val - globalMean, 2), 0) / allSamples.length;
    const globalStdDev = Math.sqrt(globalVariance);
    
    return leads.map(lead => {
      const normalizedSamples = lead.samples.map(sample => 
        globalStdDev > 0 ? (sample - globalMean) / globalStdDev : 0
      );
      
      return { ...lead, samples: normalizedSamples };
    });
  }

  private async createWindows(
    leads: ECGLead[],
    windowSize: number,
    overlap: number,
    samplingRate: number
  ): Promise<ECGWindow[]> {
    const windows: ECGWindow[] = [];
    const samplesPerWindow = windowSize * samplingRate;
    const stepSize = samplesPerWindow * (1 - overlap);
    
    if (leads.length === 0 || leads[0].samples.length === 0) {
      return windows;
    }
    
    const totalSamples = leads[0].samples.length;
    let windowIndex = 0;
    
    for (let start = 0; start < totalSamples - samplesPerWindow; start += stepSize) {
      const end = Math.min(start + samplesPerWindow, totalSamples);
      const actualSamples = end - start;
      
      // Skip windows that are too short
      if (actualSamples < samplesPerWindow * 0.5) {
        break;
      }
      
      const windowLeads: WindowLead[] = leads.map(lead => ({
        name: lead.name,
        samples: lead.samples.slice(start, end),
        quality: lead.quality || 1.0
      }));
      
      const windowQuality = this.assessWindowQuality(windowLeads);
      
      windows.push({
        id: `window_${windowIndex}`,
        startTime: start / samplingRate,
        endTime: end / samplingRate,
        startSample: start,
        endSample: end,
        leads: windowLeads,
        quality: windowQuality
      });
      
      windowIndex++;
    }
    
    return windows;
  }

  private assessWindowQuality(windowLeads: WindowLead[]): WindowQuality {
    const leadQualities = windowLeads.reduce((acc, lead) => {
      acc[lead.name] = lead.quality;
      return acc;
    }, {} as Record<string, number>);
    
    const qualityValues = Object.values(leadQualities);
    const overallQuality = qualityValues.reduce((sum, q) => sum + q, 0) / qualityValues.length;
    
    const usableLeads = windowLeads
      .filter(lead => lead.quality > 0.5)
      .map(lead => lead.name);
    
    let recommendation: 'use' | 'caution' | 'discard';
    if (overallQuality > 0.8 && usableLeads.length >= 10) {
      recommendation = 'use';
    } else if (overallQuality > 0.5 && usableLeads.length >= 6) {
      recommendation = 'caution';
    } else {
      recommendation = 'discard';
    }
    
    return {
      overallQuality,
      leadQualities,
      artifactCount: 0, // Would count artifacts in the window
      usableLeads,
      recommendation
    };
  }

  private buildProcessedLeads(
    originalLeads: ECGLead[],
    resampledLeads: ECGLead[],
    filteredLeads: ECGLead[],
    normalizedLeads: ECGLead[],
    qualityMetrics: LeadQualityMetrics[],
    artifactResults: ArtifactDetection[][]
  ): ProcessedLead[] {
    return originalLeads.map((originalLead, index) => {
      const resampled = resampledLeads[index];
      const filtered = filteredLeads[index];
      const normalized = normalizedLeads[index];
      const metrics = qualityMetrics.find(m => m.leadName === originalLead.name);
      const artifacts = artifactResults[index] || [];
      
      const quality: LeadQuality = {
        overallScore: metrics?.qualityScore || 0,
        snr: metrics?.metrics.snr || 0,
        baselineStability: 1 - Math.sqrt(metrics?.metrics.baselineVariance || 0) / 10,
        saturationDetected: (metrics?.metrics.saturationPercentage || 0) > 1,
        leadOffDetected: (metrics?.metrics.zeroLineDuration || 0) > 1,
        noiseLevel: 1 - Math.min(1, (metrics?.metrics.snr || 0) / 20),
        usable: (metrics?.qualityScore || 0) > 0.5
      };
      
      return {
        name: originalLead.name,
        originalSamples: originalLead.samples,
        filteredSamples: filtered?.samples || originalLead.samples,
        normalizedSamples: normalized?.samples || originalLead.samples,
        samplingRate: 250, // Assuming resampled to 250 Hz
        quality,
        artifacts
      };
    });
  }
}

// Parser implementations (simplified)
class SCPECGParser implements ECGParser {
  canParse(data: Buffer | string): boolean {
    if (typeof data === 'string') return false;
    // Check for SCP-ECG magic bytes
    return data.length > 8 && data.readUInt16LE(0) === 0x5343; // "SC" in little endian
  }

  async parse(data: Buffer | string): Promise<ECGData> {
    if (typeof data === 'string') throw new Error('SCP format requires binary data');
    
    // Simplified SCP parsing - in practice would implement full SCP-ECG standard
    return {
      patientId: 'scp-patient',
      acquisitionDateTime: new Date(),
      samplingRate: 500,
      duration: 10,
      leads: this.generateMockLeads()
    };
  }

  getSupportedFormats(): string[] {
    return ['scp', 'scp-ecg'];
  }

  private generateMockLeads(): ECGLead[] {
    const leadNames = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    return leadNames.map(name => ({
      name,
      samples: Array(5000).fill(0).map(() => Math.random() * 2 - 1), // Mock data
      quality: 0.9
    }));
  }
}

class HL7AECGParser implements ECGParser {
  canParse(data: Buffer | string): boolean {
    if (typeof data !== 'string') return false;
    return data.includes('HL7') && data.includes('aECG');
  }

  async parse(data: Buffer | string): Promise<ECGData> {
    // Simplified HL7 aECG parsing
    return {
      patientId: 'hl7-patient',
      acquisitionDateTime: new Date(),
      samplingRate: 250,
      duration: 10,
      leads: this.generateMockLeads()
    };
  }

  getSupportedFormats(): string[] {
    return ['hl7', 'aecg'];
  }

  private generateMockLeads(): ECGLead[] {
    const leadNames = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    return leadNames.map(name => ({
      name,
      samples: Array(2500).fill(0).map(() => Math.random() * 2 - 1),
      quality: 0.85
    }));
  }
}

class DICOMECGParser implements ECGParser {
  canParse(data: Buffer | string): boolean {
    if (typeof data === 'string') return false;
    // Check for DICOM magic bytes
    return data.length > 132 && data.toString('ascii', 128, 132) === 'DICM';
  }

  async parse(data: Buffer | string): Promise<ECGData> {
    // Simplified DICOM parsing
    return {
      patientId: 'dicom-patient',
      acquisitionDateTime: new Date(),
      samplingRate: 1000,
      duration: 10,
      leads: this.generateMockLeads()
    };
  }

  getSupportedFormats(): string[] {
    return ['dicom', 'dcm'];
  }

  private generateMockLeads(): ECGLead[] {
    const leadNames = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    return leadNames.map(name => ({
      name,
      samples: Array(10000).fill(0).map(() => Math.random() * 2 - 1),
      quality: 0.95
    }));
  }
}

class RawECGParser implements ECGParser {
  canParse(data: Buffer | string): boolean {
    // Always can parse as fallback
    return true;
  }

  async parse(data: Buffer | string): Promise<ECGData> {
    if (typeof data === 'string') {
      // Assume CSV format
      return this.parseCSV(data);
    } else {
      // Assume binary format
      return this.parseBinary(data);
    }
  }

  getSupportedFormats(): string[] {
    return ['csv', 'txt', 'raw', 'binary'];
  }

  private parseCSV(data: string): ECGData {
    const lines = data.split('\n').filter(line => line.trim());
    const header = lines[0].split(',');
    
    // Assume first column is time, rest are leads
    const leadNames = header.slice(1);
    const leads: ECGLead[] = leadNames.map(name => ({
      name: name.trim(),
      samples: []
    }));
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(val => parseFloat(val.trim()));
      
      for (let j = 1; j < values.length && j - 1 < leads.length; j++) {
        if (!isNaN(values[j])) {
          leads[j - 1].samples.push(values[j]);
        }
      }
    }
    
    return {
      patientId: 'csv-patient',
      acquisitionDateTime: new Date(),
      samplingRate: 250,
      duration: leads[0]?.samples.length ? leads[0].samples.length / 250 : 0,
      leads
    };
  }

  private parseBinary(data: Buffer): ECGData {
    // Simplified binary parsing - assumes 16-bit integers
    const samples: number[] = [];
    
    for (let i = 0; i < data.length - 1; i += 2) {
      samples.push(data.readInt16LE(i) / 1000); // Convert to mV
    }
    
    // Assume 12-lead ECG, distribute samples equally
    const samplesPerLead = Math.floor(samples.length / 12);
    const leadNames = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    
    const leads: ECGLead[] = leadNames.map((name, index) => ({
      name,
      samples: samples.slice(index * samplesPerLead, (index + 1) * samplesPerLead)
    }));
    
    return {
      patientId: 'binary-patient',
      acquisitionDateTime: new Date(),
      samplingRate: 250,
      duration: samplesPerLead / 250,
      leads
    };
  }
}

class JSONECGParser implements ECGParser {
  canParse(data: Buffer | string): boolean {
    if (typeof data !== 'string') return false;
    
    try {
      const parsed = JSON.parse(data);
      return parsed && (parsed.leads || parsed.waveforms);
    } catch {
      return false;
    }
  }

  async parse(data: Buffer | string): Promise<ECGData> {
    if (typeof data !== 'string') throw new Error('JSON format requires string data');
    
    const parsed = JSON.parse(data);
    
    return {
      patientId: parsed.patientId || 'json-patient',
      acquisitionDateTime: parsed.acquisitionDateTime ? new Date(parsed.acquisitionDateTime) : new Date(),
      samplingRate: parsed.samplingRate || 250,
      duration: parsed.duration || 10,
      leads: parsed.leads || [],
      metadata: parsed.metadata
    };
  }

  getSupportedFormats(): string[] {
    return ['json'];
  }
}