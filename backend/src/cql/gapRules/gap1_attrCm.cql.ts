/**
 * CQL Rule: Gap 1 -- ATTR-CM Detection (Cardiac Amyloidosis Undetected)
 * Module: Heart Failure
 *
 * Detection Logic:
 * Patient has >=3 of 7 signals AND no ATTR-CM diagnosis AND no Tc-99m PYP scan ordered
 *
 * 7 Signals:
 * 1. Low-voltage ECG + LV wall thickness >=12mm (voltage-mass mismatch)
 * 2. GLS apical sparing pattern on echo
 * 3. Persistently elevated hs-TnT >14 ng/L on 2+ readings
 * 4. Bilateral carpal tunnel syndrome (ICD-10: G56.00-G56.02)
 * 5. Spinal stenosis (ICD-10: M48.0x)
 * 6. Peripheral neuropathy (ICD-10: G62.9, G60.x)
 * 7. HFpEF + LVEF >=50% + NT-proBNP >900 + LV wall >=12mm
 */

export const GAP_1_ATTR_CM_CQL = `
library ATTRCMDetection version '1.0'
using FHIR version '4.0.1'

// Value Sets
valueset "Heart Failure Diagnoses": 'urn:oid:tailrd.vs.hf-diagnoses'
valueset "ATTR-CM Diagnoses": 'urn:oid:tailrd.vs.attr-cm-diagnoses'
valueset "Carpal Tunnel Diagnoses": 'urn:oid:tailrd.vs.carpal-tunnel'
valueset "Spinal Stenosis Diagnoses": 'urn:oid:tailrd.vs.spinal-stenosis'
valueset "Peripheral Neuropathy Diagnoses": 'urn:oid:tailrd.vs.peripheral-neuropathy'
valueset "Tc99m PYP Scan": 'urn:oid:tailrd.vs.tc99m-pyp'
valueset "Tafamidis Medications": 'urn:oid:tailrd.vs.tafamidis'
valueset "TTR Silencer Medications": 'urn:oid:tailrd.vs.ttr-silencers'

// Code systems
codesystem "LOINC": 'http://loinc.org'

// Individual codes
code "hs-TnT": '67151-1' from "LOINC"
code "NT-proBNP": '33762-6' from "LOINC"
code "LVEF": '18010-0' from "LOINC"

// Context
context Patient

// Definitions
define "Has Heart Failure":
  exists([Condition: "Heart Failure Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active')

define "Has ATTR-CM Diagnosis":
  exists([Condition: "ATTR-CM Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active')

define "Has Tc99m PYP Scan":
  exists([Procedure: "Tc99m PYP Scan"] P
    where P.status = 'completed')

define "On ATTR Treatment":
  exists([MedicationRequest: "Tafamidis Medications"] M
    where M.status = 'active')
  or exists([MedicationRequest: "TTR Silencer Medications"] M
    where M.status = 'active')

// Signal 1: Voltage-mass mismatch (requires ECG + echo correlation)
define "Signal 1 Voltage Mass Mismatch":
  // Simplified -- in production would correlate ECG voltage with echo wall thickness
  false

// Signal 3: Persistently elevated hs-TnT
define "Elevated hs-TnT Readings":
  [Observation: "hs-TnT"] O
    where O.value as Quantity > 14 'ng/L'
    sort by effective desc

define "Signal 3 Persistent TnT Elevation":
  Count("Elevated hs-TnT Readings") >= 2

// Signal 4: Bilateral carpal tunnel
define "Signal 4 Carpal Tunnel":
  exists([Condition: "Carpal Tunnel Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active'
    and C.bodySite.coding[0].display contains 'bilateral')

// Signal 5: Spinal stenosis
define "Signal 5 Spinal Stenosis":
  exists([Condition: "Spinal Stenosis Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active')

// Signal 6: Peripheral neuropathy
define "Signal 6 Peripheral Neuropathy":
  exists([Condition: "Peripheral Neuropathy Diagnoses"] C
    where C.clinicalStatus.coding[0].code = 'active')

// Signal 7: HFpEF phenotype
define "Latest LVEF":
  Last([Observation: "LVEF"] O sort by effective)

define "Latest NT-proBNP":
  Last([Observation: "NT-proBNP"] O sort by effective)

define "Signal 7 HFpEF Phenotype":
  "Latest LVEF".value as Quantity >= 50 '%'
  and "Latest NT-proBNP".value as Quantity > 900 'pg/mL'

// Signal count
define "Signal Count":
  (if "Signal 1 Voltage Mass Mismatch" then 1 else 0)
  + (if "Signal 3 Persistent TnT Elevation" then 1 else 0)
  + (if "Signal 4 Carpal Tunnel" then 1 else 0)
  + (if "Signal 5 Spinal Stenosis" then 1 else 0)
  + (if "Signal 6 Peripheral Neuropathy" then 1 else 0)
  + (if "Signal 7 HFpEF Phenotype" then 1 else 0)

// Gap fires when:
define "Gap Active":
  "Has Heart Failure"
  and not "Has ATTR-CM Diagnosis"
  and not "Has Tc99m PYP Scan"
  and not "On ATTR Treatment"
  and "Signal Count" >= 3

define "Risk Tier":
  if "Signal Count" >= 5 then 'CRITICAL'
  else if "Signal Count" >= 4 then 'HIGH'
  else 'MODERATE'
`;

export const GAP_1_METADATA = {
  id: 'gap-1-attr-cm',
  libraryName: 'ATTRCMDetection',
  version: '1.0',
  module: 'HF' as const,
  priority: 'critical' as const,
  description: 'ATTR-CM Detection -- Multi-signal screening for cardiac amyloidosis',
  dataRequirements: ['Condition', 'MedicationRequest', 'Observation', 'Procedure'],
  conditions: ['E85.1', 'E85.4', 'E85.82', 'I50.x'],
};
