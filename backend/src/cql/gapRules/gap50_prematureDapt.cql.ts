/**
 * CQL Rule: Gap 50 -- Premature DAPT Discontinuation
 * Module: Coronary Intervention
 *
 * Detection Logic:
 * DES implant + DAPT discontinued <12 months (or <3 months = CRITICAL)
 *
 * DAPT = dual antiplatelet therapy (aspirin + P2Y12 inhibitor)
 * P2Y12 inhibitors: clopidogrel, prasugrel, ticagrelor
 *
 * Evidence: ACC/AHA 2016 DAPT Guidelines, DAPT Study
 * Minimum 6 months for DES, 12 months preferred if no high bleeding risk
 * <3 months = very high stent thrombosis risk
 */

export const GAP_50_PREMATURE_DAPT_CQL = `
library PrematureDAPTDiscontinuation version '1.0'
using FHIR version '4.0.1'

// Value Sets
valueset "DES Implant Procedures": 'urn:oid:tailrd.vs.des-implant'
valueset "BMS Implant Procedures": 'urn:oid:tailrd.vs.bms-implant'
valueset "Aspirin Medications": 'urn:oid:tailrd.vs.aspirin'
valueset "P2Y12 Inhibitor Medications": 'urn:oid:tailrd.vs.p2y12-inhibitors'
valueset "Anticoagulant Medications": 'urn:oid:tailrd.vs.anticoagulants'
valueset "High Bleeding Risk Conditions": 'urn:oid:tailrd.vs.high-bleeding-risk'

// Context
context Patient

// Definitions
define "DES Implant Procedures":
  [Procedure: "DES Implant Procedures"] P
    where P.status = 'completed'
    sort by performed desc

define "Most Recent DES":
  First("DES Implant Procedures")

define "Has DES Within 12 Months":
  "Most Recent DES" is not null
  and "Most Recent DES".performed after (Today() - 12 months)

define "Has DES Within 3 Months":
  "Most Recent DES" is not null
  and "Most Recent DES".performed after (Today() - 3 months)

define "Months Since DES":
  if "Most Recent DES" is not null
  then duration in months between "Most Recent DES".performed and Today()
  else null

define "On Aspirin":
  exists([MedicationRequest: "Aspirin Medications"] M
    where M.status = 'active')

define "On P2Y12 Inhibitor":
  exists([MedicationRequest: "P2Y12 Inhibitor Medications"] M
    where M.status = 'active')

define "On Full DAPT":
  "On Aspirin" and "On P2Y12 Inhibitor"

define "DAPT Incomplete":
  not "On Aspirin" or not "On P2Y12 Inhibitor"

define "On Anticoagulant":
  exists([MedicationRequest: "Anticoagulant Medications"] M
    where M.status = 'active')

define "Has High Bleeding Risk":
  exists([Condition: "High Bleeding Risk Conditions"] C
    where C.clinicalStatus.coding[0].code = 'active')

define "On Triple Therapy":
  "On Aspirin" and "On P2Y12 Inhibitor" and "On Anticoagulant"

// Gap fires when:
define "Gap Active":
  "Has DES Within 12 Months"
  and "DAPT Incomplete"
  and not "Has High Bleeding Risk"

define "Risk Tier":
  if "Has DES Within 3 Months" and "DAPT Incomplete" then 'CRITICAL'
  else if "Months Since DES" < 6 and "DAPT Incomplete" then 'HIGH'
  else if "Months Since DES" < 12 and "DAPT Incomplete" then 'MODERATE'
  else 'LOW'

define "Recommended Action":
  if "Has DES Within 3 Months" and not "On P2Y12 Inhibitor"
    then 'URGENT: P2Y12 inhibitor stopped <3 months post-DES. Extremely high stent thrombosis risk. Resume immediately.'
  else if "Has DES Within 3 Months" and not "On Aspirin"
    then 'URGENT: Aspirin stopped <3 months post-DES. Resume aspirin immediately.'
  else if "Months Since DES" < 6
    then 'HIGH RISK: DAPT incomplete <6 months post-DES. Contact interventional cardiologist.'
  else 'DAPT incomplete <12 months post-DES. Verify with treating cardiologist if early discontinuation intended.'
`;

export const GAP_50_METADATA = {
  id: 'gap-50-premature-dapt',
  libraryName: 'PrematureDAPTDiscontinuation',
  version: '1.0',
  module: 'Coronary' as const,
  priority: 'critical' as const,
  description: 'Premature DAPT Discontinuation -- Detect early stop of dual antiplatelet therapy post-DES',
  dataRequirements: ['Procedure', 'MedicationRequest', 'Condition'],
  conditions: ['I25.10', 'I25.110', 'I25.700', 'Z95.5'],
};
