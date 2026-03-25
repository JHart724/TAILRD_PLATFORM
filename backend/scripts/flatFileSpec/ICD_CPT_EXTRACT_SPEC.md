# TAILRD Platform -- Direct EHR Extract Specification

## Overview
For health systems extracting directly from their EHR rather than claims,
this specification defines the minimum data required for TAILRD gap detection.

## File Format
- CSV or pipe-delimited (|)
- UTF-8 encoding
- Header row required
- Date format: YYYY-MM-DD
- One row per patient-encounter or patient-observation

## Required Data Files

### File 1: Patient Demographics
**Filename**: `patients.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Unique patient identifier (MRN) |
| first_name | string | Yes | Patient first name |
| last_name | string | Yes | Patient last name |
| birth_date | date | Yes | YYYY-MM-DD |
| gender | string | Yes | M/F/O |
| race | string | No | White/Black/Hispanic/Asian/Other |
| ethnicity | string | No | Hispanic/Non-Hispanic |
| zip_code | string | No | 5-digit ZIP |
| primary_care_npi | string | No | PCP NPI number |
| insurance_type | string | No | Medicare/Medicaid/Commercial/Self-Pay |

### File 2: Diagnoses
**Filename**: `diagnoses.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| icd10_code | string | Yes | ICD-10-CM code (with dot) |
| description | string | No | Code description |
| diagnosis_date | date | Yes | YYYY-MM-DD |
| diagnosis_type | string | Yes | PRIMARY/SECONDARY/ADMITTING |
| encounter_id | string | No | Links to encounters.csv |
| status | string | Yes | ACTIVE/RESOLVED/INACTIVE |
| provider_npi | string | No | Diagnosing provider |

### File 3: Medications
**Filename**: `medications.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| rxnorm_code | string | Yes | RxNorm RXCUI |
| medication_name | string | Yes | Drug name |
| dose | string | No | e.g. "25 mg" |
| frequency | string | No | e.g. "BID", "daily" |
| start_date | date | Yes | YYYY-MM-DD |
| end_date | date | No | YYYY-MM-DD (null if active) |
| status | string | Yes | ACTIVE/COMPLETED/DISCONTINUED |
| prescriber_npi | string | No | Prescribing provider |

### File 4: Lab Results
**Filename**: `labs.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| loinc_code | string | Yes | LOINC code |
| result_name | string | Yes | Test name |
| result_value | numeric | Yes | Numeric result |
| result_unit | string | Yes | Unit of measure |
| reference_low | numeric | No | Normal range low |
| reference_high | numeric | No | Normal range high |
| result_date | date | Yes | YYYY-MM-DD |
| abnormal_flag | string | No | N/L/H/LL/HH/A |

### File 5: Procedures
**Filename**: `procedures.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| cpt_code | string | Yes | CPT/HCPCS code |
| procedure_name | string | Yes | Procedure description |
| procedure_date | date | Yes | YYYY-MM-DD |
| provider_npi | string | No | Performing provider |
| facility_id | string | No | Facility identifier |
| encounter_id | string | No | Links to encounters.csv |

### File 6: Encounters
**Filename**: `encounters.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| encounter_id | string | Yes | Unique encounter ID |
| patient_id | string | Yes | Links to patients.csv |
| encounter_type | string | Yes | INPATIENT/OUTPATIENT/ED/OBSERVATION |
| admit_date | date | Yes | YYYY-MM-DD |
| discharge_date | date | No | YYYY-MM-DD (null if still admitted) |
| discharge_disposition | string | No | HOME/SNF/LTACH/DECEASED |
| attending_npi | string | No | Attending provider |
| primary_diagnosis | string | No | ICD-10 code |
| drg_code | string | No | MS-DRG (inpatient only) |

### File 7: Echo Data (Cardiovascular-specific)
**Filename**: `echo_data.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| echo_date | date | Yes | YYYY-MM-DD |
| lvef | numeric | Yes | Left ventricular EF (%) |
| lv_edd | numeric | No | LV end-diastolic dimension (mm) |
| lv_esd | numeric | No | LV end-systolic dimension (mm) |
| lv_wall_thickness | numeric | No | Max wall thickness (mm) |
| la_volume_index | numeric | No | LA volume index (mL/m2) |
| e_e_prime | numeric | No | E/e' ratio |
| av_mean_gradient | numeric | No | Aortic valve mean gradient (mmHg) |
| av_area | numeric | No | Aortic valve area (cm2) |
| av_vmax | numeric | No | Aortic valve Vmax (m/s) |
| mr_grade | string | No | NONE/MILD/MODERATE/SEVERE |
| tr_grade | string | No | NONE/MILD/MODERATE/SEVERE |
| rv_function | string | No | NORMAL/MILDLY_REDUCED/MODERATELY_REDUCED/SEVERELY_REDUCED |
| gls | numeric | No | Global longitudinal strain (%) |

### File 8: Device Data
**Filename**: `devices.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| patient_id | string | Yes | Links to patients.csv |
| device_type | string | Yes | ICD/CRT-D/CRT-P/PACEMAKER/LVAD/CARDIOMEMS |
| implant_date | date | Yes | YYYY-MM-DD |
| manufacturer | string | No | Device manufacturer |
| model | string | No | Device model |
| battery_status | string | No | BOL/MOL/ERI/EOL |
| last_interrogation_date | date | No | YYYY-MM-DD |

## Sample Records

### patients.csv
```csv
patient_id,first_name,last_name,birth_date,gender,race,ethnicity,zip_code,primary_care_npi,insurance_type
MRN-HF-001,Harold,Simmons,1950-03-15,M,Black,Non-Hispanic,10029,1234567890,Medicare
MRN-HF-002,Ruth,Caldwell,1948-07-20,F,White,Non-Hispanic,10128,1234567891,Medicare
MRN-EP-001,John,Smith,1959-11-05,M,Hispanic,Hispanic,10035,1234567892,Commercial
```

### diagnoses.csv
```csv
patient_id,icd10_code,description,diagnosis_date,diagnosis_type,status
MRN-HF-001,I50.22,Chronic systolic heart failure,2023-01-15,PRIMARY,ACTIVE
MRN-HF-001,N18.3,CKD stage 3,2022-08-01,SECONDARY,ACTIVE
MRN-HF-001,E11.65,Type 2 DM with hyperglycemia,2020-03-10,SECONDARY,ACTIVE
MRN-EP-001,I48.0,Paroxysmal atrial fibrillation,2023-06-01,PRIMARY,ACTIVE
```

## Minimum Viable Extract
For a basic gap detection run, the absolute minimum required is:
1. patients.csv (demographics + MRN)
2. diagnoses.csv (ICD-10 codes)
3. medications.csv (current med list)
4. labs.csv (recent lab values)

Echo data and device data significantly improve detection accuracy
for structural and device-related gaps but are not strictly required.

## Data Refresh Frequency
- Recommended: Weekly extract
- Minimum viable: Monthly extract
- Ideal: Real-time via Redox/FHIR (eliminates flat file need)

## PHI Handling
All files contain PHI and must be:
- Encrypted in transit (SFTP or TLS)
- Encrypted at rest (AES-256)
- Retained per HIPAA minimum necessary standard
- Access logged for audit trail
- Deleted after processing (staging only)
