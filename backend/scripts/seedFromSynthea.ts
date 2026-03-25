/**
 * TAILRD Demo Data Seeder from Synthea Output
 *
 * Selects a curated subset of synthetic patients that clearly
 * demonstrate each of the 104 gaps for demo purposes.
 *
 * Usage: npx tsx backend/scripts/seedFromSynthea.ts [synthea-output-dir]
 */

import * as fs from 'fs';
import * as path from 'path';

interface DemoPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: string;
  race: string;
  gaps: string[];
  keyValues: Record<string, string | number>;
}

interface DemoDataset {
  generatedAt: string;
  syntheaSource: string;
  patientCount: number;
  gapCoverage: Record<string, number>;
  patients: DemoPatient[];
}

async function selectDemoPatients(syntheaDir: string): Promise<DemoDataset> {
  console.log('TAILRD Demo Data Seeder');
  console.log('========================');
  console.log(`Synthea output: ${syntheaDir}`);

  // Selection criteria:
  // - 3-5 patients per gap who clearly trigger that gap
  // - Each of the 104 gaps has at least 3 representative patients
  // - Some patients trigger multiple gaps (cross-module demo)
  // - Include ATTR-CM + AS co-detection (patient with both)
  // - Include patients with trajectory data (multiple KCCQ/LVEF/NT-proBNP timepoints)

  const dataset: DemoDataset = {
    generatedAt: new Date().toISOString(),
    syntheaSource: syntheaDir,
    patientCount: 0,
    gapCoverage: {},
    patients: [],
  };

  // In production, this would read Synthea output and select patients
  // For now, document the selection algorithm
  console.log('\nSelection algorithm:');
  console.log('1. Load all processed patients from processSynthea output');
  console.log('2. For each of 104 gaps:');
  console.log('   a. Find patients who triggered this gap');
  console.log('   b. Rank by signal clarity (more matching criteria = clearer demo)');
  console.log('   c. Select top 3-5 patients');
  console.log('   d. Prefer patients who also trigger other gaps (cross-module value)');
  console.log('3. Ensure at least 3 patients per gap');
  console.log('4. Add trajectory data for selected patients');
  console.log('5. Export as TypeScript arrays matching frontend format');

  console.log('\nKey cross-module demo patients to prioritize:');
  console.log('- Patient with HF + ATTR-CM + AS (Gap 1 + Gap 42)');
  console.log('- Patient with AF + HFrEF (Gap 11 EP + Gap 9 HF)');
  console.log('- Patient with CAD + PAD (Gap 14 polyvascular)');
  console.log('- Patient with HF + CKD (Gap 6 finerenone)');
  console.log('- Patient with Iron deficiency + HF (Gap 2 + trial eligibility)');

  // Suppress unused variable warnings - used in production path
  void path;

  return dataset;
}

// Main
const syntheaDir = process.argv[2] || './backend/scripts/synthea/output';
selectDemoPatients(syntheaDir).then(dataset => {
  const outputPath = './backend/scripts/synthea/demo-dataset.json';
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  console.log(`\nDemo dataset written to ${outputPath}`);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
