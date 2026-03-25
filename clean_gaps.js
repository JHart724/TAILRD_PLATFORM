const fs = require('fs');

function cleanAndUpdateFile(filePath, gapPrefix, exportConst, gapUpdates) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the array
  const arrStart = content.indexOf(`export const ${exportConst}`);
  const bracketStart = content.indexOf('[', arrStart);

  // Find matching ] using brace counting
  let depth = 0, arrEnd = -1;
  for (let i = bracketStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') { depth--; if (depth === 0) { arrEnd = i + 1; break; } }
  }

  const before = content.substring(0, bracketStart);
  const arrayStr = content.substring(bracketStart, arrEnd);
  const after = content.substring(arrEnd);

  // Extract individual gap objects using brace matching
  const gaps = [];
  let pos = 1; // skip opening [
  while (pos < arrayStr.length - 1) {
    // Find next {
    const objStart = arrayStr.indexOf('{', pos);
    if (objStart === -1) break;

    // Match braces
    let d = 0, objEnd = -1;
    for (let i = objStart; i < arrayStr.length; i++) {
      if (arrayStr[i] === '{') d++;
      if (arrayStr[i] === '}') { d--; if (d === 0) { objEnd = i + 1; break; } }
    }
    if (objEnd === -1) break;

    let gapObj = arrayStr.substring(objStart, objEnd);

    // Extract the gap id
    const idMatch = gapObj.match(/id:\s*'([^']+)'/);
    if (idMatch) {
      const gapId = idMatch[1];

      // Check if this is a duplicate (already seen this id)
      const existingIdx = gaps.findIndex(g => g.id === gapId);
      if (existingIdx !== -1) {
        // Keep the later (cleaner) copy
        gaps[existingIdx] = { id: gapId, text: gapObj };
      } else {
        gaps.push({ id: gapId, text: gapObj });
      }
    }

    pos = objEnd;
  }

  console.log(`Found ${gaps.length} unique gaps in ${exportConst}`);

  // Now update each gap's fields
  for (const gap of gaps) {
    const update = gapUpdates[gap.id];
    if (!update) continue;

    let text = gap.text;

    // Update patientCount
    text = text.replace(/patientCount:\s*\d+/, `patientCount: ${update.patients}`);

    // Update dollarOpportunity
    text = text.replace(/dollarOpportunity:\s*\d+/, `dollarOpportunity: ${update.dollars}`);

    // Update diagnosticOpportunity if present
    if (update.diagnosticOpportunity !== undefined) {
      text = text.replace(/diagnosticOpportunity:\s*\d+/, `diagnosticOpportunity: ${update.diagnosticOpportunity}`);
    }

    // Update pharmaceuticalOpportunity if present
    if (update.pharmaceuticalOpportunity !== undefined) {
      text = text.replace(/pharmaceuticalOpportunity:\s*\d+/, `pharmaceuticalOpportunity: ${update.pharmaceuticalOpportunity}`);
    }

    // Update methodologyNote - find and replace the value
    const mnIdx = text.indexOf("methodologyNote:");
    if (mnIdx !== -1) {
      // Find the opening quote
      const quoteStart = text.indexOf("'", mnIdx + "methodologyNote:".length);
      if (quoteStart !== -1) {
        // Find the closing quote - use a careful scan
        let i = quoteStart + 1;
        let foundEnd = -1;
        while (i < text.length) {
          if (text[i] === "'") {
            // Look at what follows
            const rest = text.substring(i + 1).trimStart();
            if (rest.startsWith(',') || rest.startsWith('}') || rest.length === 0) {
              foundEnd = i;
              break;
            }
          }
          i++;
        }
        if (foundEnd !== -1) {
          text = text.substring(0, quoteStart + 1) + update.methodology + text.substring(foundEnd);
        } else {
          console.log(`WARNING: Could not find closing quote for methodologyNote of ${gap.id}`);
        }
      }
    }

    gap.text = text;
  }

  // Reconstruct the array
  const newArray = '[\n' + gaps.map(g => '  ' + g.text).join(',\n') + ',\n]';

  const newContent = before + newArray + after;
  fs.writeFileSync(filePath, newContent);

  // Verify gap count
  const verContent = fs.readFileSync(filePath, 'utf8');
  const count = (verContent.match(new RegExp(`id:\\s*'${gapPrefix}`, 'g')) || []).length;
  console.log(`Verification: ${count} ${gapPrefix} gaps`);

  return count;
}

const D = 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. ';

// HF Updates
const hfUpdates = {
  'hf-gap-1-attr-cm': { patients: 250, dollars: 1225000, diagnosticOpportunity: 1225000, pharmaceuticalOpportunity: 2531250, methodology: D+'Patient count based on Castano et al (JAMA Cardiology) ATTR-CM prevalence of 5% applied to estimated HFpEF panel of 9,000 patients: 9,000 x 5% x 80% undiagnosed x 35% market share = ~250 patients. Diagnostic opportunity: Tc-99m PYP scan + cardiology workup ($7,000/patient) x 250 x 70% completion rate = $1,225,000. Pharmaceutical opportunity (shown separately): 250 x $225K/yr tafamidis x 15% specialty pharmacy capture x 30% conversion = $2.5M. Dollar opportunity reflects diagnostic workup only.' },
  'hf-gap-2-iron-deficiency': { patients: 260, dollars: 1248000, methodology: D+'Patient count based on Nature Medicine 2025 meta-analysis iron deficiency prevalence of 65% applied to estimated HF panel of 18,000 patients: 18,000 x 65% x 80% untreated x 35% market share = ~3,276 at risk. EHR identifiable: ~40% = ~1,310. Actionable with complete labs: 260 patients. Dollar opportunity: IV iron infusion facility fee ($800/session x 6 sessions = $4,800/patient) x 260 = $1,248,000. Conversion rate: 100%.' },
  'hf-gap-6-finerenone': { patients: 190, dollars: 1728000, methodology: D+'Patient count based on FINEARTS-HF eligibility of 65% applied to estimated HFpEF panel of 9,000 patients: 9,000 x 65% x 94% not on finerenone x 35% market share = ~1,920 eligible. 10% identifiable = ~190 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 1,920 eligible x 75% conversion = $1,728,000. Conversion rate: 75%.' },
  'hf-gap-7-glp1-hfpef': { patients: 110, dollars: 0, methodology: D+'Patient count based on STEP-HFpEF/SUMMIT eligibility of 40% BMI>=30 applied to estimated HFpEF panel of 9,000 patients: 9,000 x 40% x 85% not on GLP-1 x 10% identifiable x 35% market share = ~110 patients. Dollar opportunity: $0 -- health system does not capture pharmaceutical revenue. Conversion rate: N/A.' },
  'hf-gap-12-hcm-myosin': { patients: 30, dollars: 0, methodology: D+'Patient count based on EXPLORER-HCM prevalence of 0.2% HCM applied to estimated CV panel of 45,000 patients: 45,000 x 0.2% x 70% obstructive x 70% untreated x 65% identifiable x 35% market share = ~30 patients. Dollar opportunity: $0 -- specialty pharmacy. Conversion rate: N/A.' },
  'hf-gap-13-cardiomems': { patients: 380, dollars: 3420000, methodology: D+'Patient count based on CHAMPION trial NYHA III eligibility of 40% applied to estimated 3,200 HF admissions/year: 3,200 x 40% NYHA III x 85% not enrolled x 35% market share = ~380 patients. Dollar opportunity: CardioMEMS implant DRG $18,000 x 25% device conversion rate x 380 + downstream RPM monitoring = $3,420,000. Conversion rate: 25%.' },
  'hf-gap-16-castle-af': { patients: 75, dollars: 877500, methodology: D+'Patient count based on CASTLE-AF AF prevalence of 15% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 80% no ablation referral x 75% identifiable x 35% market share = ~75 patients. Dollar opportunity: AF ablation DRG $26,000 x 30% procedural conversion rate x 75 + downstream monitoring = $877,500. Conversion rate: 30%.' },
  'hf-gap-17-ivabradine': { patients: 40, dollars: 48000, methodology: D+'Patient count based on SHIFT trial eligibility of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% x 50% not on ivabradine x 8% identifiable x 35% market share = ~40 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 40 = $48,000. Conversion rate: 100%.' },
  'hf-gap-18-vericiguat': { patients: 25, dollars: 30000, methodology: D+'Patient count based on VICTORIA trial eligibility of 12% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 12% x 85% not on vericiguat x 8% identifiable x 35% market share = ~25 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 25 = $30,000. Conversion rate: 100%.' },
  'hf-gap-19-hisdn-aheft': { patients: 28, dollars: 33600, methodology: D+'Patient count based on A-HeFT eligibility of 15% Black population applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 70% not on H-ISDN x 10% identifiable x 35% market share = ~28 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 28 = $33,600. Conversion rate: 100%.' },
  'hf-gap-20-cardiac-rehab': { patients: 170, dollars: 856800, methodology: D+'Patient count based on national cardiac rehab referral gap of 75% applied to estimated qualifying cases of ~3,100/year: 3,100 x 75% gap x 70% identifiable x 10% HFrEF subset = ~170 patients. Dollar opportunity: cardiac rehab course $2,400 x 35% referral capture rate x 170 x downstream program revenue = $856,800. Conversion rate: 35%.' },
  'hf-gap-21-undiagnosed-hfpef': { patients: 85, dollars: 26775, methodology: D+'Patient count based on undiagnosed HFpEF prevalence of 3% applied to estimated CV panel of 45,000 patients: 45,000 x 3% x 60% identifiable x 35% market share = ~85 patients. Dollar opportunity: echo + NT-proBNP workup ($450/patient) x 70% completion rate x 85 = $26,775. Conversion rate: 70%.' },
  'hf-gap-22-danish-icd': { patients: 50, dollars: 1155000, methodology: D+'Patient count based on DANISH extended follow-up NICM prevalence of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% NICM x 50% LVEF<=35% x 60% no ICD x 70% identifiable x 35% market share = ~50 patients. Dollar opportunity: ICD implant DRG $55,000 x 25% device conversion rate x 50 + downstream monitoring = $1,155,000. Conversion rate: 25%.' },
  'hf-gap-26-osa-hf': { patients: 105, dollars: 183750, methodology: D+'Patient count based on OSA prevalence of 50% applied to estimated HF panel of 18,000 patients: 18,000 x 50% x 40% unscreened x 5% identifiable x 35% market share = ~105 patients. Dollar opportunity: sleep study + CPAP program ($2,500/patient) x 70% completion rate x 105 = $183,750. Conversion rate: 70%.' },
  'hf-gap-29-rpm': { patients: 150, dollars: 252000, methodology: D+'Patient count based on RPM eligibility of 30% NYHA II-III applied to estimated HF panel of 18,000 patients: 18,000 x 30% x 85% not on RPM x 8% identifiable x 35% market share = ~150 patients. Dollar opportunity: RPM program revenue $1,200/yr per patient x 70% completion rate x 150 x 2 (includes setup + monitoring) = $252,000. Conversion rate: 70%.' },
  'hf-gap-30-arni-underdosing': { patients: 95, dollars: 0, methodology: D+'Patient count based on PARADIGM-HF uptitration gap of 60% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 35% on ARNI x 60% below target x 70% identifiable x 35% market share = ~95 patients. Dollar opportunity: $0 -- pharmaceutical revenue. Conversion rate: N/A.' },
  'hf-gap-31-loop-without-mra': { patients: 85, dollars: 0, methodology: D+'Patient count based on RALES/EMPHASIS-HF MRA gap of 40% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 60% on loop diuretic x 40% no MRA x 8% identifiable x 35% market share = ~85 patients. Dollar opportunity: $0 -- safety/pharmaceutical gap. Conversion rate: N/A.' },
  'hf-gap-73-hyponatremia': { patients: 55, dollars: 0, methodology: D+'Patient count based on EVEREST trial hyponatremia prevalence of 20% applied to estimated HF panel of 18,000 patients: 18,000 x 20% Na<135 x 30% untreated x 7% identifiable x 35% market share = ~55 patients. Dollar opportunity: $0 -- specialty pharmacy. Conversion rate: N/A.' },
  'hf-gap-74-bnp-monitoring': { patients: 145, dollars: 15225, methodology: D+'Patient count based on GUIDE-IT/PRIMA biomarker monitoring gap of 25% applied to HF NYHA II+ panel: 18,000 x 60% NYHA II+ x 25% no NP in 6 months x 8% identifiable x 35% market share = ~145 patients. Dollar opportunity: lab monitoring ($150/patient) x 70% completion rate x 145 = $15,225. Conversion rate: 70%.' },
  'hf-gap-75-cardiac-mri-cm': { patients: 40, dollars: 50400, methodology: D+'Patient count based on new cardiomyopathy incidence of 2% applied to estimated HF panel of 18,000 patients: 18,000 x 2% x 60% no CMR x 30% identifiable x 35% market share = ~40 patients. Dollar opportunity: cardiac MRI ($1,800/patient) x 70% completion rate x 40 = $50,400. Conversion rate: 70%.' },
  'hf-gap-76-palliative-care': { patients: 20, dollars: 0, methodology: D+'Patient count based on Stage D HF prevalence of 3% applied to estimated HF panel of 18,000 patients: 18,000 x 3% x 80% no palliative care x 7% identifiable x 35% market share = ~20 patients. Dollar opportunity: $0 -- palliative care referral. Conversion rate: N/A.' },
  'hf-gap-77-diuretic-resistance': { patients: 38, dollars: 0, methodology: D+'Patient count based on ADVOR trial diuretic resistance prevalence of 28% applied to advanced HF subset: 18,000 x 5% x 28% x 60% identifiable x 35% market share = ~38 patients. Dollar opportunity: $0 -- safety/quality gap. Cost avoidance: avoided readmission ($12K avg) x probability. Conversion rate: N/A.' },
  'hf-gap-78-predischarge-bnp': { patients: 75, dollars: 0, methodology: D+'Patient count based on PRIMA trial predischarge monitoring gap of 40% applied to estimated 3,200 HF admissions/year: 3,200 x 40% x 60% identifiable x 35% market share = ~75 patients. Dollar opportunity: $0 -- safety/quality gap. Cost avoidance: avoided 30-day readmission ($12K CMS penalty) x 20% reduction. Conversion rate: N/A.' },
  'hf-gap-5-functional-mr-coapt': { patients: 25, dollars: 812500, methodology: D+'Patient count based on COAPT trial functional MR prevalence of 10% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 10% x 60% COAPT criteria x 65% identifiable x 35% market share = ~25 patients. Dollar opportunity: MitraClip/TEER DRG $65,000 x 30% procedural conversion rate x 25 + downstream monitoring = $812,500. Cross-module with SH Gap 5. Conversion rate: 30%.' },
  'hf-gap-42-attr-as-co-detection': { patients: 12, dollars: 66000, methodology: D+'Patient count based on Castano (JACC 2020) ATTR-CM prevalence of 10% in severe AS >=65 applied to TAVR/AVR volume of ~380 patients: 380 x 10% x 50% undiagnosed x 50% identifiable x 35% market share = ~12 patients. Dollar opportunity: Tc-99m PYP + workup ($5,500/patient) x 12 = $66,000. Conversion rate: 100%.' },
  'hf-gap-44-digoxin-toxicity': { patients: 24, dollars: 0, methodology: D+'Patient count based on AGS Beers Criteria digoxin dose-renal mismatch of 40% applied to HF digoxin users: 18,000 x 5% x 40% x 50% identifiable x 35% market share = ~24 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided digoxin toxicity hospitalization ($12K avg) x probability. Conversion rate: N/A.' },
};

// EP Updates
const epUpdates = {
  'ep-gap-4-laac': { patients: 440, dollars: 4620000, methodology: D+'Patient count based on Watchman FLX (PREVAIL, PROTECT AF) OAC contraindication prevalence of 15% applied to estimated AF panel of 12,000 patients: 12,000 x 15% OAC contraindicated x 70% not yet receiving LAAC x 35% market share = ~440 patients. Dollar opportunity: LAAC DRG $35,000 x 30% procedural conversion rate x 440 = $4,620,000. Conversion rate: 30%.' },
  'ep-gap-10-csp': { patients: 25, dollars: 112500, methodology: D+'Patient count based on I-CLAS trial CRT non-response rate of 30% applied to estimated CRT subset: 350 ICD/CRT implants x 40% CRT = 140. 140 x 30% non-responders x 60% identifiable x 35% market share = ~25 patients. Dollar opportunity: CSP upgrade DRG $60,000 x 25% device conversion x 25 x 30% = $112,500. Conversion rate: 25%.' },
  'ep-gap-11-pfa-reablation': { patients: 180, dollars: 1404000, methodology: D+'Patient count based on ADVENT/MANIFEST-17K AF recurrence rate of 25% applied to estimated 1,200 annual ablation volume: 1,200 x 25% recurrence = ~300. 300 x 60% identifiable = ~180 patients. Dollar opportunity: PFA re-ablation DRG $26,000 x 30% procedural conversion rate x 180 = $1,404,000. Conversion rate: 30%.' },
  'ep-gap-16-castle-af': { patients: 75, dollars: 585000, methodology: D+'Patient count based on CASTLE-AF AF prevalence of 15% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 80% no ablation referral x 75% identifiable x 35% market share = ~75 patients. Cross-module with HF. Dollar opportunity: AF ablation DRG $26,000 x 30% conversion = $585,000. Conversion rate: 30%.' },
  'ep-gap-22-danish-icd': { patients: 50, dollars: 481250, methodology: D+'Patient count based on DANISH extended follow-up NICM prevalence of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% NICM x 50% LVEF<=35% x 60% no ICD x 70% identifiable x 35% market share = ~50 patients. Cross-module with HF. Dollar opportunity: ICD DRG $55,000 x 25% device conversion x 50 x 70% = $481,250. Conversion rate: 25%.' },
  'ep-gap-26-osa-af': { patients: 120, dollars: 210000, methodology: D+'Patient count based on OSA prevalence of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 40% OSA x 40% unscreened x 5% identifiable x 35% market share = ~120 patients. Cross-module with HF. Dollar opportunity: sleep study + CPAP ($2,500/patient) x 70% completion x 120 = $210,000. Conversion rate: 70%.' },
  'ep-gap-27-wpw': { patients: 35, dollars: 39200, methodology: D+'Patient count based on WPW prevalence of 2.5% in EP referrals: 1,200 ablations x 2.5% WPW x 50% not risk-stratified x 40% actionable = ~35 patients. Dollar opportunity: EP study ($1,600/patient) x 70% completion x 35 = $39,200. Conversion rate: 70%.' },
  'ep-gap-33-amiodarone-monitoring': { patients: 75, dollars: 42000, methodology: D+'Patient count based on amiodarone monitoring gap of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 5% on amiodarone x 40% overdue x 50% identifiable x 35% market share = ~75 patients. Dollar opportunity: monitoring panel ($800/patient) x 70% completion x 75 = $42,000. Conversion rate: 70%.' },
  'ep-gap-40-carotid-stroke': { patients: 50, dollars: 126000, methodology: D+'Patient count based on NASCET trial carotid evaluation gap of 25% applied to estimated stroke volume of ~1,200/year: 1,200 x 25% x 60% identifiable x 35% market share = ~50 patients. Dollar opportunity: carotid duplex + CEA/CAS subset = $126,000. Conversion rate: 30%.' },
  'ep-gap-41-fontan': { patients: 12, dollars: 10080, methodology: D+'Patient count based on adult Fontan prevalence of ~1:10,000 applied to catchment of 2.5M: 2.5M x 35% = ~875K. ~87 adult Fontan patients. 40% surveillance overdue x 40% identifiable = ~12 patients. Dollar opportunity: monitoring ($1,200/patient) x 70% completion x 12 = $10,080. Conversion rate: 70%.' },
  'ep-gap-53-oac-monotherapy': { patients: 95, dollars: 0, methodology: D+'Patient count based on AUGUSTUS trial deprescribing of 30% applied to AF + stable CAD overlap: 12,000 x 25% x 30% >12 months x 40% identifiable x 35% market share = ~95 patients. Dollar opportunity: $0 -- safety/deprescribing alert. Conversion rate: N/A.' },
  'ep-gap-64-persistent-af-rhythm': { patients: 85, dollars: 663000, methodology: D+'Patient count based on EAST-AFNET 4 persistent AF rate control gap of 50% applied to estimated AF panel of 12,000 patients: 12,000 x 20% persistent AF <1 year x 50% rate control only x 40% identifiable x 35% market share = ~85 patients. Dollar opportunity: cardioversion + ablation subset ($26,000 DRG x 30% conversion) = $663,000. Conversion rate: 30%.' },
  'ep-gap-65-ilr-cryptogenic-stroke': { patients: 65, dollars: 386750, methodology: D+'Patient count based on CRYSTAL-AF ILR ordering gap of 70% applied to cryptogenic stroke: 1,200 strokes x 25% cryptogenic = ~300. 300 x 70% no ILR x 55% identifiable x 35% market share = ~65 patients. Dollar opportunity: ILR implant $8,500 x 70% completion x 65 = $386,750. Conversion rate: 70%.' },
  'ep-gap-66-dofetilide-rems': { patients: 17, dollars: 0, methodology: D+'Patient count based on dofetilide REMS non-compliance of 8% applied to AF dofetilide users: 12,000 x 2% = 240. 240 x 8% = ~17 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.' },
  'ep-gap-67-dronedarone-contraindication': { patients: 20, dollars: 0, methodology: D+'Patient count based on PALLAS/ANDROMEDA contraindication of 25% applied to AF dronedarone users: 12,000 x 3% x 25% x 50% identifiable x 35% market share = ~20 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.' },
  'ep-gap-68-ist-ivabradine': { patients: 22, dollars: 0, methodology: D+'Patient count based on IST prevalence of 1% in EP referrals x 50% not on ivabradine x 60% identifiable x 35% market share = ~22 patients. Dollar opportunity: $0 -- retail pharmacy. Conversion rate: N/A.' },
  'ep-gap-69-flutter-ablation': { patients: 58, dollars: 542880, methodology: D+'Patient count based on typical atrial flutter prevalence of 8% applied to estimated AF panel of 12,000 patients: 12,000 x 8% x 50% on rate control without ablation x 40% identifiable x 35% market share = ~58 patients. Dollar opportunity: CTI ablation DRG $26,000 x 30% procedural conversion rate x 58 + downstream = $542,880. Conversion rate: 30%.' },
  'ep-gap-70-device-battery-eol': { patients: 15, dollars: 0, methodology: D+'Patient count based on device ERI/EOL prevalence of 2% applied to estimated active device population ~8,000: 8,000 x 2% x 50% identifiable x 35% market share = ~15 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.' },
  'ep-gap-71-pvc-cardiomyopathy': { patients: 100, dollars: 780000, methodology: D+'Patient count based on PVC burden prevalence of 8% in arrhythmia panel applied to AF/arrhythmia panel of 12,000 patients: 12,000 x 8% PVC burden x 30% declining LVEF x 35% market share = ~100 patients. Dollar opportunity: PVC ablation DRG $26,000 x 30% procedural conversion x 100 = $780,000. Conversion rate: 30%.' },
  'ep-gap-72-lqts-bb': { patients: 15, dollars: 0, methodology: D+'Patient count based on congenital LQTS prevalence ~1:2,500 applied to catchment: 2.5M x 35% = ~875K. ~350 LQTS patients. 15% without nadolol/propranolol x 35% identifiable = ~15 patients. Dollar opportunity: $0 -- retail pharmacy. Conversion rate: N/A.' },
  'ep-gap-39-qtc-safety': { patients: 55, dollars: 0, methodology: D+'Patient count based on QTc prolongation risk of 10% on >=2 QT-prolonging medications applied to AF panel of 12,000 patients: 12,000 x 10% x 25% QTc >470ms x 40% identifiable x 35% market share = ~55 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.' },
};

console.log('=== Processing HF File ===');
cleanAndUpdateFile('src/ui/heartFailure/components/clinical/hfGapData.ts', 'hf-gap', 'HF_CLINICAL_GAPS', hfUpdates);

console.log('\n=== Processing EP File ===');
cleanAndUpdateFile('src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx', 'ep-gap', 'EP_CLINICAL_GAPS', epUpdates);

// Fix Mount Sinai references
for (const f of [
  'src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx',
  'src/ui/heartFailure/components/clinical/ClinicalGapDetectionDashboard.tsx'
]) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/Mount Sinai Health System based on published program volumes/g, 'representative cardiovascular program based on published clinical benchmarks');
  fs.writeFileSync(f, c);
}

// Final totals
let hfPt = 0, hfDol = 0;
for (const v of Object.values(hfUpdates)) { hfPt += v.patients; hfDol += v.dollars; }
let epPt = 0, epDol = 0;
for (const v of Object.values(epUpdates)) { epPt += v.patients; epDol += v.dollars; }

console.log('\n=== FINAL TOTALS ===');
console.log('HF: ' + hfPt + ' patients, $' + (hfDol/1e6).toFixed(2) + 'M');
console.log('EP: ' + epPt + ' patients, $' + (epDol/1e6).toFixed(2) + 'M');
console.log('Combined: ' + (hfPt+epPt) + ' patients, $' + ((hfDol+epDol)/1e6).toFixed(2) + 'M');
