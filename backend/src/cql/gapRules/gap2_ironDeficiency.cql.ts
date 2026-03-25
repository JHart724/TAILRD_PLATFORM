/**
 * CQL Rule: Gap 2 -- Iron Deficiency in Heart Failure
 * Module: Heart Failure
 *
 * Detection Logic:
 * Patient has HF + (ferritin <100 OR (ferritin 100-300 AND TSAT <20%)) + no IV iron ordered/administered
 *
 * Evidence: 2022 AHA/ACC/HFSA Guidelines (Class 2a recommendation)
 * AFFIRM-AHF, IRONMAN trials demonstrated improved outcomes with IV iron
 */

export const GAP_2_IRON_DEFICIENCY_CQL = `
library IronDeficiencyHF version '1.0'
using FHIR version '4.0.1'

// Value Sets
valueset "Heart Failure Diagnoses": 'urn:oid:tailrd.vs.hf-diagnoses'
valueset "IV Iron Medications": 'urn:oid:tailrd.vs.iv-iron'

// Code systems
codesystem "LOINC": 'http://loinc.org'
codesystem "RxNorm": 'http://www.nlm.nih.gov/research/umls/rxnorm'

// Individual codes
code "Ferritin": '2276-4' from "LOINC"
code "TSAT": '2502-3' from "LOINC"
code "Hemoglobin": '718-7' from "LOINC"
code "LVEF": '18010-0' from "LOINC"

// Context
context Patient

// Definitions
define "Has Heart Failure":
  exists([Condition: "Heart Failure Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active')

define "Latest Ferritin":
  Last([Observation: "Ferritin"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "Latest TSAT":
  Last([Observation: "TSAT"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "Ferritin Value":
  "Latest Ferritin".value as Quantity

define "TSAT Value":
  "Latest TSAT".value as Quantity

define "Absolute Iron Deficiency":
  "Ferritin Value" < 100 'ng/mL'

define "Functional Iron Deficiency":
  "Ferritin Value" >= 100 'ng/mL'
  and "Ferritin Value" <= 300 'ng/mL'
  and "TSAT Value" < 20 '%'

define "Has Iron Deficiency":
  "Absolute Iron Deficiency" or "Functional Iron Deficiency"

define "On IV Iron":
  exists([MedicationRequest: "IV Iron Medications"] M
    where M.status = 'active'
    and M.authoredOn after (Today() - 6 months))

define "No Recent Iron Studies":
  "Latest Ferritin" is null
  or "Latest Ferritin".effective before (Today() - 12 months)

// Gap fires when:
define "Gap Active":
  "Has Heart Failure"
  and ("Has Iron Deficiency" or "No Recent Iron Studies")
  and not "On IV Iron"

define "Risk Tier":
  if "Absolute Iron Deficiency" then 'HIGH'
  else if "No Recent Iron Studies" then 'MODERATE'
  else 'MODERATE'

define "Recommended Action":
  if "No Recent Iron Studies" then 'Order ferritin and TSAT levels'
  else if "Absolute Iron Deficiency" then 'Consider IV iron (ferric carboxymaltose or iron sucrose)'
  else 'Consider IV iron for functional iron deficiency'
`;

export const GAP_2_METADATA = {
  id: 'gap-2-iron-deficiency-hf',
  libraryName: 'IronDeficiencyHF',
  version: '1.0',
  module: 'HF' as const,
  priority: 'high' as const,
  description: 'Iron Deficiency in HF -- Screen and treat iron deficiency per AHA/ACC guidelines',
  dataRequirements: ['Condition', 'MedicationRequest', 'Observation'],
  conditions: ['I50.20', 'I50.22', 'I50.30', 'I50.32', 'I50.40', 'I50.42'],
};
