const fs = require('fs');

// De-duplicate corrupted gap arrays and apply new values
function fixFile(filePath, gapPrefix, gapDefs) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the MASTER GAP DATA array
  const masterStart = content.indexOf('MASTER GAP DATA');
  if (masterStart === -1) {
    console.log('ERROR: Could not find MASTER GAP DATA in ' + filePath);
    return;
  }

  // Find the array start
  const arrayMarker = gapPrefix === 'hf-gap' ? 'export const HF_CLINICAL_GAPS' : 'export const EP_CLINICAL_GAPS';
  const arrayStart = content.indexOf(arrayMarker, masterStart);
  const bracketStart = content.indexOf('[', arrayStart);

  // Find the array end - look for "];" at the start of line
  let arrayEnd = -1;
  let pos = bracketStart + 1;
  let depth = 1;
  while (pos < content.length && depth > 0) {
    if (content[pos] === '[') depth++;
    if (content[pos] === ']') depth--;
    if (depth === 0) {
      arrayEnd = pos + 1; // include the ]
      break;
    }
    pos++;
  }

  if (arrayEnd === -1) {
    console.log('ERROR: Could not find array end');
    return;
  }

  let arrayContent = content.substring(bracketStart, arrayEnd);

  // For each gap, find it in the array and extract just the FIRST occurrence,
  // then de-duplicate by removing subsequent occurrences
  for (const [gapId, patients, dollars, methodology, extra] of gapDefs) {
    const idStr = `id: '${gapId}'`;

    // Count occurrences
    let count = 0;
    let searchPos = 0;
    while (true) {
      const found = arrayContent.indexOf(idStr, searchPos);
      if (found === -1) break;
      count++;
      searchPos = found + idStr.length;
    }

    if (count === 0) {
      console.log(`WARNING: ${gapId} not found`);
      continue;
    }

    if (count > 1) {
      // De-duplicate: keep only the last occurrence (which has the proper closing)
      // Find the first occurrence and everything up to the duplicate
      let firstOcc = arrayContent.indexOf(idStr);
      // Find the position of the SECOND occurrence
      let secondOcc = arrayContent.indexOf(idStr, firstOcc + idStr.length);

      // We want to remove content from the first "methodologyNote:" before the second occurrence
      // back to the first occurrence. The pattern is:
      // ...methodologyNote: 'Demo...$X,XXX... = id: 'gap-id', ...
      // We need to find the methodologyNote in the first occurrence and replace it,
      // then remove duplicate gap content.

      // Strategy: find the start of the first gap object (look backwards for {)
      let firstGapObjStart = arrayContent.lastIndexOf('{', firstOcc);
      // Find where the gap's proper closing should be (just before the duplicate)
      // The duplicate starts with the id string, and before it there's corrupted methodology text
      // We need to find the last clean property before the corruption

      // Look for the line before the second occurrence that contains the corrupted part
      // This is the line with the methodology note that got mangled
      let lineStart = arrayContent.lastIndexOf('\n', secondOcc);
      let corruptedLine = arrayContent.substring(lineStart, secondOcc);

      // If there's a third occurrence, keep going
      let thirdOcc = arrayContent.indexOf(idStr, secondOcc + idStr.length);

      if (thirdOcc !== -1) {
        // Triple duplication - find the end of the LAST occurrence
        let lastLineStart = arrayContent.lastIndexOf('\n', thirdOcc);
        // Find the end of the last proper gap object
        let lastGapEnd = findGapEnd(arrayContent, thirdOcc);

        // Replace the entire range from firstGapObjStart to lastGapEnd
        // with just the last gap content (which has proper closing), but with
        // the correct methodology note
        let lastGapContent = arrayContent.substring(arrayContent.lastIndexOf('{', thirdOcc), lastGapEnd);

        // Remove the first and second occurrences
        // Find the start of the block to remove (from first { to start of last {)
        let removeStart = arrayContent.lastIndexOf('{', firstOcc);
        let removeEnd = arrayContent.lastIndexOf('{', thirdOcc);

        arrayContent = arrayContent.substring(0, removeStart) + arrayContent.substring(removeEnd);

        console.log(`Fixed triple duplication of ${gapId}`);
      } else {
        // Double duplication
        // Find where to cut: from the first gap's { to the second gap's {
        let firstBrace = arrayContent.lastIndexOf('{', firstOcc);
        let secondBrace = arrayContent.lastIndexOf('{', secondOcc);

        // Remove the first duplicate
        arrayContent = arrayContent.substring(0, firstBrace) + arrayContent.substring(secondBrace);

        console.log(`Fixed double duplication of ${gapId}`);
      }
    }
  }

  // Now apply the field changes to the de-duplicated content
  for (const [gapId, patients, dollars, methodology, extra] of gapDefs) {
    const idStr = `id: '${gapId}'`;
    const gapStart = arrayContent.indexOf(idStr);
    if (gapStart === -1) {
      console.log(`WARNING: ${gapId} not found after dedup`);
      continue;
    }

    // Replace patientCount
    const pcSearch = 'patientCount: ';
    const pcPos = arrayContent.indexOf(pcSearch, gapStart);
    if (pcPos !== -1 && pcPos < gapStart + 500) {
      const pcEnd = arrayContent.indexOf(',', pcPos);
      arrayContent = arrayContent.substring(0, pcPos) + `patientCount: ${patients}` + arrayContent.substring(pcEnd);
    }

    // Replace dollarOpportunity
    const doSearch = 'dollarOpportunity: ';
    // Re-find gapStart since content shifted
    const gapStart2 = arrayContent.indexOf(idStr);
    const doPos = arrayContent.indexOf(doSearch, gapStart2);
    if (doPos !== -1 && doPos < gapStart2 + 600) {
      const doEnd = arrayContent.indexOf(',', doPos);
      arrayContent = arrayContent.substring(0, doPos) + `dollarOpportunity: ${dollars}` + arrayContent.substring(doEnd);
    }

    // Replace methodologyNote
    const gapStart3 = arrayContent.indexOf(idStr);
    const mnSearch = "methodologyNote: '";
    const mnPos = arrayContent.indexOf(mnSearch, gapStart3);
    const nextGap = arrayContent.indexOf("id: '", gapStart3 + idStr.length);

    if (mnPos !== -1 && (nextGap === -1 || mnPos < nextGap)) {
      const valueStart = mnPos + mnSearch.length;
      // Find closing quote - scan character by character
      let i = valueStart;
      let foundEnd = -1;
      while (i < arrayContent.length) {
        if (arrayContent[i] === "'" && i > valueStart) {
          // Check what follows - should be comma, newline, or whitespace+comma
          const after = arrayContent.substring(i + 1, i + 5).trim();
          if (after.startsWith(',') || after.startsWith('}') || after === '') {
            foundEnd = i;
            break;
          }
        }
        i++;
      }

      if (foundEnd !== -1) {
        arrayContent = arrayContent.substring(0, valueStart) + methodology + arrayContent.substring(foundEnd);
      } else {
        console.log(`WARNING: Could not find closing quote for methodologyNote of ${gapId}`);
      }
    }

    // Extra replacements (diagnosticOpportunity, pharmaceuticalOpportunity)
    if (extra) {
      for (const [key, val] of Object.entries(extra)) {
        const gapStart4 = arrayContent.indexOf(idStr);
        const exSearch = `${key}: `;
        const exPos = arrayContent.indexOf(exSearch, gapStart4);
        if (exPos !== -1 && exPos < gapStart4 + 500) {
          const exEnd = arrayContent.indexOf(',', exPos);
          arrayContent = arrayContent.substring(0, exPos) + `${key}: ${val}` + arrayContent.substring(exEnd);
        }
      }
    }
  }

  content = content.substring(0, bracketStart) + arrayContent + content.substring(arrayEnd);
  fs.writeFileSync(filePath, content);

  // Verify
  const verContent = fs.readFileSync(filePath, 'utf8');
  const gapCount = (verContent.match(new RegExp(`id: '${gapPrefix}`, 'g')) || []).length;
  console.log(`Verification: ${gapCount} gaps found (expected ${gapDefs.length})`);
}

function findGapEnd(content, gapIdPos) {
  // Find the end of the gap object starting from the gapIdPos
  // Look for the closing },\n  { pattern or },\n]; pattern
  let pos = gapIdPos;
  let depth = 0;
  // First find the opening { for this gap
  let braceStart = content.lastIndexOf('{', pos);
  pos = braceStart;
  depth = 0;
  while (pos < content.length) {
    if (content[pos] === '{') depth++;
    if (content[pos] === '}') {
      depth--;
      if (depth === 0) return pos + 1;
    }
    pos++;
  }
  return content.length;
}

const D = 'Demo health system: 12-hospital system, 2.5M catchment, $600M CV service line. ';

// HF Gaps
const hfGaps = [
  ['hf-gap-1-attr-cm', 250, 1225000, D+'Patient count based on Castano et al (JAMA Cardiology) ATTR-CM prevalence of 5% applied to estimated HFpEF panel of 9,000 patients: 9,000 x 5% x 80% undiagnosed x 35% market share = ~250 patients. Diagnostic opportunity: Tc-99m PYP scan + cardiology workup ($7,000/patient) x 250 x 70% completion rate = $1,225,000. Pharmaceutical opportunity (shown separately): 250 x $225K/yr tafamidis x 15% specialty pharmacy capture x 30% conversion = $2.5M. Dollar opportunity reflects diagnostic workup only.', {diagnosticOpportunity: 1225000, pharmaceuticalOpportunity: 2531250}],
  ['hf-gap-2-iron-deficiency', 260, 1248000, D+'Patient count based on Nature Medicine 2025 meta-analysis iron deficiency prevalence of 65% applied to estimated HF panel of 18,000 patients: 18,000 x 65% x 80% untreated x 35% market share = ~3,276 at risk. EHR identifiable: ~40% = ~1,310. Actionable with complete labs: 260 patients. Dollar opportunity: IV iron infusion facility fee ($800/session x 6 sessions = $4,800/patient) x 260 = $1,248,000. Conversion rate: 100%.'],
  ['hf-gap-6-finerenone', 190, 1728000, D+'Patient count based on FINEARTS-HF eligibility of 65% applied to estimated HFpEF panel of 9,000 patients: 9,000 x 65% x 94% not on finerenone x 35% market share = ~1,920 eligible. 10% identifiable = ~190 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 1,920 eligible x 75% conversion = $1,728,000. Conversion rate: 75%.'],
  ['hf-gap-7-glp1-hfpef', 110, 0, D+'Patient count based on STEP-HFpEF/SUMMIT eligibility of 40% BMI>=30 applied to estimated HFpEF panel of 9,000 patients: 9,000 x 40% x 85% not on GLP-1 x 10% identifiable x 35% market share = ~110 patients. Dollar opportunity: $0 -- health system does not capture pharmaceutical revenue for injectable medications. Conversion rate: N/A.'],
  ['hf-gap-12-hcm-myosin', 30, 0, D+'Patient count based on EXPLORER-HCM prevalence of 0.2% HCM applied to estimated CV panel of 45,000 patients: 45,000 x 0.2% x 70% obstructive x 70% untreated x 65% identifiable x 35% market share = ~30 patients. Dollar opportunity: $0 -- specialty pharmacy. Conversion rate: N/A.'],
  ['hf-gap-13-cardiomems', 380, 3420000, D+'Patient count based on CHAMPION trial NYHA III eligibility of 40% applied to estimated 3,200 HF admissions/year: 3,200 x 40% NYHA III x 85% not enrolled x 35% market share = ~380 patients. Dollar opportunity: CardioMEMS implant DRG $18,000 x 25% device conversion rate x 380 + downstream RPM monitoring = $3,420,000. Conversion rate: 25%.'],
  ['hf-gap-16-castle-af', 75, 877500, D+'Patient count based on CASTLE-AF AF prevalence of 15% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 80% no ablation referral x 75% identifiable x 35% market share = ~75 patients. Dollar opportunity: AF ablation DRG $26,000 x 30% procedural conversion rate x 75 + downstream monitoring = $877,500. Conversion rate: 30%.'],
  ['hf-gap-17-ivabradine', 40, 48000, D+'Patient count based on SHIFT trial eligibility of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% x 50% not on ivabradine x 8% identifiable x 35% market share = ~40 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 40 = $48,000. Conversion rate: 100%.'],
  ['hf-gap-18-vericiguat', 25, 30000, D+'Patient count based on VICTORIA trial eligibility of 12% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 12% x 85% not on vericiguat x 8% identifiable x 35% market share = ~25 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 25 = $30,000. Conversion rate: 100%.'],
  ['hf-gap-19-hisdn-aheft', 28, 33600, D+'Patient count based on A-HeFT eligibility of 15% Black population applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 70% not on H-ISDN x 10% identifiable x 35% market share = ~28 patients. Dollar opportunity: associated visit/monitoring revenue $1,200/patient/year x 28 = $33,600. Conversion rate: 100%.'],
  ['hf-gap-20-cardiac-rehab', 170, 856800, D+'Patient count based on national cardiac rehab referral gap of 75% applied to estimated qualifying cases of ~3,100/year: 3,100 x 75% gap x 70% identifiable x 10% HFrEF subset = ~170 patients. Dollar opportunity: cardiac rehab course $2,400 x 35% referral capture rate x 170 x downstream program revenue = $856,800. Conversion rate: 35%.'],
  ['hf-gap-21-undiagnosed-hfpef', 85, 26775, D+'Patient count based on undiagnosed HFpEF prevalence of 3% applied to estimated CV panel of 45,000 patients: 45,000 x 3% x 60% identifiable x 35% market share = ~85 patients. Dollar opportunity: echo + NT-proBNP workup ($450/patient) x 70% completion rate x 85 = $26,775. Conversion rate: 70%.'],
  ['hf-gap-22-danish-icd', 50, 1155000, D+'Patient count based on DANISH extended follow-up NICM prevalence of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% NICM x 50% LVEF<=35% x 60% no ICD x 70% identifiable x 35% market share = ~50 patients. Dollar opportunity: ICD implant DRG $55,000 x 25% device conversion rate x 50 + downstream monitoring = $1,155,000. Conversion rate: 25%.'],
  ['hf-gap-26-osa-hf', 105, 183750, D+'Patient count based on OSA prevalence of 50% applied to estimated HF panel of 18,000 patients: 18,000 x 50% x 40% unscreened x 5% identifiable x 35% market share = ~105 patients. Dollar opportunity: sleep study + CPAP program ($2,500/patient) x 70% completion rate x 105 = $183,750. Conversion rate: 70%.'],
  ['hf-gap-29-rpm', 150, 252000, D+'Patient count based on RPM eligibility of 30% NYHA II-III applied to estimated HF panel of 18,000 patients: 18,000 x 30% x 85% not on RPM x 8% identifiable x 35% market share = ~150 patients. Dollar opportunity: RPM program revenue $1,200/yr per patient x 70% completion rate x 150 x 2 = $252,000. Conversion rate: 70%.'],
  ['hf-gap-30-arni-underdosing', 95, 0, D+'Patient count based on PARADIGM-HF uptitration gap of 60% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 35% on ARNI x 60% below target x 70% identifiable x 35% market share = ~95 patients. Dollar opportunity: $0 -- pharmaceutical revenue. Conversion rate: N/A.'],
  ['hf-gap-31-loop-without-mra', 85, 0, D+'Patient count based on RALES/EMPHASIS-HF MRA gap of 40% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 60% on loop diuretic x 40% no MRA x 8% identifiable x 35% market share = ~85 patients. Dollar opportunity: $0 -- safety/pharmaceutical gap. Conversion rate: N/A.'],
  ['hf-gap-73-hyponatremia', 55, 0, D+'Patient count based on EVEREST trial hyponatremia prevalence of 20% applied to estimated HF panel of 18,000 patients: 18,000 x 20% Na<135 x 30% untreated x 7% identifiable x 35% market share = ~55 patients. Dollar opportunity: $0 -- specialty pharmacy. Conversion rate: N/A.'],
  ['hf-gap-74-bnp-monitoring', 145, 15225, D+'Patient count based on GUIDE-IT/PRIMA biomarker monitoring gap of 25% applied to HF NYHA II+ panel: 18,000 x 60% NYHA II+ x 25% no NP in 6 months x 8% identifiable x 35% market share = ~145 patients. Dollar opportunity: lab monitoring ($150/patient) x 70% completion rate x 145 = $15,225. Conversion rate: 70%.'],
  ['hf-gap-75-cardiac-mri-cm', 40, 50400, D+'Patient count based on new cardiomyopathy incidence of 2% applied to estimated HF panel of 18,000 patients: 18,000 x 2% x 60% no CMR x 30% identifiable x 35% market share = ~40 patients. Dollar opportunity: cardiac MRI ($1,800/patient) x 70% completion rate x 40 = $50,400. Conversion rate: 70%.'],
  ['hf-gap-76-palliative-care', 20, 0, D+'Patient count based on Stage D HF prevalence of 3% applied to estimated HF panel of 18,000 patients: 18,000 x 3% x 80% no palliative care x 7% identifiable x 35% market share = ~20 patients. Dollar opportunity: $0 -- palliative care referral. Conversion rate: N/A.'],
  ['hf-gap-77-diuretic-resistance', 38, 0, D+'Patient count based on ADVOR trial diuretic resistance prevalence of 28% applied to advanced HF subset: 18,000 x 5% x 28% x 60% identifiable x 35% market share = ~38 patients. Dollar opportunity: $0 -- safety/quality gap. Cost avoidance: avoided readmission ($12K avg) x probability. Conversion rate: N/A.'],
  ['hf-gap-78-predischarge-bnp', 75, 0, D+'Patient count based on PRIMA trial predischarge monitoring gap of 40% applied to estimated 3,200 HF admissions/year: 3,200 x 40% x 60% identifiable x 35% market share = ~75 patients. Dollar opportunity: $0 -- safety/quality gap. Cost avoidance: avoided 30-day readmission. Conversion rate: N/A.'],
  ['hf-gap-5-functional-mr-coapt', 25, 812500, D+'Patient count based on COAPT trial functional MR prevalence of 10% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 10% x 60% COAPT criteria x 65% identifiable x 35% market share = ~25 patients. Dollar opportunity: MitraClip/TEER DRG $65,000 x 30% procedural conversion rate x 25 + downstream monitoring = $812,500. Cross-module with SH Gap 5. Conversion rate: 30%.'],
  ['hf-gap-42-attr-as-co-detection', 12, 66000, D+'Patient count based on Castano (JACC 2020) ATTR-CM prevalence of 10% in severe AS >=65 applied to estimated TAVR/AVR volume of ~380 patients: 380 x 10% x 50% undiagnosed x 50% identifiable x 35% market share = ~12 patients. Dollar opportunity: Tc-99m PYP + workup ($5,500/patient) x 12 = $66,000. Conversion rate: 100%.'],
  ['hf-gap-44-digoxin-toxicity', 24, 0, D+'Patient count based on AGS Beers Criteria digoxin dose-renal mismatch of 40% applied to HF digoxin users: 18,000 x 5% x 40% x 50% identifiable x 35% market share = ~24 patients. Dollar opportunity: $0 -- safety alert. Cost avoidance: avoided digoxin toxicity hospitalization ($12K avg) x probability. Conversion rate: N/A.'],
];

fixFile('src/ui/heartFailure/components/clinical/hfGapData.ts', 'hf-gap', hfGaps);

// EP Gaps
const epGaps = [
  ['ep-gap-4-laac', 440, 4620000, D+'Patient count based on Watchman FLX (PREVAIL, PROTECT AF) OAC contraindication prevalence of 15% applied to estimated AF panel of 12,000 patients: 12,000 x 15% OAC contraindicated x 70% not yet receiving LAAC x 35% market share = ~440 patients. Dollar opportunity: LAAC DRG $35,000 x 30% procedural conversion rate x 440 = $4,620,000. Conversion rate: 30%.'],
  ['ep-gap-10-csp', 25, 112500, D+'Patient count based on I-CLAS trial CRT non-response rate of 30% applied to estimated CRT subset: 350 ICD/CRT implants x 40% CRT = 140. 140 x 30% non-responders x 60% identifiable x 35% market share = ~25 patients. Dollar opportunity: CSP upgrade DRG $60,000 x 25% device conversion rate x 25 x 30% = $112,500. Conversion rate: 25%.'],
  ['ep-gap-11-pfa-reablation', 180, 1404000, D+'Patient count based on ADVENT/MANIFEST-17K AF recurrence rate of 25% applied to estimated 1,200 annual ablation volume: 1,200 x 25% recurrence = ~300. 300 x 60% identifiable = ~180 patients. Dollar opportunity: PFA re-ablation DRG $26,000 x 30% procedural conversion rate x 180 = $1,404,000. Conversion rate: 30%.'],
  ['ep-gap-16-castle-af', 75, 585000, D+'Patient count based on CASTLE-AF AF prevalence of 15% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 15% x 80% no ablation referral x 75% identifiable x 35% market share = ~75 patients. Cross-module with HF. Dollar opportunity: AF ablation DRG $26,000 x 30% procedural conversion rate = $585,000. Conversion rate: 30%.'],
  ['ep-gap-22-danish-icd', 50, 481250, D+'Patient count based on DANISH extended follow-up NICM prevalence of 20% applied to estimated HFrEF panel of 7,200 patients: 7,200 x 20% NICM x 50% LVEF<=35% x 60% no ICD x 70% identifiable x 35% market share = ~50 patients. Cross-module with HF. Dollar opportunity: ICD DRG $55,000 x 25% device conversion rate x 50 x 70% = $481,250. Conversion rate: 25%.'],
  ['ep-gap-26-osa-af', 120, 210000, D+'Patient count based on OSA prevalence of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 40% OSA x 40% unscreened x 5% identifiable x 35% market share = ~120 patients. Cross-module with HF. Dollar opportunity: sleep study + CPAP program ($2,500/patient) x 70% completion rate x 120 = $210,000. Conversion rate: 70%.'],
  ['ep-gap-27-wpw', 35, 39200, D+'Patient count based on WPW prevalence of 2.5% in EP referrals: 1,200 ablations x 2.5% WPW x 50% not risk-stratified x 40% actionable = ~35 patients. Dollar opportunity: EP study facility fee ($1,600/patient) x 70% completion rate x 35 = $39,200. Conversion rate: 70%.'],
  ['ep-gap-33-amiodarone-monitoring', 75, 42000, D+'Patient count based on amiodarone monitoring gap of 40% applied to estimated AF panel of 12,000 patients: 12,000 x 5% on amiodarone x 40% overdue x 50% identifiable x 35% market share = ~75 patients. Dollar opportunity: monitoring panel ($800/patient) x 70% completion rate x 75 = $42,000. Conversion rate: 70%.'],
  ['ep-gap-40-carotid-stroke', 50, 126000, D+'Patient count based on NASCET trial carotid evaluation gap of 25% applied to estimated stroke volume of ~1,200/year: 1,200 x 25% x 60% identifiable x 35% market share = ~50 patients. Dollar opportunity: carotid duplex + CEA/CAS subset = $126,000. Conversion rate: 30%.'],
  ['ep-gap-41-fontan', 12, 10080, D+'Patient count based on adult Fontan prevalence of ~1:10,000 applied to catchment of 2.5M: 2.5M x 35% = ~875K. ~87 adult Fontan patients. 40% surveillance overdue x 40% identifiable = ~12 patients. Dollar opportunity: monitoring program ($1,200/patient) x 70% completion rate x 12 = $10,080. Conversion rate: 70%.'],
  ['ep-gap-53-oac-monotherapy', 95, 0, D+'Patient count based on AUGUSTUS trial deprescribing of 30% applied to AF + stable CAD overlap: 12,000 x 25% x 30% dual antithrombotic >12 months x 40% identifiable x 35% market share = ~95 patients. Dollar opportunity: $0 -- safety/deprescribing alert. Conversion rate: N/A.'],
  ['ep-gap-64-persistent-af-rhythm', 85, 663000, D+'Patient count based on EAST-AFNET 4 persistent AF rate control gap of 50% applied to estimated AF panel of 12,000 patients: 12,000 x 20% persistent AF <1 year x 50% rate control only x 40% identifiable x 35% market share = ~85 patients. Dollar opportunity: cardioversion + ablation subset ($26,000 DRG x 30% conversion) = $663,000. Conversion rate: 30%.'],
  ['ep-gap-65-ilr-cryptogenic-stroke', 65, 386750, D+'Patient count based on CRYSTAL-AF ILR ordering gap of 70% applied to estimated cryptogenic stroke: 1,200 strokes x 25% cryptogenic = ~300. 300 x 70% no ILR x 55% identifiable x 35% market share = ~65 patients. Dollar opportunity: ILR implant $8,500 x 70% completion rate x 65 = $386,750. Conversion rate: 70%.'],
  ['ep-gap-66-dofetilide-rems', 17, 0, D+'Patient count based on dofetilide REMS non-compliance of 8% applied to AF dofetilide users: 12,000 x 2% = 240. 240 x 8% = ~17 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.'],
  ['ep-gap-67-dronedarone-contraindication', 20, 0, D+'Patient count based on PALLAS/ANDROMEDA contraindication of 25% applied to AF dronedarone users: 12,000 x 3% x 25% x 50% identifiable x 35% market share = ~20 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.'],
  ['ep-gap-68-ist-ivabradine', 22, 0, D+'Patient count based on IST prevalence of 1% in EP referrals: broader EP panel x 1% IST x 50% not on ivabradine x 60% identifiable x 35% market share = ~22 patients. Dollar opportunity: $0 -- ivabradine is retail pharmacy. Conversion rate: N/A.'],
  ['ep-gap-69-flutter-ablation', 58, 542880, D+'Patient count based on typical atrial flutter prevalence of 8% applied to estimated AF panel of 12,000 patients: 12,000 x 8% x 50% on rate control without ablation x 40% identifiable x 35% market share = ~58 patients. Dollar opportunity: CTI ablation DRG $26,000 x 30% procedural conversion rate x 58 + downstream = $542,880. Conversion rate: 30%.'],
  ['ep-gap-70-device-battery-eol', 15, 0, D+'Patient count based on device ERI/EOL prevalence of 2% applied to estimated active device population ~8,000: 8,000 x 2% x 50% identifiable x 35% market share = ~15 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.'],
  ['ep-gap-71-pvc-cardiomyopathy', 100, 780000, D+'Patient count based on PVC burden prevalence of 8% in arrhythmia panel applied to AF/arrhythmia panel of 12,000 patients: 12,000 x 8% PVC burden x 30% declining LVEF x 35% market share = ~100 patients. Dollar opportunity: PVC ablation DRG $26,000 x 30% procedural conversion rate x 100 = $780,000. Conversion rate: 30%.'],
  ['ep-gap-72-lqts-bb', 15, 0, D+'Patient count based on congenital LQTS prevalence of ~1:2,500 applied to catchment: 2.5M x 35% = ~875K. ~350 LQTS patients. 15% without nadolol/propranolol x 35% identifiable = ~15 patients. Dollar opportunity: $0 -- nadolol is retail pharmacy. Conversion rate: N/A.'],
  ['ep-gap-39-qtc-safety', 55, 0, D+'Patient count based on QTc prolongation risk of 10% on >=2 QT-prolonging medications applied to AF panel of 12,000 patients: 12,000 x 10% x 25% QTc >470ms x 40% identifiable x 35% market share = ~55 patients. Dollar opportunity: $0 -- safety alert. Conversion rate: N/A.'],
];

fixFile('src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx', 'ep-gap', epGaps);

// Also fix the Mount Sinai references in UI display components
let epContent = fs.readFileSync('src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx', 'utf8');
epContent = epContent.replace(/Mount Sinai Health System based on published program volumes/g, 'representative cardiovascular program based on published clinical benchmarks');
fs.writeFileSync('src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx', epContent);

let hfDashContent = fs.readFileSync('src/ui/heartFailure/components/clinical/ClinicalGapDetectionDashboard.tsx', 'utf8');
hfDashContent = hfDashContent.replace(/Mount Sinai Health System based on published program volumes/g, 'representative cardiovascular program based on published clinical benchmarks');
fs.writeFileSync('src/ui/heartFailure/components/clinical/ClinicalGapDetectionDashboard.tsx', hfDashContent);

// Print totals
let hfPt = 0, hfDol = 0;
for (const [, pts, dol] of hfGaps) { hfPt += pts; hfDol += dol; }
console.log('\n=== FINAL TOTALS ===');
console.log('HF: ' + hfPt + ' patients, $' + (hfDol/1e6).toFixed(2) + 'M');

let epPt = 0, epDol = 0;
for (const [, pts, dol] of epGaps) { epPt += pts; epDol += dol; }
console.log('EP: ' + epPt + ' patients, $' + (epDol/1e6).toFixed(2) + 'M');
console.log('Combined: ' + (hfPt+epPt) + ' patients, $' + ((hfDol+epDol)/1e6).toFixed(2) + 'M');
