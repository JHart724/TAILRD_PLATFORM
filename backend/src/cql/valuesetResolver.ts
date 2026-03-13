import { logger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';
import csv from 'csv-parser';

/**
 * Valueset Resolver
 * 
 * Resolves medical terminology valuesets used in CQL rules.
 * Loads and caches terminology from SNOMED, ICD-10, CPT, LOINC, and RxNorm.
 * Supports version-specific resolution and valueset expansion.
 * 
 * Features:
 * - Load terminology from ~/tailrd-research/terminology/
 * - Cache valueset expansions for performance
 * - Support version-specific valueset resolution
 * - Code validation and normalization
 * - Hierarchical code relationships (where available)
 */

export interface CodeConcept {
  /** The code value (e.g., "I50.9") */
  code: string;
  /** The coding system (e.g., "ICD10CM") */
  system: string;
  /** Human-readable display name */
  display: string;
  /** Version of the coding system */
  version?: string;
  /** Additional properties */
  properties?: {
    [key: string]: string | number | boolean;
  };
}

export interface Valueset {
  /** Valueset identifier */
  id: string;
  /** Valueset name */
  name: string;
  /** Description */
  description?: string;
  /** Version */
  version: string;
  /** Coding system(s) included */
  systems: string[];
  /** Expanded codes */
  codes: CodeConcept[];
  /** When this valueset was loaded */
  loadedAt: Date;
  /** Source file path */
  sourceFile?: string;
}

export interface ValuesetQuery {
  /** Valueset ID or URL */
  valueset: string;
  /** Version (if specific version needed) */
  version?: string;
  /** Filter codes (optional) */
  filter?: {
    /** Property to filter on */
    property: string;
    /** Filter operation */
    op: 'equals' | 'in' | 'regex' | 'exists';
    /** Filter value */
    value: string | string[];
  };
}

export interface CodeValidationResult {
  /** Whether the code is valid */
  isValid: boolean;
  /** The normalized code concept */
  concept?: CodeConcept;
  /** Validation message */
  message?: string;
  /** Suggestions for invalid codes */
  suggestions?: CodeConcept[];
}

export interface TerminologyStats {
  /** Number of loaded valuesets */
  valuesetCount: number;
  /** Total number of codes across all systems */
  totalCodes: number;
  /** Codes by system */
  codesBySystem: Record<string, number>;
  /** Cache statistics */
  cacheStats: {
    size: number;
    hitRate: number;
    lastClearTime: Date;
  };
}

export class ValuesetResolver {
  private terminologyDirectory: string;
  private valuesets = new Map<string, Valueset>();
  private codeIndex = new Map<string, CodeConcept[]>(); // system:code -> concepts
  private cache = new Map<string, any>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxCacheSize = 5000;
  private readonly cacheExpirationMs = 30 * 60 * 1000; // 30 minutes

  constructor(terminologyDirectory?: string) {
    this.terminologyDirectory = terminologyDirectory || 
      path.join(process.env.HOME || '~', 'tailrd-research', 'terminology');
  }

  /**
   * Initialize the valueset resolver by loading all terminology files
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing valueset resolver', {
        terminologyDirectory: this.terminologyDirectory
      });

      await fs.ensureDir(this.terminologyDirectory);

      // Load terminology systems
      await this.loadICD10();
      await this.loadCPT();
      await this.loadLOINC();
      await this.loadRxNorm();
      await this.loadSNOMED();

      // Load custom valuesets
      await this.loadCustomValuesets();

      logger.info('Valueset resolver initialized', {
        valuesetCount: this.valuesets.size,
        totalCodes: Array.from(this.valuesets.values())
          .reduce((sum, vs) => sum + vs.codes.length, 0)
      });

    } catch (error) {
      logger.error('Failed to initialize valueset resolver', {
        error: error instanceof Error ? error.message : 'Unknown error',
        terminologyDirectory: this.terminologyDirectory
      });

      throw new Error(`Failed to initialize valueset resolver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve a valueset by ID or URL
   */
  async resolveValueset(query: ValuesetQuery): Promise<Valueset | null> {
    try {
      const cacheKey = this.generateCacheKey('valueset', query);
      
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Find matching valueset
      let valueset = this.valuesets.get(query.valueset);
      
      if (!valueset) {
        // Try partial matches or URL-based lookup
        valueset = this.findValuesetByUrl(query.valueset);
      }

      if (!valueset) {
        logger.debug('Valueset not found', { query });
        return null;
      }

      // Version filtering
      if (query.version && valueset.version !== query.version) {
        logger.debug('Valueset version mismatch', {
          requested: query.version,
          available: valueset.version,
          valueset: query.valueset
        });
        return null;
      }

      // Apply filters if specified
      let filteredValueset = valueset;
      if (query.filter) {
        filteredValueset = this.applyFilter(valueset, query.filter);
      }

      // Cache the result
      this.setCache(cacheKey, filteredValueset);

      return filteredValueset;

    } catch (error) {
      logger.error('Failed to resolve valueset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });

      throw error;
    }
  }

  /**
   * Validate a code against a coding system
   */
  async validateCode(code: string, system: string, version?: string): Promise<CodeValidationResult> {
    try {
      const indexKey = `${system}:${code}`;
      const concepts = this.codeIndex.get(indexKey) || [];
      
      // Filter by version if specified
      const matchingConcepts = version 
        ? concepts.filter(c => c.version === version)
        : concepts;

      if (matchingConcepts.length === 0) {
        // Try fuzzy matching for suggestions
        const suggestions = await this.findSimilarCodes(code, system, 5);
        
        return {
          isValid: false,
          message: `Code ${code} not found in system ${system}`,
          suggestions
        };
      }

      // Return the best match (usually the first/most recent)
      const concept = matchingConcepts[0];
      
      return {
        isValid: true,
        concept,
        message: 'Code is valid'
      };

    } catch (error) {
      logger.error('Code validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code,
        system
      });

      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Expand a valueset to get all included codes
   */
  async expandValueset(valuesetId: string, version?: string): Promise<CodeConcept[]> {
    const query: ValuesetQuery = { valueset: valuesetId, version };
    const valueset = await this.resolveValueset(query);
    
    return valueset ? valueset.codes : [];
  }

  /**
   * Check if a code is in a valueset
   */
  async isCodeInValueset(code: string, system: string, valuesetId: string): Promise<boolean> {
    const codes = await this.expandValueset(valuesetId);
    return codes.some(c => c.code === code && c.system === system);
  }

  /**
   * Find codes by text search
   */
  async searchCodes(searchTerm: string, systems?: string[], limit = 20): Promise<CodeConcept[]> {
    const searchLower = searchTerm.toLowerCase();
    const results: CodeConcept[] = [];

    for (const valueset of this.valuesets.values()) {
      // Skip if system filter specified and doesn't match
      if (systems && !valueset.systems.some(s => systems.includes(s))) {
        continue;
      }

      for (const concept of valueset.codes) {
        if (concept.display.toLowerCase().includes(searchLower) ||
            concept.code.toLowerCase().includes(searchLower)) {
          results.push(concept);

          if (results.length >= limit) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Get terminology statistics
   */
  getStats(): TerminologyStats {
    const codesBySystem: Record<string, number> = {};
    let totalCodes = 0;

    for (const valueset of this.valuesets.values()) {
      for (const system of valueset.systems) {
        const systemCodes = valueset.codes.filter(c => c.system === system).length;
        codesBySystem[system] = (codesBySystem[system] || 0) + systemCodes;
        totalCodes += systemCodes;
      }
    }

    return {
      valuesetCount: this.valuesets.size,
      totalCodes,
      codesBySystem,
      cacheStats: {
        size: this.cache.size,
        hitRate: this.cacheHits + this.cacheMisses > 0 
          ? this.cacheHits / (this.cacheHits + this.cacheMisses) 
          : 0,
        lastClearTime: new Date() // In production, track actual clear time
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('Valueset cache cleared');
  }

  // Private helper methods for loading different terminology systems

  private async loadICD10(): Promise<void> {
    const icd10Path = path.join(this.terminologyDirectory, 'icd10cm');
    
    if (!await fs.pathExists(icd10Path)) {
      logger.debug('ICD-10-CM directory not found', { path: icd10Path });
      return;
    }

    try {
      const codes: CodeConcept[] = [];
      const files = await fs.readdir(icd10Path);
      
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.csv')) {
          const filePath = path.join(icd10Path, file);
          const fileCodes = await this.parseICD10File(filePath);
          codes.push(...fileCodes);
        }
      }

      // Create ICD-10 valueset
      const valueset: Valueset = {
        id: 'icd10cm',
        name: 'ICD-10-CM',
        description: 'International Classification of Diseases, 10th Revision, Clinical Modification',
        version: '2024', // Could be extracted from file metadata
        systems: ['http://hl7.org/fhir/sid/icd-10-cm'],
        codes,
        loadedAt: new Date()
      };

      this.valuesets.set(valueset.id, valueset);
      this.indexCodes(codes);

      logger.info('ICD-10-CM loaded', { codeCount: codes.length });

    } catch (error) {
      logger.error('Failed to load ICD-10-CM', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async parseICD10File(filePath: string): Promise<CodeConcept[]> {
    return new Promise((resolve, reject) => {
      const codes: CodeConcept[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv({
          separator: '\t', // ICD-10 files are often tab-separated
          headers: ['code', 'display'] // Assume standard format
        }))
        .on('data', (row) => {
          if (row.code && row.display) {
            codes.push({
              code: row.code.trim(),
              system: 'http://hl7.org/fhir/sid/icd-10-cm',
              display: row.display.trim(),
              version: '2024'
            });
          }
        })
        .on('end', () => resolve(codes))
        .on('error', reject);
    });
  }

  private async loadCPT(): Promise<void> {
    const cptPath = path.join(this.terminologyDirectory, 'cpt');
    
    if (!await fs.pathExists(cptPath)) {
      logger.debug('CPT directory not found', { path: cptPath });
      return;
    }

    try {
      // Mock CPT codes for common cardiovascular procedures
      const codes: CodeConcept[] = this.getMockCPTCodes();

      const valueset: Valueset = {
        id: 'cpt',
        name: 'Current Procedural Terminology',
        description: 'CPT codes for medical procedures',
        version: '2024',
        systems: ['http://www.ama-assn.org/go/cpt'],
        codes,
        loadedAt: new Date()
      };

      this.valuesets.set(valueset.id, valueset);
      this.indexCodes(codes);

      logger.info('CPT loaded', { codeCount: codes.length });

    } catch (error) {
      logger.error('Failed to load CPT', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadLOINC(): Promise<void> {
    const loincPath = path.join(this.terminologyDirectory, 'loinc');
    
    if (!await fs.pathExists(loincPath)) {
      logger.debug('LOINC directory not found', { path: loincPath });
      return;
    }

    try {
      // Mock LOINC codes for common cardiac lab tests
      const codes: CodeConcept[] = this.getMockLOINCCodes();

      const valueset: Valueset = {
        id: 'loinc',
        name: 'Logical Observation Identifiers Names and Codes',
        description: 'LOINC codes for laboratory tests and clinical measurements',
        version: '2.76',
        systems: ['http://loinc.org'],
        codes,
        loadedAt: new Date()
      };

      this.valuesets.set(valueset.id, valueset);
      this.indexCodes(codes);

      logger.info('LOINC loaded', { codeCount: codes.length });

    } catch (error) {
      logger.error('Failed to load LOINC', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadRxNorm(): Promise<void> {
    const rxnormPath = path.join(this.terminologyDirectory, 'rxnorm');
    
    if (!await fs.pathExists(rxnormPath)) {
      logger.debug('RxNorm directory not found', { path: rxnormPath });
      return;
    }

    try {
      // Mock RxNorm codes for common cardiac medications
      const codes: CodeConcept[] = this.getMockRxNormCodes();

      const valueset: Valueset = {
        id: 'rxnorm',
        name: 'RxNorm',
        description: 'Normalized names for clinical drugs',
        version: '2024-01',
        systems: ['http://www.nlm.nih.gov/research/umls/rxnorm'],
        codes,
        loadedAt: new Date()
      };

      this.valuesets.set(valueset.id, valueset);
      this.indexCodes(codes);

      logger.info('RxNorm loaded', { codeCount: codes.length });

    } catch (error) {
      logger.error('Failed to load RxNorm', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadSNOMED(): Promise<void> {
    const snomedPath = path.join(this.terminologyDirectory, 'snomed');
    
    if (!await fs.pathExists(snomedPath)) {
      logger.debug('SNOMED CT directory not found', { path: snomedPath });
      return;
    }

    try {
      // Mock SNOMED codes for cardiovascular conditions
      const codes: CodeConcept[] = this.getMockSNOMEDCodes();

      const valueset: Valueset = {
        id: 'snomed-ct',
        name: 'SNOMED Clinical Terms',
        description: 'Systematized Nomenclature of Medicine Clinical Terms',
        version: '20240101',
        systems: ['http://snomed.info/sct'],
        codes,
        loadedAt: new Date()
      };

      this.valuesets.set(valueset.id, valueset);
      this.indexCodes(codes);

      logger.info('SNOMED CT loaded', { codeCount: codes.length });

    } catch (error) {
      logger.error('Failed to load SNOMED CT', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadCustomValuesets(): Promise<void> {
    const customPath = path.join(this.terminologyDirectory, 'custom');
    
    if (!await fs.pathExists(customPath)) {
      logger.debug('Custom valuesets directory not found', { path: customPath });
      return;
    }

    try {
      const files = await fs.readdir(customPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(customPath, file);
          const valueset = await this.loadCustomValueset(filePath);
          if (valueset) {
            this.valuesets.set(valueset.id, valueset);
            this.indexCodes(valueset.codes);
          }
        }
      }

      logger.info('Custom valuesets loaded');

    } catch (error) {
      logger.error('Failed to load custom valuesets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadCustomValueset(filePath: string): Promise<Valueset | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Validate required fields
      if (!data.id || !data.name || !data.codes) {
        logger.warn('Invalid custom valueset format', { filePath });
        return null;
      }

      return {
        ...data,
        loadedAt: new Date(),
        sourceFile: filePath
      };

    } catch (error) {
      logger.error('Failed to load custom valueset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });
      return null;
    }
  }

  // Mock data methods - in production these would load from actual terminology files

  private getMockCPTCodes(): CodeConcept[] {
    return [
      {
        code: '93306',
        system: 'http://www.ama-assn.org/go/cpt',
        display: 'Echocardiography, transthoracic, real-time with image documentation',
        version: '2024'
      },
      {
        code: '93351',
        system: 'http://www.ama-assn.org/go/cpt',
        display: 'Echocardiography, transthoracic, real-time with image documentation; during rest and cardiovascular stress test',
        version: '2024'
      },
      {
        code: '93458',
        system: 'http://www.ama-assn.org/go/cpt',
        display: 'Catheter placement in coronary artery(s) for coronary angiography',
        version: '2024'
      }
    ];
  }

  private getMockLOINCCodes(): CodeConcept[] {
    return [
      {
        code: '48641-3',
        system: 'http://loinc.org',
        display: 'Troponin I.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method',
        version: '2.76'
      },
      {
        code: '30934-4',
        system: 'http://loinc.org',
        display: 'Natriuretic peptide.B prohormone N-Terminal [Mass/volume] in Serum or Plasma',
        version: '2.76'
      },
      {
        code: '33762-6',
        system: 'http://loinc.org',
        display: 'Natriuretic peptide.B [Mass/volume] in Serum or Plasma',
        version: '2.76'
      },
      {
        code: '2823-3',
        system: 'http://loinc.org',
        display: 'Potassium [Moles/volume] in Serum or Plasma',
        version: '2.76'
      }
    ];
  }

  private getMockRxNormCodes(): CodeConcept[] {
    return [
      {
        code: '29046',
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: 'Lisinopril',
        version: '2024-01'
      },
      {
        code: '6918',
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: 'Metoprolol',
        version: '2024-01'
      },
      {
        code: '36567',
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: 'Atorvastatin',
        version: '2024-01'
      },
      {
        code: '4603',
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: 'Furosemide',
        version: '2024-01'
      }
    ];
  }

  private getMockSNOMEDCodes(): CodeConcept[] {
    return [
      {
        code: '84114007',
        system: 'http://snomed.info/sct',
        display: 'Heart failure',
        version: '20240101'
      },
      {
        code: '49601007',
        system: 'http://snomed.info/sct',
        display: 'Disorder of cardiovascular system',
        version: '20240101'
      },
      {
        code: '22298006',
        system: 'http://snomed.info/sct',
        display: 'Myocardial infarction',
        version: '20240101'
      },
      {
        code: '49436004',
        system: 'http://snomed.info/sct',
        display: 'Atrial fibrillation',
        version: '20240101'
      }
    ];
  }

  private indexCodes(codes: CodeConcept[]): void {
    for (const concept of codes) {
      const key = `${concept.system}:${concept.code}`;
      const existing = this.codeIndex.get(key) || [];
      existing.push(concept);
      this.codeIndex.set(key, existing);
    }
  }

  private findValuesetByUrl(url: string): Valueset | undefined {
    // Try exact match first
    for (const valueset of this.valuesets.values()) {
      if (valueset.systems.includes(url)) {
        return valueset;
      }
    }
    
    // Try partial match
    for (const valueset of this.valuesets.values()) {
      if (valueset.systems.some(system => system.includes(url) || url.includes(system))) {
        return valueset;
      }
    }

    return undefined;
  }

  private applyFilter(valueset: Valueset, filter: ValuesetQuery['filter']): Valueset {
    if (!filter) return valueset;

    const filteredCodes = valueset.codes.filter(concept => {
      const propValue = concept.properties?.[filter.property] || 
                       (concept as any)[filter.property];
      
      switch (filter.op) {
        case 'equals':
          return propValue === filter.value;
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(String(propValue));
        case 'regex':
          return new RegExp(String(filter.value)).test(String(propValue));
        case 'exists':
          return propValue !== undefined;
        default:
          return true;
      }
    });

    return {
      ...valueset,
      codes: filteredCodes
    };
  }

  private async findSimilarCodes(code: string, system: string, limit: number): Promise<CodeConcept[]> {
    const suggestions: CodeConcept[] = [];
    const codeLower = code.toLowerCase();

    for (const [key, concepts] of this.codeIndex.entries()) {
      const [keySystem] = key.split(':');
      if (keySystem !== system) continue;

      for (const concept of concepts) {
        if (concept.code.toLowerCase().includes(codeLower) ||
            concept.display.toLowerCase().includes(codeLower)) {
          suggestions.push(concept);
          if (suggestions.length >= limit) {
            return suggestions;
          }
        }
      }
    }

    return suggestions;
  }

  private generateCacheKey(type: string, data: any): string {
    return `${type}:${JSON.stringify(data)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached) {
      const { value, timestamp } = cached;
      const age = Date.now() - timestamp;
      
      if (age < this.cacheExpirationMs) {
        this.cacheHits++;
        return value;
      } else {
        this.cache.delete(key);
      }
    }
    
    this.cacheMisses++;
    return null;
  }

  private setCache(key: string, value: any): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}

export default ValuesetResolver;