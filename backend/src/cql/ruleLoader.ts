import { logger } from '../utils/logger';
import { CQLEngine, CQLRule } from './cqlEngine';
import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';
import { glob } from 'glob';

/**
 * CQL Rule Loader
 * 
 * Loads CQL rule files from the filesystem, parses metadata, and manages hot-reloading.
 * Organizes rules by clinical modules and handles dependency resolution.
 * 
 * Features:
 * - Load CQL files from ~/tailrd-research/cql-rules/
 * - Parse metadata (library name, version, description)
 * - Categorize by module (HF, EP, Structural, Coronary, PV, Valvular, Cross-module)
 * - Hot-reload when rules change
 * - Rule dependency resolution and loading order
 * - File system watching with debouncing
 */

export interface RuleLoadResult {
  /** Successfully loaded rules */
  loaded: CQLRule[];
  /** Failed to load (with reasons) */
  failed: Array<{
    filePath: string;
    error: string;
  }>;
  /** Total time taken to load */
  loadTimeMs: number;
}

export interface RuleCatalog {
  /** Rules organized by clinical module */
  byModule: Record<CQLRule['module'], CQLRule[]>;
  /** Rules organized by dependency order */
  byLoadOrder: CQLRule[];
  /** Dependency graph */
  dependencyGraph: Map<string, string[]>;
  /** Metadata summary */
  summary: {
    totalRules: number;
    moduleDistribution: Record<CQLRule['module'], number>;
    lastUpdated: Date;
  };
}

export interface HotReloadEvent {
  /** Type of file system event */
  event: 'add' | 'change' | 'unlink';
  /** File path that changed */
  filePath: string;
  /** Rule ID if known */
  ruleId?: string;
  /** Timestamp of the event */
  timestamp: Date;
}

export type RuleChangeCallback = (event: HotReloadEvent) => void;

export class CQLRuleLoader {
  private cqlEngine: CQLEngine;
  private rulesDirectory: string;
  private watcher?: chokidar.FSWatcher;
  private changeCallbacks: RuleChangeCallback[] = [];
  private loadedRules = new Map<string, CQLRule>();
  private dependencyGraph = new Map<string, string[]>();
  private isWatching = false;
  private debounceMap = new Map<string, NodeJS.Timeout>();
  private readonly debounceMs = 1000; // 1 second debounce for file changes

  constructor(cqlEngine: CQLEngine, rulesDirectory?: string) {
    this.cqlEngine = cqlEngine;
    this.rulesDirectory = rulesDirectory || path.join(process.env.HOME || '~', 'tailrd-research', 'cql-rules');
  }

  /**
   * Load all CQL rules from the configured directory
   */
  async loadAllRules(): Promise<RuleLoadResult> {
    const startTime = Date.now();
    const loaded: CQLRule[] = [];
    const failed: Array<{ filePath: string; error: string }> = [];

    try {
      logger.info('Starting CQL rules loading', {
        rulesDirectory: this.rulesDirectory
      });

      // Ensure rules directory exists
      await fs.ensureDir(this.rulesDirectory);

      // Find all CQL files recursively
      const cqlFiles = await this.findCQLFiles();
      logger.info('Found CQL files', { count: cqlFiles.length });

      // Load files with dependency resolution
      const loadOrder = await this.resolveDependencyOrder(cqlFiles);

      for (const filePath of loadOrder) {
        try {
          const rule = await this.loadSingleRule(filePath);
          loaded.push(rule);
          this.loadedRules.set(rule.id, rule);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ filePath, error: errorMessage });

          logger.error('Failed to load CQL rule file', {
            filePath,
            error: errorMessage
          });
        }
      }

      const loadTime = Date.now() - startTime;
      
      logger.info('CQL rules loading completed', {
        totalFiles: cqlFiles.length,
        loaded: loaded.length,
        failed: failed.length,
        loadTimeMs: loadTime
      });

      return {
        loaded,
        failed,
        loadTimeMs: loadTime
      };

    } catch (error) {
      const loadTime = Date.now() - startTime;
      logger.error('CQL rules loading failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        loadTimeMs: loadTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new Error(`Failed to load CQL rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a single CQL rule file
   */
  async loadSingleRule(filePath: string): Promise<CQLRule> {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!await fs.pathExists(absolutePath)) {
        throw new Error('File does not exist');
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      const stats = await fs.stat(absolutePath);
      
      // Extract additional metadata from file system
      const metadata = {
        author: await this.extractAuthorFromGit(absolutePath),
        lastModified: stats.mtime,
        priority: this.inferPriorityFromPath(absolutePath),
        conditions: this.extractConditionsFromContent(content),
        dataRequirements: []
      };

      const rule = await this.cqlEngine.loadRule(content, absolutePath, metadata);

      // Update dependency graph
      this.dependencyGraph.set(rule.id, rule.dependencies);

      logger.debug('CQL rule loaded', {
        ruleId: rule.id,
        libraryName: rule.libraryName,
        filePath: absolutePath,
        dependencies: rule.dependencies.length
      });

      return rule;

    } catch (error) {
      throw new Error(`Failed to load rule from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reload a specific rule file
   */
  async reloadRule(ruleId: string): Promise<CQLRule> {
    const existingRule = this.loadedRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    try {
      // Unload existing rule
      this.cqlEngine.unloadRule(ruleId);
      this.loadedRules.delete(ruleId);

      // Reload from file
      const reloadedRule = await this.loadSingleRule(existingRule.filePath);
      this.loadedRules.set(reloadedRule.id, reloadedRule);

      logger.info('CQL rule reloaded successfully', {
        ruleId: reloadedRule.id,
        libraryName: reloadedRule.libraryName,
        filePath: existingRule.filePath
      });

      return reloadedRule;

    } catch (error) {
      logger.error('Failed to reload CQL rule', {
        ruleId,
        filePath: existingRule.filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Start watching for file changes (hot-reload)
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      logger.warn('File watching already started');
      return;
    }

    try {
      const watchPattern = path.join(this.rulesDirectory, '**/*.cql');
      
      this.watcher = chokidar.watch(watchPattern, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true // don't trigger on existing files
      });

      this.watcher
        .on('add', (filePath) => this.handleFileChange('add', filePath))
        .on('change', (filePath) => this.handleFileChange('change', filePath))
        .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
        .on('error', (error) => {
          logger.error('File watcher error', {
            error: error.message,
            rulesDirectory: this.rulesDirectory
          });
        });

      this.isWatching = true;
      
      logger.info('CQL file watching started', {
        rulesDirectory: this.rulesDirectory,
        watchPattern
      });

    } catch (error) {
      logger.error('Failed to start file watching', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rulesDirectory: this.rulesDirectory
      });

      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    try {
      await this.watcher.close();
      this.watcher = undefined;
      this.isWatching = false;

      // Clear any pending debounced operations
      for (const timeout of this.debounceMap.values()) {
        clearTimeout(timeout);
      }
      this.debounceMap.clear();

      logger.info('CQL file watching stopped');

    } catch (error) {
      logger.error('Error stopping file watcher', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Register callback for rule change events
   */
  onRuleChange(callback: RuleChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Remove rule change callback
   */
  offRuleChange(callback: RuleChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * Get organized catalog of loaded rules
   */
  getRuleCatalog(): RuleCatalog {
    const rules = Array.from(this.loadedRules.values());
    
    const byModule: Record<CQLRule['module'], CQLRule[]> = {
      'HF': [],
      'EP': [],
      'Structural': [],
      'Coronary': [],
      'PV': [],
      'Valvular': [],
      'Cross-module': []
    };

    const moduleDistribution: Record<CQLRule['module'], number> = {
      'HF': 0,
      'EP': 0,
      'Structural': 0,
      'Coronary': 0,
      'PV': 0,
      'Valvular': 0,
      'Cross-module': 0
    };

    // Organize rules by module
    for (const rule of rules) {
      byModule[rule.module].push(rule);
      moduleDistribution[rule.module]++;
    }

    // Sort rules within each module by priority
    for (const module in byModule) {
      byModule[module as CQLRule['module']].sort((a, b) => {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.metadata.priority] - priorityOrder[b.metadata.priority];
      });
    }

    // Create dependency-ordered list
    const byLoadOrder = this.sortByDependencies(rules);

    return {
      byModule,
      byLoadOrder,
      dependencyGraph: new Map(this.dependencyGraph),
      summary: {
        totalRules: rules.length,
        moduleDistribution,
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Validate rule dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [ruleId, dependencies] of this.dependencyGraph.entries()) {
      for (const dependency of dependencies) {
        if (!this.loadedRules.has(dependency)) {
          errors.push(`Rule ${ruleId} depends on missing rule: ${dependency}`);
        }
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDependency = (ruleId: string): boolean => {
      visited.add(ruleId);
      recursionStack.add(ruleId);

      const dependencies = this.dependencyGraph.get(ruleId) || [];
      for (const dependency of dependencies) {
        if (!visited.has(dependency)) {
          if (hasCircularDependency(dependency)) {
            return true;
          }
        } else if (recursionStack.has(dependency)) {
          errors.push(`Circular dependency detected: ${ruleId} -> ${dependency}`);
          return true;
        }
      }

      recursionStack.delete(ruleId);
      return false;
    };

    for (const ruleId of this.loadedRules.keys()) {
      if (!visited.has(ruleId)) {
        hasCircularDependency(ruleId);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private async findCQLFiles(): Promise<string[]> {
    try {
      const pattern = path.join(this.rulesDirectory, '**/*.cql');
      const files = await glob(pattern, {
        absolute: true,
        nodir: true
      });

      return files.sort(); // Sort for consistent loading order

    } catch (error) {
      logger.error('Failed to find CQL files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rulesDirectory: this.rulesDirectory
      });

      return [];
    }
  }

  private async resolveDependencyOrder(filePaths: string[]): Promise<string[]> {
    // Quick scan of files to build initial dependency map
    const dependencyMap = new Map<string, string[]>();
    
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const libraryMatch = content.match(/library\s+(\w+)/i);
        const libraryName = libraryMatch?.[1];
        
        if (libraryName) {
          const dependencies = content.match(/include\s+(\w+)/gi) || [];
          const depNames = dependencies.map(dep => dep.replace(/include\s+/i, ''));
          dependencyMap.set(libraryName, depNames);
        }
      } catch (error) {
        // Skip files that can't be read
        logger.debug('Could not scan file for dependencies', { filePath });
      }
    }

    // Topological sort to resolve load order
    return this.topologicalSort(filePaths, dependencyMap);
  }

  private topologicalSort(filePaths: string[], dependencyMap: Map<string, string[]>): string[] {
    // For now, return original order - in production this would implement
    // a proper topological sort based on the dependency graph
    return filePaths;
  }

  private sortByDependencies(rules: CQLRule[]): CQLRule[] {
    // Simple dependency-aware sorting
    // In production, this would implement proper topological sorting
    return rules.sort((a, b) => {
      // Rules with fewer dependencies load first
      return a.dependencies.length - b.dependencies.length;
    });
  }

  private async handleFileChange(event: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    // Debounce file changes to avoid rapid reloads
    const existingTimeout = this.debounceMap.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        await this.processFileChange(event, filePath);
        this.debounceMap.delete(filePath);
      } catch (error) {
        logger.error('Error processing file change', {
          event,
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, this.debounceMs);

    this.debounceMap.set(filePath, timeout);
  }

  private async processFileChange(event: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    const hotReloadEvent: HotReloadEvent = {
      event,
      filePath,
      timestamp: new Date()
    };

    try {
      switch (event) {
        case 'add':
        case 'change':
          const rule = await this.loadSingleRule(filePath);
          hotReloadEvent.ruleId = rule.id;
          
          logger.info('CQL rule hot-reloaded', {
            event,
            ruleId: rule.id,
            libraryName: rule.libraryName,
            filePath
          });
          break;

        case 'unlink':
          // Find rule by file path and unload it
          const ruleToUnload = Array.from(this.loadedRules.values())
            .find(r => r.filePath === filePath);
          
          if (ruleToUnload) {
            this.cqlEngine.unloadRule(ruleToUnload.id);
            this.loadedRules.delete(ruleToUnload.id);
            this.dependencyGraph.delete(ruleToUnload.id);
            hotReloadEvent.ruleId = ruleToUnload.id;

            logger.info('CQL rule unloaded', {
              ruleId: ruleToUnload.id,
              filePath
            });
          }
          break;
      }

      // Notify callbacks
      for (const callback of this.changeCallbacks) {
        try {
          callback(hotReloadEvent);
        } catch (error) {
          logger.error('Error in rule change callback', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      logger.error('Failed to process file change', {
        event,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async extractAuthorFromGit(filePath: string): Promise<string | undefined> {
    try {
      // In production, this could use git commands to get the author
      // For now, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  private inferPriorityFromPath(filePath: string): CQLRule['metadata']['priority'] {
    const pathLower = filePath.toLowerCase();
    
    if (pathLower.includes('critical') || pathLower.includes('emergency')) {
      return 'critical';
    }
    
    if (pathLower.includes('high') || pathLower.includes('urgent')) {
      return 'high';
    }
    
    if (pathLower.includes('low') || pathLower.includes('optional')) {
      return 'low';
    }
    
    return 'medium';
  }

  private extractConditionsFromContent(content: string): string[] {
    const conditions: string[] = [];
    
    // Look for ICD-10 codes in comments or code blocks
    const icd10Pattern = /[A-Z]\d{2}(?:\.\d+)?/g;
    const matches = content.match(icd10Pattern) || [];
    
    // Filter to likely ICD-10 codes (start with letter, then digits)
    for (const match of matches) {
      if (/^[A-Z]\d{2}/.test(match)) {
        conditions.push(match);
      }
    }
    
    return [...new Set(conditions)]; // Remove duplicates
  }

  /**
   * Get statistics about loaded rules
   */
  getLoadStatistics(): {
    totalRules: number;
    rulesByModule: Record<CQLRule['module'], number>;
    rulesByPriority: Record<CQLRule['metadata']['priority'], number>;
    dependencyStats: {
      rulesWithDependencies: number;
      maxDependencies: number;
      avgDependencies: number;
    };
  } {
    const rules = Array.from(this.loadedRules.values());
    
    const rulesByModule = rules.reduce((counts, rule) => {
      counts[rule.module] = (counts[rule.module] || 0) + 1;
      return counts;
    }, {} as Record<CQLRule['module'], number>);

    const rulesByPriority = rules.reduce((counts, rule) => {
      counts[rule.metadata.priority] = (counts[rule.metadata.priority] || 0) + 1;
      return counts;
    }, {} as Record<CQLRule['metadata']['priority'], number>);

    const dependencyCounts = rules.map(r => r.dependencies.length);
    const rulesWithDependencies = dependencyCounts.filter(count => count > 0).length;
    const maxDependencies = Math.max(...dependencyCounts, 0);
    const avgDependencies = dependencyCounts.length > 0 
      ? dependencyCounts.reduce((sum, count) => sum + count, 0) / dependencyCounts.length 
      : 0;

    return {
      totalRules: rules.length,
      rulesByModule,
      rulesByPriority,
      dependencyStats: {
        rulesWithDependencies,
        maxDependencies,
        avgDependencies: Math.round(avgDependencies * 100) / 100
      }
    };
  }
}

export default CQLRuleLoader;