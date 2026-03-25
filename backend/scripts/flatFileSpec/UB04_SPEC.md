# TAILRD Platform -- UB04 (CMS-1450) Field Mapping

## Overview
The UB04 is the universal hospital claim form. TAILRD can ingest UB04 data
to populate gap detection when Redox/FHIR integration is not available.

## Required Fields

| UB04 Field | FL # | TAILRD Mapping | Gap Relevance |
|------------|------|----------------|---------------|
| Patient Control Number | FL 3a | Patient MRN | All gaps |
| Type of Bill | FL 4 | Encounter type | Admission/discharge gaps |
| Statement Covers Period | FL 6 | Encounter dates | Timeline engine |
| Patient Name | FL 8 | Patient demographics | All gaps |
| Patient Birth Date | FL 10 | Age calculation | Age-stratified gaps (DANISH, etc.) |
| Patient Sex | FL 11 | Gender | Sex-specific gaps |
| Admission Date | FL 12 | Encounter start | Time-sensitive gaps |
| Admission Hour | FL 13 | D2B calculation | STEMI gaps |
| Discharge Hour | FL 16 | D2B calculation | STEMI gaps |
| Discharge Status | FL 17 | Disposition | Follow-up gaps |
| Principal Diagnosis | FL 67 | ICD-10 primary dx | Gap inclusion criteria |
| Other Diagnoses | FL 67A-Q | ICD-10 secondary dx | Comorbidity detection |
| Principal Procedure | FL 74 | ICD-10-PCS/CPT | Procedure verification |
| Other Procedures | FL 74A-E | Additional procedures | Multi-procedure detection |
| Attending Physician | FL 76 | NPI | Provider analytics |
| Revenue Codes | FL 42 | Service categorization | Revenue classification |
| HCPCS/Rates | FL 44 | CPT/HCPCS codes | Procedure identification |
| Total Charges | FL 47 | Revenue calculation | Dollar opportunity |

## Gap Detection Mapping

### Heart Failure Gaps
- **Gap 1 (ATTR-CM)**: FL 67 (I50.x present, E85.x absent), FL 74 (78816 absent = no PYP scan)
- **Gap 2 (Iron Deficiency)**: FL 67 (I50.x), requires separate lab data
- **Gap 6 (Finerenone)**: FL 67 (I50.x + N18.x CKD), requires med list
- **Gap 13 (CardioMEMS)**: FL 67 (I50.x), FL 17 (discharge status), FL 12/6 (readmission within 12mo)

### CAD Gaps
- **Gap 46 (Heart Team)**: FL 67 (I25.x multivessel), FL 74 (33510-33536 CABG or 92928 PCI)
- **Gap 47 (Complete Revasc)**: FL 67 (I21.x STEMI), FL 74 (92928 PCI), FL 74A (no staged procedure)
- **Gap 50 (Premature DAPT)**: FL 67 (I21.x), FL 74 (92928 DES), FL 6 dates for duration calc

### EP Gaps
- **Gap 4 (LAAC)**: FL 67 (I48.x AF), FL 74 (33340 absent = no LAAC)
- **Gap 65 (Cryptogenic Stroke ILR)**: FL 67 (I63.x stroke, no AF), FL 74 (33285 absent = no ILR)

## Sample Data Format

```csv
FL3a,FL4,FL6_from,FL6_to,FL8_last,FL8_first,FL10,FL11,FL12,FL17,FL67,FL67A,FL67B,FL74,FL76,FL44
MRN001,111,20240101,20240105,Smith,John,19480315,M,20240101,01,I50.22,E11.65,N18.3,,1234567890,
MRN002,111,20240115,20240118,Johnson,Mary,19550720,F,20240115,01,I21.01,I25.10,,92928,1234567891,
```

## Limitations
- UB04 does not contain lab values -- supplement with lab extract
- UB04 does not contain medication lists -- supplement with pharmacy extract
- UB04 is claims-based, not real-time -- latency of 30-90 days typical
- One UB04 per encounter -- longitudinal view requires multiple claims
