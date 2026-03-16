/**
 * Model Registry - Manages AI model lifecycle, health, and multi-tenant assignment
 * 
 * This service handles loading/unloading models, health monitoring, and
 * hospital-specific model configurations for the TAILRD Platform.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

// Model registry interfaces
export interface ModelDefinition {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  capabilities: ModelCapabilities;
  specifications: ModelSpecifications;
  paths: ModelPaths;
  requirements: ModelRequirements;
  configuration: ModelConfiguration;
  metadata?: ModelMetadata;
}

export enum ModelType {
  RHYTHM_CLASSIFICATION = 'rhythm_classification',
  ABNORMALITY_DETECTION = 'abnormality_detection',
  PHENOTYPE_SCREENING = 'phenotype_screening',
  MORPHOLOGY_ANALYSIS = 'morphology_analysis',
  MULTI_TASK = 'multi_task'
}

export interface ModelCapabilities {
  rhythmClassification: boolean;
  abnormalityDetection: boolean;
  phenotypeScreening: boolean;
  morphologyAnalysis: boolean;
  measurementExtraction: boolean;
  realTimeInference: boolean;
  batchProcessing: boolean;
  uncertaintyQuantification: boolean;
}

export interface ModelSpecifications {
  inputFormat: {
    samplingRate: number[]; // Supported rates in Hz
    duration: number[]; // Supported durations in seconds
    leads: string[]; // Required leads
    dataType: 'float32' | 'float64' | 'int16';
    normalization: 'z-score' | 'min-max' | 'none';
    shape: number[]; // Expected input tensor shape
  };
  outputFormat: {
    format: 'probabilities' | 'logits' | 'embeddings' | 'structured';
    classes?: string[]; // For classification models
    structure?: any; // For structured outputs
    confidence?: boolean; // Whether model outputs confidence scores
  };
  performance: {
    accuracy?: number;
    sensitivity?: number;
    specificity?: number;
    f1Score?: number;
    rocAuc?: number;
    latency?: {
      cpu: number; // ms per inference
      gpu: number; // ms per inference
    };
  };
}

export interface ModelPaths {
  modelFile: string; // Path to main model file
  weightsFile?: string; // Path to weights file
  configFile?: string; // Path to model config
  vocabFile?: string; // Path to vocabulary/label mapping
  normalizationStats?: string; // Path to normalization statistics
}

export interface ModelRequirements {
  memory: {
    minimum: number; // MB
    recommended: number; // MB
    gpu?: number; // MB GPU memory
  };
  compute: {
    cpuCores: number;
    gpu?: {
      required: boolean;
      memory: number; // MB
      computeCapability?: string; // e.g., "3.5"
    };
  };
  dependencies: {
    python?: string; // Python version
    tensorflow?: string;
    pytorch?: string;
    onnx?: string;
    custom?: Record<string, string>;
  };
}

export interface ModelConfiguration {
  preprocessing: {
    required: boolean;
    steps: string[];
    parameters?: Record<string, any>;
  };
  postprocessing: {
    required: boolean;
    steps: string[];
    parameters?: Record<string, any>;
  };
  inference: {
    batchSize: number;
    maxBatchSize?: number;
    timeoutMs: number;
    retries: number;
  };
  quality: {
    minimumQuality: number;
    requiresAllLeads: boolean;
    fallbackBehavior: 'error' | 'warn' | 'proceed';
  };
}

export interface ModelMetadata {
  description: string;
  author: string;
  institution?: string;
  publicationUrl?: string;
  trainingData?: {
    size: number;
    demographics?: any;
    sources?: string[];
  };
  validation?: {
    datasets: string[];
    metrics: Record<string, number>;
  };
  lastUpdated: Date;
  deprecated?: boolean;
  deprecationReason?: string;
}

// Hospital-specific model assignment
export interface HospitalModelConfig {
  hospitalId: string;
  hospitalName: string;
  assignedModels: ModelAssignment[];
  defaultModel?: string;
  preferences: HospitalPreferences;
  restrictions?: ModelRestrictions;
  lastUpdated: Date;
}

export interface ModelAssignment {
  modelId: string;
  priority: number;
  conditions?: AssignmentConditions;
  enabled: boolean;
  configuration?: Partial<ModelConfiguration>;
}

export interface AssignmentConditions {
  patientAgeRange?: [number, number];
  patientGender?: 'male' | 'female' | 'other';
  clinicalIndications?: string[];
  timeOfDay?: string; // e.g., "09:00-17:00"
  dayOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  urgencyLevel?: 'routine' | 'urgent' | 'emergent';
}

export interface HospitalPreferences {
  preferredSensitivity: number; // 0-1
  preferredSpecificity: number; // 0-1
  maxLatencyMs: number;
  enableExperimentalModels: boolean;
  requireExplainability: boolean;
  autoUpdateModels: boolean;
}

export interface ModelRestrictions {
  prohibitedModels?: string[];
  requireApproval?: string[];
  maxGpuUsage?: number; // MB
  maxConcurrentInferences?: number;
}

// Model runtime interfaces
export interface LoadedModel {
  definition: ModelDefinition;
  runtime: ModelRuntime;
  statistics: ModelStatistics;
  loadTime: Date;
  lastUsed: Date;
  status: ModelStatus;
}

export interface ModelRuntime {
  instance: any; // The actual model instance
  warmupCompleted: boolean;
  memoryUsage: number; // MB
  gpuMemoryUsage?: number; // MB
  version: string;
  backend: 'tensorflow' | 'pytorch' | 'onnx' | 'custom';
}

export interface ModelStatistics {
  totalInferences: number;
  successfulInferences: number;
  failedInferences: number;
  averageLatencyMs: number;
  lastInferenceTime?: Date;
  errorRate: number; // 0-1
  throughput: number; // inferences per second
  recentErrors: Array<{
    timestamp: Date;
    error: string;
    inputHash?: string;
  }>;
}

export enum ModelStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UNLOADING = 'unloading',
  UNLOADED = 'unloaded',
  WARMING_UP = 'warming_up'
}

// Health monitoring
export interface ModelHealth {
  modelId: string;
  status: ModelStatus;
  isHealthy: boolean;
  lastHealthCheck: Date;
  healthMetrics: HealthMetrics;
  issues: HealthIssue[];
  recommendation: string;
}

export interface HealthMetrics {
  availability: number; // 0-1
  averageLatency: number; // ms
  errorRate: number; // 0-1
  memoryUsage: number; // MB
  gpuUtilization?: number; // 0-1
  throughput: number; // inferences/sec
}

export interface HealthIssue {
  type: 'performance' | 'memory' | 'error' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  suggestion?: string;
}

export class ModelRegistry {
  private models: Map<string, ModelDefinition> = new Map();
  private loadedModels: Map<string, LoadedModel> = new Map();
  private hospitalConfigs: Map<string, HospitalModelConfig> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private weightsBasePath: string;

  constructor(weightsBasePath: string = '~/tailrd-research/weights') {
    this.weightsBasePath = path.resolve(weightsBasePath.replace('~', process.env.HOME || ''));
  }

  /**
   * Initialize the model registry by discovering and registering available models
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing model registry...');
      
      await this.discoverModels();
      await this.loadDefaultModels();
      await this.loadHospitalConfigs();
      this.startHealthMonitoring();
      
      logger.info(`Model registry initialized with ${this.models.size} models`);
    } catch (error) {
      logger.error('Failed to initialize model registry:', error);
      throw error;
    }
  }

  /**
   * Discover available models in the weights directory
   */
  private async discoverModels(): Promise<void> {
    try {
      const entries = await fs.readdir(this.weightsBasePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.registerModelFromDirectory(
            path.join(this.weightsBasePath, entry.name),
            entry.name
          );
        }
      }
    } catch (error) {
      logger.error('Error discovering models:', error);
      throw error;
    }
  }

  /**
   * Register a model from a directory containing model files
   */
  private async registerModelFromDirectory(modelPath: string, modelName: string): Promise<void> {
    try {
      const modelDefinition = await this.createModelDefinition(modelPath, modelName);
      this.models.set(modelDefinition.id, modelDefinition);
      
      logger.info(`Registered model: ${modelDefinition.id} (${modelDefinition.name})`);
    } catch (error) {
      logger.error(`Failed to register model from ${modelPath}:`, error);
    }
  }

  /**
   * Create model definition based on discovered files and model type
   */
  private async createModelDefinition(modelPath: string, modelName: string): Promise<ModelDefinition> {
    const files = await fs.readdir(modelPath);
    
    // Determine model type and create appropriate definition
    switch (modelName.toLowerCase()) {
      case 'ecgfounder':
        return this.createECGFounderDefinition(modelPath, files);
      case 'ecg-fm':
        return this.createECGFMDefinition(modelPath, files);
      case 'hubert-ecg-small':
        return this.createHuBERTECGDefinition(modelPath, files, 'small');
      case 'hubert-ecg-base':
        return this.createHuBERTECGDefinition(modelPath, files, 'base');
      case 'hubert-ecg-large':
        return this.createHuBERTECGDefinition(modelPath, files, 'large');
      case 'pulse-7b':
        return this.createPulseDefinition(modelPath, files);
      default:
        return this.createGenericDefinition(modelPath, files, modelName);
    }
  }

  private async createECGFounderDefinition(modelPath: string, files: string[]): Promise<ModelDefinition> {
    return {
      id: 'ecgfounder-v1',
      name: 'ECGFounder',
      version: '1.0',
      type: ModelType.MULTI_TASK,
      capabilities: {
        rhythmClassification: true,
        abnormalityDetection: true,
        phenotypeScreening: true,
        morphologyAnalysis: true,
        measurementExtraction: true,
        realTimeInference: true,
        batchProcessing: true,
        uncertaintyQuantification: false
      },
      specifications: {
        inputFormat: {
          samplingRate: [250, 500],
          duration: [10],
          leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          dataType: 'float32',
          normalization: 'z-score',
          shape: [12, 2500] // 10s at 250Hz
        },
        outputFormat: {
          format: 'structured',
          confidence: true,
          structure: {
            rhythm: 'classification',
            abnormalities: 'multi-label',
            measurements: 'regression'
          }
        },
        performance: {
          accuracy: 0.92,
          sensitivity: 0.89,
          specificity: 0.94,
          f1Score: 0.91,
          rocAuc: 0.96,
          latency: {
            cpu: 150,
            gpu: 45
          }
        }
      },
      paths: {
        modelFile: path.join(modelPath, this.findModelFile(files)),
        weightsFile: path.join(modelPath, this.findWeightsFile(files)),
        configFile: path.join(modelPath, this.findConfigFile(files))
      },
      requirements: {
        memory: {
          minimum: 4096,
          recommended: 8192,
          gpu: 2048
        },
        compute: {
          cpuCores: 4,
          gpu: {
            required: false,
            memory: 2048,
            computeCapability: '3.5'
          }
        },
        dependencies: {
          python: '>=3.8',
          tensorflow: '>=2.8.0'
        }
      },
      configuration: {
        preprocessing: {
          required: true,
          steps: ['resample', 'normalize', 'segment'],
          parameters: {
            targetSamplingRate: 250,
            windowSize: 10,
            normalization: 'z-score'
          }
        },
        postprocessing: {
          required: true,
          steps: ['threshold', 'map_labels'],
          parameters: {
            confidenceThreshold: 0.5
          }
        },
        inference: {
          batchSize: 32,
          maxBatchSize: 128,
          timeoutMs: 5000,
          retries: 2
        },
        quality: {
          minimumQuality: 0.7,
          requiresAllLeads: false,
          fallbackBehavior: 'warn'
        }
      },
      metadata: {
        description: 'Foundation model for ECG analysis with multi-task capabilities',
        author: 'ECGFounder Team',
        institution: 'Research Institution',
        trainingData: {
          size: 1000000,
          sources: ['PTB-XL', 'MIMIC-IV-ECG', 'CODE-15%']
        },
        lastUpdated: new Date()
      }
    };
  }

  private async createECGFMDefinition(modelPath: string, files: string[]): Promise<ModelDefinition> {
    return {
      id: 'ecg-fm-v1',
      name: 'ECG-FM (Foundation Model)',
      version: '1.0',
      type: ModelType.MULTI_TASK,
      capabilities: {
        rhythmClassification: true,
        abnormalityDetection: true,
        phenotypeScreening: true,
        morphologyAnalysis: true,
        measurementExtraction: true,
        realTimeInference: false, // Large model, better for batch
        batchProcessing: true,
        uncertaintyQuantification: true
      },
      specifications: {
        inputFormat: {
          samplingRate: [250, 500],
          duration: [10, 30],
          leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          dataType: 'float32',
          normalization: 'z-score',
          shape: [12, 2500]
        },
        outputFormat: {
          format: 'structured',
          confidence: true,
          structure: {
            rhythm: 'classification',
            abnormalities: 'multi-label',
            measurements: 'regression',
            embeddings: 'vector'
          }
        },
        performance: {
          accuracy: 0.95,
          sensitivity: 0.92,
          specificity: 0.96,
          f1Score: 0.94,
          rocAuc: 0.98,
          latency: {
            cpu: 800,
            gpu: 120
          }
        }
      },
      paths: {
        modelFile: path.join(modelPath, this.findModelFile(files)),
        weightsFile: path.join(modelPath, this.findWeightsFile(files)),
        configFile: path.join(modelPath, this.findConfigFile(files))
      },
      requirements: {
        memory: {
          minimum: 16384,
          recommended: 32768,
          gpu: 8192
        },
        compute: {
          cpuCores: 8,
          gpu: {
            required: false,
            memory: 8192,
            computeCapability: '6.0'
          }
        },
        dependencies: {
          python: '>=3.8',
          pytorch: '>=1.12.0'
        }
      },
      configuration: {
        preprocessing: {
          required: true,
          steps: ['resample', 'normalize', 'segment'],
          parameters: {
            targetSamplingRate: 250,
            windowSize: 10,
            normalization: 'z-score'
          }
        },
        postprocessing: {
          required: true,
          steps: ['ensemble', 'uncertainty', 'threshold'],
          parameters: {
            confidenceThreshold: 0.6,
            uncertaintyMethod: 'dropout'
          }
        },
        inference: {
          batchSize: 16,
          maxBatchSize: 64,
          timeoutMs: 10000,
          retries: 2
        },
        quality: {
          minimumQuality: 0.8,
          requiresAllLeads: false,
          fallbackBehavior: 'warn'
        }
      },
      metadata: {
        description: 'Large foundation model for comprehensive ECG analysis',
        author: 'ECG-FM Research Group',
        institution: 'Academic Medical Center',
        trainingData: {
          size: 5000000,
          sources: ['PTB-XL', 'MIMIC-IV-ECG', 'UK-Biobank', 'Private datasets']
        },
        lastUpdated: new Date()
      }
    };
  }

  private async createHuBERTECGDefinition(
    modelPath: string, 
    files: string[], 
    size: 'small' | 'base' | 'large'
  ): Promise<ModelDefinition> {
    const sizeConfigs = {
      small: {
        memory: { minimum: 2048, recommended: 4096, gpu: 1024 },
        latency: { cpu: 80, gpu: 25 },
        batchSize: 64
      },
      base: {
        memory: { minimum: 4096, recommended: 8192, gpu: 2048 },
        latency: { cpu: 120, gpu: 35 },
        batchSize: 32
      },
      large: {
        memory: { minimum: 8192, recommended: 16384, gpu: 4096 },
        latency: { cpu: 200, gpu: 50 },
        batchSize: 16
      }
    };

    const config = sizeConfigs[size];

    return {
      id: `hubert-ecg-${size}-v1`,
      name: `HuBERT-ECG-${size.toUpperCase()}`,
      version: '1.0',
      type: ModelType.ABNORMALITY_DETECTION,
      capabilities: {
        rhythmClassification: true,
        abnormalityDetection: true,
        phenotypeScreening: false,
        morphologyAnalysis: true,
        measurementExtraction: false,
        realTimeInference: size === 'small',
        batchProcessing: true,
        uncertaintyQuantification: false
      },
      specifications: {
        inputFormat: {
          samplingRate: [250],
          duration: [10],
          leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          dataType: 'float32',
          normalization: 'z-score',
          shape: [12, 2500]
        },
        outputFormat: {
          format: 'probabilities',
          confidence: true,
          classes: [
            'Normal', 'AFL', 'AFIB', 'SVT', 'VT', 'VFL', 'VF',
            'MI', 'ISCHEMIA', 'LVH', 'RVH', 'BBB', 'AVB', 'WPW'
          ]
        },
        performance: {
          accuracy: 0.88,
          sensitivity: 0.85,
          specificity: 0.91,
          f1Score: 0.87,
          rocAuc: 0.94,
          latency: config.latency
        }
      },
      paths: {
        modelFile: path.join(modelPath, this.findModelFile(files)),
        weightsFile: path.join(modelPath, this.findWeightsFile(files)),
        configFile: path.join(modelPath, this.findConfigFile(files))
      },
      requirements: {
        memory: config.memory,
        compute: {
          cpuCores: 2,
          gpu: {
            required: false,
            memory: config.memory.gpu!,
            computeCapability: '3.5'
          }
        },
        dependencies: {
          python: '>=3.8',
          pytorch: '>=1.10.0'
        }
      },
      configuration: {
        preprocessing: {
          required: true,
          steps: ['resample', 'normalize'],
          parameters: {
            targetSamplingRate: 250,
            normalization: 'z-score'
          }
        },
        postprocessing: {
          required: true,
          steps: ['softmax', 'threshold'],
          parameters: {
            confidenceThreshold: 0.5
          }
        },
        inference: {
          batchSize: config.batchSize,
          maxBatchSize: config.batchSize * 2,
          timeoutMs: 3000,
          retries: 2
        },
        quality: {
          minimumQuality: 0.6,
          requiresAllLeads: true,
          fallbackBehavior: 'error'
        }
      },
      metadata: {
        description: `HuBERT-based ECG analysis model (${size} variant)`,
        author: 'HuBERT-ECG Team',
        institution: 'Research Laboratory',
        trainingData: {
          size: 500000,
          sources: ['PTB-XL', 'Chapman-Shaoxing']
        },
        lastUpdated: new Date()
      }
    };
  }

  private async createPulseDefinition(modelPath: string, files: string[]): Promise<ModelDefinition> {
    return {
      id: 'pulse-7b-v1',
      name: 'PULSE-7B',
      version: '1.0',
      type: ModelType.MULTI_TASK,
      capabilities: {
        rhythmClassification: true,
        abnormalityDetection: true,
        phenotypeScreening: true,
        morphologyAnalysis: true,
        measurementExtraction: true,
        realTimeInference: false,
        batchProcessing: true,
        uncertaintyQuantification: true
      },
      specifications: {
        inputFormat: {
          samplingRate: [250, 500],
          duration: [10, 30, 60],
          leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          dataType: 'float32',
          normalization: 'z-score',
          shape: [12, 2500]
        },
        outputFormat: {
          format: 'structured',
          confidence: true,
          structure: {
            rhythm: 'classification',
            abnormalities: 'multi-label',
            measurements: 'regression',
            report: 'text'
          }
        },
        performance: {
          accuracy: 0.97,
          sensitivity: 0.95,
          specificity: 0.98,
          f1Score: 0.96,
          rocAuc: 0.99,
          latency: {
            cpu: 2000,
            gpu: 300
          }
        }
      },
      paths: {
        modelFile: path.join(modelPath, this.findModelFile(files)),
        weightsFile: path.join(modelPath, this.findWeightsFile(files)),
        configFile: path.join(modelPath, this.findConfigFile(files))
      },
      requirements: {
        memory: {
          minimum: 32768,
          recommended: 65536,
          gpu: 16384
        },
        compute: {
          cpuCores: 16,
          gpu: {
            required: true,
            memory: 16384,
            computeCapability: '8.0'
          }
        },
        dependencies: {
          python: '>=3.9',
          pytorch: '>=1.13.0'
        }
      },
      configuration: {
        preprocessing: {
          required: true,
          steps: ['resample', 'normalize', 'segment', 'tokenize'],
          parameters: {
            targetSamplingRate: 250,
            windowSize: 10,
            normalization: 'z-score'
          }
        },
        postprocessing: {
          required: true,
          steps: ['decode', 'parse', 'validate'],
          parameters: {
            confidenceThreshold: 0.7,
            generateReport: true
          }
        },
        inference: {
          batchSize: 4,
          maxBatchSize: 8,
          timeoutMs: 30000,
          retries: 1
        },
        quality: {
          minimumQuality: 0.8,
          requiresAllLeads: false,
          fallbackBehavior: 'warn'
        }
      },
      metadata: {
        description: 'Large language model fine-tuned for comprehensive ECG analysis',
        author: 'PULSE Research Team',
        institution: 'AI Medical Research Center',
        trainingData: {
          size: 10000000,
          sources: ['PTB-XL', 'MIMIC-IV-ECG', 'UK-Biobank', 'Clinical reports']
        },
        lastUpdated: new Date()
      }
    };
  }

  private async createGenericDefinition(
    modelPath: string, 
    files: string[], 
    modelName: string
  ): Promise<ModelDefinition> {
    return {
      id: `${modelName.toLowerCase()}-v1`,
      name: modelName,
      version: '1.0',
      type: ModelType.ABNORMALITY_DETECTION,
      capabilities: {
        rhythmClassification: true,
        abnormalityDetection: true,
        phenotypeScreening: false,
        morphologyAnalysis: false,
        measurementExtraction: false,
        realTimeInference: true,
        batchProcessing: true,
        uncertaintyQuantification: false
      },
      specifications: {
        inputFormat: {
          samplingRate: [250, 500],
          duration: [10],
          leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
          dataType: 'float32',
          normalization: 'z-score',
          shape: [12, 2500]
        },
        outputFormat: {
          format: 'probabilities',
          confidence: false
        },
        performance: {
          latency: {
            cpu: 200,
            gpu: 50
          }
        }
      },
      paths: {
        modelFile: path.join(modelPath, this.findModelFile(files)),
        weightsFile: path.join(modelPath, this.findWeightsFile(files))
      },
      requirements: {
        memory: {
          minimum: 4096,
          recommended: 8192
        },
        compute: {
          cpuCores: 4
        },
        dependencies: {}
      },
      configuration: {
        preprocessing: {
          required: true,
          steps: ['resample', 'normalize']
        },
        postprocessing: {
          required: false,
          steps: []
        },
        inference: {
          batchSize: 32,
          timeoutMs: 5000,
          retries: 2
        },
        quality: {
          minimumQuality: 0.5,
          requiresAllLeads: false,
          fallbackBehavior: 'warn'
        }
      },
      metadata: {
        description: `Generic ECG model: ${modelName}`,
        author: 'Unknown',
        lastUpdated: new Date()
      }
    };
  }

  // Helper methods for finding files
  private findModelFile(files: string[]): string {
    const modelFiles = files.filter(f => 
      f.endsWith('.pb') || f.endsWith('.pth') || f.endsWith('.onnx') || 
      f.endsWith('.h5') || f.endsWith('.pkl') || f.includes('model')
    );
    return modelFiles[0] || 'model.pkl';
  }

  private findWeightsFile(files: string[]): string {
    const weightFiles = files.filter(f => 
      f.includes('weight') || f.includes('checkpoint') || f.endsWith('.bin')
    );
    return weightFiles[0] || 'weights.bin';
  }

  private findConfigFile(files: string[]): string {
    const configFiles = files.filter(f => 
      f.includes('config') || f.endsWith('.json') || f.endsWith('.yaml')
    );
    return configFiles[0] || 'config.json';
  }

  /**
   * Load default models for immediate availability
   */
  private async loadDefaultModels(): Promise<void> {
    const defaultModels = ['ecgfounder-v1', 'hubert-ecg-small-v1'];
    
    for (const modelId of defaultModels) {
      try {
        await this.loadModel(modelId);
      } catch (error) {
        logger.warn(`Failed to load default model ${modelId}:`, error);
      }
    }
  }

  /**
   * Load hospital-specific model configurations
   */
  private async loadHospitalConfigs(): Promise<void> {
    // Load from database or configuration files
    // For now, create default configurations
    
    const defaultConfig: HospitalModelConfig = {
      hospitalId: 'default',
      hospitalName: 'Default Configuration',
      assignedModels: [
        {
          modelId: 'ecgfounder-v1',
          priority: 1,
          enabled: true
        },
        {
          modelId: 'hubert-ecg-small-v1',
          priority: 2,
          enabled: true,
          conditions: {
            urgencyLevel: 'emergent'
          }
        }
      ],
      defaultModel: 'ecgfounder-v1',
      preferences: {
        preferredSensitivity: 0.9,
        preferredSpecificity: 0.85,
        maxLatencyMs: 1000,
        enableExperimentalModels: false,
        requireExplainability: false,
        autoUpdateModels: true
      },
      lastUpdated: new Date()
    };

    this.hospitalConfigs.set('default', defaultConfig);
  }

  /**
   * Load a model into memory
   */
  async loadModel(modelId: string): Promise<void> {
    if (this.loadedModels.has(modelId)) {
      logger.info(`Model ${modelId} already loaded`);
      return;
    }

    const definition = this.models.get(modelId);
    if (!definition) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    logger.info(`Loading model ${modelId}...`);
    const loadStartTime = Date.now();

    try {
      // Check system requirements
      await this.checkSystemRequirements(definition);

      // Create runtime instance (this would interface with actual ML frameworks)
      const runtime = await this.createModelRuntime(definition);

      // Perform warmup inference
      await this.warmupModel(runtime, definition);

      const loadedModel: LoadedModel = {
        definition,
        runtime,
        statistics: {
          totalInferences: 0,
          successfulInferences: 0,
          failedInferences: 0,
          averageLatencyMs: 0,
          errorRate: 0,
          throughput: 0,
          recentErrors: []
        },
        loadTime: new Date(),
        lastUsed: new Date(),
        status: ModelStatus.READY
      };

      this.loadedModels.set(modelId, loadedModel);
      
      const loadTime = Date.now() - loadStartTime;
      logger.info(`Model ${modelId} loaded successfully in ${loadTime}ms`);

    } catch (error) {
      logger.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a model from memory
   */
  async unloadModel(modelId: string): Promise<void> {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      logger.warn(`Model ${modelId} not loaded`);
      return;
    }

    logger.info(`Unloading model ${modelId}...`);
    
    try {
      loadedModel.status = ModelStatus.UNLOADING;
      
      // Clean up runtime resources
      await this.cleanupModelRuntime(loadedModel.runtime);
      
      this.loadedModels.delete(modelId);
      
      logger.info(`Model ${modelId} unloaded successfully`);
    } catch (error) {
      logger.error(`Failed to unload model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get available models for a hospital
   */
  async getAvailableModels(hospitalId?: string): Promise<ModelDefinition[]> {
    const config = this.hospitalConfigs.get(hospitalId || 'default');
    if (!config) {
      return Array.from(this.models.values());
    }

    return config.assignedModels
      .filter(assignment => assignment.enabled)
      .map(assignment => this.models.get(assignment.modelId))
      .filter(model => model !== undefined) as ModelDefinition[];
  }

  /**
   * Get a loaded model instance
   */
  async getModel(modelId: string): Promise<any> {
    const loadedModel = this.loadedModels.get(modelId);
    if (!loadedModel) {
      throw new Error(`Model ${modelId} not loaded`);
    }

    if (loadedModel.status !== ModelStatus.READY) {
      throw new Error(`Model ${modelId} not ready (status: ${loadedModel.status})`);
    }

    // Update usage statistics
    loadedModel.lastUsed = new Date();
    loadedModel.statistics.totalInferences++;

    return loadedModel.runtime.instance;
  }

  /**
   * Get health status of all models
   */
  async getHealthStatus(): Promise<{
    loadedModels: number;
    totalModels: number;
    errorRate: number;
    memoryUsage: number;
    models: ModelHealth[];
  }> {
    const modelHealths: ModelHealth[] = [];
    let totalMemory = 0;
    let totalErrors = 0;
    let totalInferences = 0;

    for (const [modelId, loadedModel] of this.loadedModels.entries()) {
      const health = await this.checkModelHealth(modelId, loadedModel);
      modelHealths.push(health);
      
      totalMemory += loadedModel.runtime.memoryUsage;
      totalErrors += loadedModel.statistics.failedInferences;
      totalInferences += loadedModel.statistics.totalInferences;
    }

    const overallErrorRate = totalInferences > 0 ? totalErrors / totalInferences : 0;

    return {
      loadedModels: this.loadedModels.size,
      totalModels: this.models.size,
      errorRate: overallErrorRate,
      memoryUsage: totalMemory,
      models: modelHealths
    };
  }

  // Private helper methods

  private async checkSystemRequirements(definition: ModelDefinition): Promise<void> {
    const requirements = definition.requirements;
    
    // Check available memory (simplified - would use actual system monitoring)
    const availableMemory = 32768; // MB - would get from system
    if (availableMemory < requirements.memory.minimum) {
      throw new Error(`Insufficient memory: need ${requirements.memory.minimum}MB, available ${availableMemory}MB`);
    }
  }

  private async createModelRuntime(definition: ModelDefinition): Promise<ModelRuntime> {
    // This would create the actual model runtime based on the framework
    // For now, returning a mock runtime
    return {
      instance: {
        predict: async (input: any) => {
          // Mock prediction
          return { probabilities: [0.1, 0.9], confidence: 0.8 };
        }
      },
      warmupCompleted: false,
      memoryUsage: definition.requirements.memory.minimum,
      gpuMemoryUsage: definition.requirements.memory.gpu,
      version: definition.version,
      backend: 'tensorflow' as const
    };
  }

  private async warmupModel(runtime: ModelRuntime, definition: ModelDefinition): Promise<void> {
    // Perform warmup inference with dummy data
    const dummyInput = this.createDummyInput(definition.specifications.inputFormat);
    
    try {
      await runtime.instance.predict(dummyInput);
      runtime.warmupCompleted = true;
      logger.info(`Model ${definition.id} warmup completed`);
    } catch (error) {
      throw new Error(`Model warmup failed: ${(error as Error).message}`);
    }
  }

  private createDummyInput(inputFormat: any): any {
    const shape = inputFormat.shape;
    const dummyData = Array(shape[0]).fill(null).map(() => 
      Array(shape[1]).fill(0).map(() => Math.random() * 0.01)
    );
    return dummyData;
  }

  private async cleanupModelRuntime(runtime: ModelRuntime): Promise<void> {
    // Clean up model runtime resources
    if (runtime.instance && typeof runtime.instance.cleanup === 'function') {
      await runtime.instance.cleanup();
    }
  }

  private async checkModelHealth(modelId: string, loadedModel: LoadedModel): Promise<ModelHealth> {
    const stats = loadedModel.statistics;
    const errorRate = stats.totalInferences > 0 ? 
      stats.failedInferences / stats.totalInferences : 0;
    
    const availability = loadedModel.status === ModelStatus.READY ? 1.0 : 0.0;
    
    const isHealthy = errorRate < 0.1 && 
                     availability > 0.9 && 
                     loadedModel.runtime.memoryUsage < loadedModel.definition.requirements.memory.recommended;

    const issues: HealthIssue[] = [];
    
    if (errorRate > 0.1) {
      issues.push({
        type: 'error',
        severity: errorRate > 0.5 ? 'critical' : 'high',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        timestamp: new Date(),
        suggestion: 'Check model inputs and preprocessing'
      });
    }

    if (loadedModel.runtime.memoryUsage > loadedModel.definition.requirements.memory.recommended) {
      issues.push({
        type: 'memory',
        severity: 'medium',
        message: 'High memory usage',
        timestamp: new Date(),
        suggestion: 'Consider model optimization or memory cleanup'
      });
    }

    return {
      modelId,
      status: loadedModel.status,
      isHealthy,
      lastHealthCheck: new Date(),
      healthMetrics: {
        availability,
        averageLatency: stats.averageLatencyMs,
        errorRate,
        memoryUsage: loadedModel.runtime.memoryUsage,
        gpuUtilization: 0.5, // Would get from GPU monitoring
        throughput: stats.throughput
      },
      issues,
      recommendation: isHealthy ? 'Model operating normally' : 'Model requires attention'
    };
  }

  private startHealthMonitoring(): void {
    // Check model health every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.getHealthStatus();
        
        // Log overall health
        if (healthStatus.errorRate > 0.1) {
          logger.warn(`High overall error rate: ${(healthStatus.errorRate * 100).toFixed(1)}%`);
        }
        
        // Check individual models
        for (const modelHealth of healthStatus.models) {
          if (!modelHealth.isHealthy) {
            logger.warn(`Model ${modelHealth.modelId} unhealthy:`, modelHealth.issues);
          }
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Cleanup resources when shutting down
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down model registry...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Unload all models
    const unloadPromises = Array.from(this.loadedModels.keys()).map(modelId => 
      this.unloadModel(modelId).catch(error => 
        logger.error(`Failed to unload model ${modelId} during shutdown:`, error)
      )
    );

    await Promise.all(unloadPromises);
    
    logger.info('Model registry shutdown complete');
  }
}