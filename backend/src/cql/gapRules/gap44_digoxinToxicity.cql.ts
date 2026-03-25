/**
 * CQL Rule: Gap 44 -- Digoxin Toxicity Risk
 * Module: Heart Failure / Electrophysiology
 *
 * Detection Logic:
 * Digoxin >0.125mg + age >=75 + eGFR <50
 * OR digoxin any dose + eGFR <30
 * OR digoxin level >2.0 ng/mL
 *
 * Evidence: DIG trial post-hoc analysis -- serum digoxin >1.0 ng/mL associated
 * with increased mortality. Target level 0.5-0.9 ng/mL per guidelines.
 */

export const GAP_44_DIGOXIN_TOXICITY_CQL = `
library DigoxinToxicityRisk version '1.0'
using FHIR version '4.0.1'

// Value Sets
valueset "Digoxin Medications": 'urn:oid:tailrd.vs.digoxin'

// Code systems
codesystem "LOINC": 'http://loinc.org'

// Individual codes
code "Digoxin Level": '10535-3' from "LOINC"
code "eGFR": '33914-3' from "LOINC"
code "Creatinine": '2160-0' from "LOINC"
code "Potassium": '6298-4' from "LOINC"

// Context
context Patient

// Definitions
define "Age":
  AgeInYears()

define "Active Digoxin Orders":
  [MedicationRequest: "Digoxin Medications"] M
    where M.status = 'active'

define "On Digoxin":
  exists("Active Digoxin Orders")

define "Digoxin Dose":
  "Active Digoxin Orders" D
    return D.dosageInstruction[0].doseAndRate[0].doseQuantity

define "High Dose Digoxin":
  exists("Active Digoxin Orders" D
    where D.dosageInstruction[0].doseAndRate[0].doseQuantity.value > 0.125
    and D.dosageInstruction[0].doseAndRate[0].doseQuantity.unit = 'mg')

define "Latest eGFR":
  Last([Observation: "eGFR"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "eGFR Value":
  "Latest eGFR".value as Quantity

define "Latest Digoxin Level":
  Last([Observation: "Digoxin Level"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "Digoxin Level Value":
  "Latest Digoxin Level".value as Quantity

define "Latest Potassium":
  Last([Observation: "Potassium"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "Potassium Value":
  "Latest Potassium".value as Quantity

define "Supratherapeutic Digoxin Level":
  "Digoxin Level Value" > 2.0 'ng/mL'

define "Elevated Digoxin Level":
  "Digoxin Level Value" > 1.0 'ng/mL'

define "No Recent Digoxin Level":
  "Latest Digoxin Level" is null
  or "Latest Digoxin Level".effective before (Today() - 6 months)

define "Severe Renal Impairment":
  "eGFR Value" < 30 'mL/min/1.73m2'

define "Moderate Renal Impairment":
  "eGFR Value" < 50 'mL/min/1.73m2'

define "Hypokalemia":
  "Potassium Value" < 3.5 'mmol/L'

// Risk scenarios
define "Elderly High Dose Renal Risk":
  "High Dose Digoxin" and "Age" >= 75 and "Moderate Renal Impairment"

define "Severe Renal Risk":
  "On Digoxin" and "Severe Renal Impairment"

define "Toxic Level":
  "On Digoxin" and "Supratherapeutic Digoxin Level"

define "Hypokalemia Risk":
  "On Digoxin" and "Hypokalemia"

// Gap fires when:
define "Gap Active":
  "Elderly High Dose Renal Risk"
  or "Severe Renal Risk"
  or "Toxic Level"
  or "Hypokalemia Risk"
  or ("On Digoxin" and "No Recent Digoxin Level")

define "Risk Tier":
  if "Toxic Level" then 'CRITICAL'
  else if "Severe Renal Risk" then 'CRITICAL'
  else if "Hypokalemia Risk" and "Elevated Digoxin Level" then 'CRITICAL'
  else if "Elderly High Dose Renal Risk" then 'HIGH'
  else if "No Recent Digoxin Level" then 'MODERATE'
  else 'MODERATE'

define "Recommended Action":
  if "Toxic Level" then 'URGENT: Digoxin level >2.0 - hold digoxin, check potassium, consider digoxin-specific antibody'
  else if "Severe Renal Risk" then 'Reduce or discontinue digoxin (eGFR <30), check level, monitor potassium'
  else if "Elderly High Dose Renal Risk" then 'Reduce digoxin to 0.125mg or lower, check level, target 0.5-0.9 ng/mL'
  else if "Hypokalemia Risk" then 'Correct hypokalemia - increases digoxin toxicity risk. Check digoxin level.'
  else 'Order digoxin level and basic metabolic panel'
`;

export const GAP_44_METADATA = {
  id: 'gap-44-digoxin-toxicity',
  libraryName: 'DigoxinToxicityRisk',
  version: '1.0',
  module: 'HF' as const,
  priority: 'critical' as const,
  description: 'Digoxin Toxicity Risk -- Detect dangerous dosing in elderly and renal-impaired patients',
  dataRequirements: ['MedicationRequest', 'Observation'],
  conditions: ['T46.0X1A', 'T46.0X5A', 'I50.x'],
};
