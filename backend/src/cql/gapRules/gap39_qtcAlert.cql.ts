/**
 * CQL Rule: Gap 39 -- QTc Safety Alert
 * Module: Electrophysiology (Cross-module)
 *
 * Detection Logic:
 * Patient on 2+ QT-prolonging medications AND (QTc >470ms OR no ECG in 6 months)
 *
 * QT-prolonging drug classes: antiarrhythmics (amiodarone, sotalol, dofetilide),
 * antibiotics (azithromycin, fluoroquinolones), antipsychotics, antiemetics (ondansetron),
 * antidepressants (citalopram, escitalopram)
 */

export const GAP_39_QTC_ALERT_CQL = `
library QTcSafetyAlert version '1.0'
using FHIR version '4.0.1'

// Value Sets
valueset "QT Prolonging Medications": 'urn:oid:tailrd.vs.qt-prolonging-meds'
valueset "Class III Antiarrhythmics": 'urn:oid:tailrd.vs.class-iii-antiarrhythmics'
valueset "ECG Procedures": 'urn:oid:tailrd.vs.ecg-procedures'

// Code systems
codesystem "LOINC": 'http://loinc.org'

// Individual codes
code "QTc Interval": '8636-3' from "LOINC"

// Context
context Patient

// Definitions
define "Active QT Prolonging Meds":
  [MedicationRequest: "QT Prolonging Medications"] M
    where M.status = 'active'

define "QT Prolonging Med Count":
  Count("Active QT Prolonging Meds")

define "On Multiple QT Prolonging Meds":
  "QT Prolonging Med Count" >= 2

define "On Class III Antiarrhythmic":
  exists([MedicationRequest: "Class III Antiarrhythmics"] M
    where M.status = 'active')

define "Latest QTc":
  Last([Observation: "QTc Interval"] O
    where O.status in { 'final', 'amended' }
    sort by effective)

define "QTc Value":
  "Latest QTc".value as Quantity

define "QTc Prolonged":
  "QTc Value" > 470 'ms'

define "QTc Critically Prolonged":
  "QTc Value" > 500 'ms'

define "No Recent ECG":
  "Latest QTc" is null
  or "Latest QTc".effective before (Today() - 6 months)

define "Recent ECG Procedure":
  exists([Procedure: "ECG Procedures"] P
    where P.status = 'completed'
    and P.performed after (Today() - 6 months))

define "ECG Monitoring Overdue":
  "No Recent ECG" and not "Recent ECG Procedure"

// Gap fires when:
define "Gap Active":
  ("On Multiple QT Prolonging Meds" or "On Class III Antiarrhythmic")
  and ("QTc Prolonged" or "ECG Monitoring Overdue")

define "Risk Tier":
  if "QTc Critically Prolonged" then 'CRITICAL'
  else if "QTc Prolonged" and "On Multiple QT Prolonging Meds" then 'HIGH'
  else if "ECG Monitoring Overdue" and "On Class III Antiarrhythmic" then 'HIGH'
  else 'MODERATE'

define "Recommended Action":
  if "QTc Critically Prolonged" then 'URGENT: QTc >500ms - review and discontinue offending agents immediately'
  else if "QTc Prolonged" then 'Review QT-prolonging medications and consider alternatives'
  else 'Order 12-lead ECG for QTc monitoring'
`;

export const GAP_39_METADATA = {
  id: 'gap-39-qtc-safety',
  libraryName: 'QTcSafetyAlert',
  version: '1.0',
  module: 'EP' as const,
  priority: 'critical' as const,
  description: 'QTc Safety Alert -- Detect dangerous QT prolongation risk from drug combinations',
  dataRequirements: ['MedicationRequest', 'Observation', 'Procedure'],
  conditions: ['I49.9', 'R94.31', 'I47.2'],
};
