# TAILRD Comprehensive Clinical Knowledge Base v4.0

**Status:** Internal canonical clinical spec for the TAILRD platform
**Version:** 4.0 (March 2026)
**Maintained by:** jhart (Founder/CEO), Tony Das MD (CMO)
**Purpose:** Authoritative source for gap detection logic, tier prioritization, calculator specifications, and clinical citations across all 7 cardiovascular modules

---

## Scope

708 structured clinical decision gaps across 7 modules:
- Heart Failure & Cardiomyopathy (HF): 126 gaps
- Electrophysiology (EP): 89 gaps
- Structural Heart (SH): 88 gaps
- Coronary Artery Disease (CAD): 90 gaps
- Valvular Heart Disease (Surgical) (VHD): 105 gaps
- Peripheral Vascular (PV): 105 gaps
- Cross-module / Disparities / Safety (CX): 105 gaps

**Tier distribution:** T1 (priority) 107 gaps · T2 (standard) 462 gaps · T3 (supporting) 139 gaps.

The detection logic across all 708 gaps draws from 126 unique structured data fields (catalogued separately in the data extraction spec).

---

## Priority Framework

Each gap is scored on 5 dimensions (1-5 each, total 5-25):

1. **Evidence strength** — class of recommendation and quality of supporting trials
2. **Mortality and hospitalisation impact** — magnitude of clinical benefit when the gap is closed
3. **Revenue opportunity** — device, procedural, specialty pharmacy, avoided admission
4. **Prevalence in the cardiology-eligible cohort** — patients per year the gap applies to
5. **Panel actionability** — can the accountable clinician close the gap at the next visit without further workup

**Tier assignment by total score:**
- 20-25 → Tier 1 (priority)
- 13-19 → Tier 2 (standard)
- below 13 → Tier 3 (supporting)

---

## Top 25 Priority Gaps with ROI Pathway Tagging

The 25 gaps below are the highest-leverage individual gaps across the catalog. Each is tagged with its dominant ROI pathway (and secondary pathway where applicable). These 25 gaps are where the executive conversation anchors. The full 708-gap catalog is in Part 6 as reference.
| Rank | Gap ID | Gap Name | ROI Pathway | Rationale |
|---|---|---|---|---|
| 1 | GAP-HF-010 | HFrEF: SGLT2i not prescribed | Specialty pharma + Readmission | HFrEF SGLT2i. Highest-volume HFrEF gap. Mortality and HF hospitalisation signal from DAPA-HF and EMPEROR-Reduced. Specialty pharma revenue driver. Very high panel actionability. |
| 2 | GAP-HF-001 | HFrEF: Beta-blocker not prescribed | Readmission (GDMT pillar) | HFrEF evidence-based beta-blocker not prescribed. Mortality signal from MERIT-HF, CIBIS-II, COPERNICUS. Low-cost intervention. Foundational GDMT pillar. |
| 3 | GAP-HF-007 | HFrEF: MRA not prescribed | Readmission (GDMT pillar) | HFrEF MRA not prescribed. Mortality from RALES and EMPHASIS-HF. Generic cost. Often missed when K+ and eGFR are borderline. |
| 4 | GAP-HF-004 | HFrEF: RAASi not prescribed | Readmission (GDMT pillar) | HFrEF RAASi (ARNI/ACEi/ARB) not prescribed. Mortality from SOLVD, CHARM, PARADIGM-HF. ARNI-specific switch is separate gap (HF-005). |
| 5 | GAP-HF-016 | HFpEF/HFmrEF: SGLT2i not prescribed | Specialty pharma + Readmission | HFpEF SGLT2i. EMPEROR-Preserved and DELIVER evidence. HFpEF is the larger-prevalence HF cohort at most health systems. Specialty pharma revenue. |
| 6 | GAP-HF-017 | HFpEF/HFmrEF: Finerenone not prescribed | Specialty pharma + Readmission | HFpEF finerenone. FINEARTS-HF evidence. Specialty pharma revenue at scale; underutilised since 2024 guideline. |
| 7 | GAP-HF-021 | CRT Class I candidate not implanted | Device DRG (CRT-D) | CRT Class I candidate not implanted. Device procedural revenue (DRG 226-227). Mortality and HF hospitalisation reduction. |
| 8 | GAP-HF-024 | ICD primary prevention - ischemic | Device DRG (ICD) | ICD primary prevention in ischaemic cardiomyopathy. Device procedural revenue. SCD-HeFT mortality benefit. Commonly missed three months post-MI. |
| 9 | GAP-HF-051 | ATTR-CM screening: unexplained LVH + red flags | Specialty pharma (ATTR) | ATTR-CM screening when red flags present. Underdiagnosis rate estimated 50-80 percent. Drives high-cost specialty pharma (tafamidis, vutrisiran) plus retains patient in the health system pharmacy network. |
| 10 | GAP-HF-028 | Advanced HF therapy evaluation (LVAD/transplant) | Procedural DRG (LVAD/tx referral) | Advanced HF therapy evaluation (LVAD or transplant referral). Highest-revenue downstream referral. Also mortality-decisive when missed. |
| 11 | GAP-HF-033 | Absolute iron deficiency untreated | Readmission (IV iron) | Absolute iron deficiency in HF untreated. IV iron administration procedure (CPT 96365 plus J-code). Symptom burden plus HF hospitalisation reduction. |
| 12 | GAP-EP-001 | AF: Anticoagulation gap (CHA2DS2-VASc qualifying) | Readmission (stroke avoidance) | AF anticoagulation gap at qualifying CHA2DS2-VASc. Highest-prevalence EP gap. Stroke prevention translates to downstream avoided admissions. |
| 13 | GAP-EP-011 | LAAC: bleeding contraindication to OAC | Procedural DRG (LAAC) | LAAC candidate with bleeding contraindication to OAC. Procedural revenue (CPT 33340). Prevents both thromboembolism and recurrent bleeding. |
| 14 | GAP-EP-014 | AF ablation in HFrEF (CASTLE-AF) | Procedural DRG (AF ablation) | AF ablation in HFrEF (CASTLE-AF). EP procedural revenue. Mortality and HF hospitalisation reduction in AF plus LVEF 35 or lower. |
| 15 | GAP-SH-001 | Severe AS asymptomatic: heart team review (EARLY TAVR) | Procedural DRG (TAVR) | Severe AS asymptomatic (EARLY TAVR 2024). TAVR procedural revenue (DRG 266-267). Mortality and hospitalisation benefit vs clinical surveillance. |
| 16 | GAP-SH-002 | Severe AS symptomatic: AVR not referred | Procedural DRG (TAVR/SAVR) | Severe symptomatic AS not referred for AVR. Procedural revenue. Untreated severe symptomatic AS mortality is 50 percent at 2 years. |
| 17 | GAP-SH-018 | COAPT-eligible FMR not referred for TEER | Procedural DRG (TEER) | COAPT-eligible functional MR not referred for TEER. MitraClip procedural revenue. Mortality and HF hospitalisation reduction (COAPT NEJM 2018). |
| 18 | GAP-SH-022 | Severe TR: transcatheter evaluation gap | Procedural DRG (T-TEER/TTVR) | Severe TR transcatheter evaluation gap. Emerging T-TEER / TTVR procedural revenue (TRILUMINATE and CLASP TR pathways). Underreferred population. |
| 19 | GAP-CAD-001 | ASCVD: Statin not prescribed | Readmission + Quality metric (HEDIS SPC) | ASCVD statin not prescribed. Most common lipid gap in secondary prevention. Generic cost. High prevalence at any health system. |
| 20 | GAP-CAD-003 | LDL not at goal <70: add ezetimibe | Readmission (lipid secondary prevention) | LDL not at goal - ezetimibe add-on. IMPROVE-IT evidence. Cheap and underused escalation step before PCSK9i. |
| 21 | GAP-CAD-004 | LDL still not at goal: PCSK9i/inclisiran | Specialty pharma (PCSK9i/inclisiran) | LDL still above goal on statin plus ezetimibe - PCSK9i or inclisiran. Specialty pharma revenue. Underused because of prior-auth friction that TAILRD can pre-stage. |
| 22 | GAP-CAD-042 | DanGer Shock pattern - Impella in AMI-CS | Procedural DRG (MCS) | Impella in AMI-CS at primary presentation (DanGer Shock). Mortality benefit. DRG 216-221 procedural revenue uplift over IABP-only management. |
| 23 | GAP-CAD-043 | MCS escalation from IABP in ongoing shock | Procedural DRG (MCS) | MCS escalation from IABP to Impella or ECMO in ongoing cardiogenic shock. Mortality benefit. Procedural revenue delta. |
| 24 | GAP-PV-011 | PAD: rivaroxaban 2.5 BID + ASA (COMPASS/VOYAGER) | Specialty pharma (COMPASS) | PAD COMPASS regimen (rivaroxaban 2.5 mg BID plus ASA). Specialty pharma revenue. Cardiovascular death, MI, stroke, and limb events all reduced. |
| 25 | GAP-CX-061 | CKM: SGLT2i use across eligible domains | Specialty pharma (cardiorenal SGLT2i) | Cardiorenal-metabolic SGLT2i (DAPA-CKD, EMPA-KIDNEY). Cross-specialty gap originating primarily outside cardiology. Specialty pharma plus avoided CKD progression. |

1.4 What the Crawl-Stage Opportunity Report Sharpens
The benchmark ranges above anchor the scoping conversation. The opportunity report itself sharpens each range in four ways specific to the health system.
the health system cohort composition. Actual prevalence of severe AS, HFrEF, HFpEF, AF, ATTR-CM suspects, and the other driver phenotypes in the the health system population rather than benchmark prevalence.
the health system payer mix. DRG reimbursement varies by payer mix. The opportunity report uses the health system's actual payer distribution from UB-04 to produce a reimbursement-weighted figure rather than a CMS-weight-only figure.
the health system current treatment pattern. The report compares what the health system is already capturing (the historical treatment rate for each gap) against what the gap represents. The delta is the actionable opportunity.
the health system attribution. The report ties gap counts to named primary care panels and named specialist panels where attribution is reliable, so that the service line knows where the intervention points are and who the accountable clinicians are.


---

## Part 4: Clinical Gap Catalog

This part catalogues the full 708-gap platform scope as reference material. The Top 25 leadership table already appears in Part 1.3. The catalog here supports clinical review by Tony Das and cardiology clinical leadership after the scoping meeting closes. Reading order: a brief priority framework and scoring rubric, a tier distribution table, then module catalogues (6.1 through 6.7) organised by clinical subcategory with gaps sorted Tier 1 first (shaded warm), Tier 2 standard, Tier 3 (shaded cool) last within each subcategory.
6.0 Priority Framework
Scoring Rubric
Each gap is scored on five dimensions (1 to 5 each, total 5 to 25):
Evidence strength: class of recommendation and quality of supporting trials.
Mortality and hospitalisation impact: magnitude of clinical benefit when the gap is closed.
Revenue opportunity  : device, procedural, specialty pharmacy, avoided admission.
Prevalence in the cardiology-eligible cohort: patients per year the gap applies to.
Panel actionability: can the accountable clinician close the gap at the next visit without further workup.
Total scores of 20 to 25 fall into Tier 1 (priority). Total scores of 13 to 19 fall into Tier 2 (standard). Total scores below 13 fall into Tier 3 (supporting).
Tier Distribution Across the Catalog
| Module | Total | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|
| Heart Failure & Cardiomyopathy | 126 | 29 | 62 | 35 |
| Electrophysiology | 89 | 15 | 62 | 12 |
| Structural Heart | 88 | 13 | 58 | 17 |
| Coronary Artery Disease | 90 | 18 | 55 | 17 |
| Valvular Heart Disease (Surgical) | 105 | 8 | 72 | 25 |
| Peripheral Vascular | 105 | 7 | 82 | 16 |
| Cross-module / Disparities / Safety | 105 | 17 | 71 | 17 |
| Total | 708 | 107 | 462 | 139 |
Module Catalogue Structure
Module Summary
| Module | Code | Total | T1 | T2 | T3 | Key Clinical Focus |
|---|---|---|---|---|---|---|
| Heart Failure & Cardiomyopathy | HF | 126 | 29 | 62 | 35 | GDMT four-pillar logic, HFpEF therapy, device therapy, iron deficiency, WHF escalation, cardiomyopathy phenotypes (ATTR, HCM, Fabry, sarcoid), LVAD and ECMO |
| Electrophysiology | EP | 89 | 15 | 62 | 12 | AF anticoagulation and stroke prevention, LAAC, rhythm control, CIED therapy, AAD safety, channelopathies, pre-excited AF safety, VT storm, cardiac arrest TTM |
| Structural Heart | SH | 88 | 13 | 58 | 17 | Aortic stenosis (EARLY TAVR), MR (COAPT/RESHAPE-HF2), tricuspid (TRILUMINATE/CLASP TR), aortic disease and dissection, PFO/ASD, pulmonary HTN, PE including CDT, endocarditis, ACHD |
| Coronary Artery Disease | CAD | 90 | 18 | 55 | 17 | Statin escalation and lipid targets (Lp(a), PCSK9i, inclisiran), DAPT, post-MI therapies, polyvascular, revascularisation decisions, AMI-CS MCS (DanGer Shock), MINOCA/INOCA, complex PCI |
| Valvular Heart Disease (Surgical) | VHD | 105 | 8 | 72 | 25 | Mechanical valve INR (On-X, pharmacogenomics), bioprosthetic surveillance (HALT, SVD), prosthesis selection, surgical AVR and MVR subcategories, IE subcategories including pathogens, PVT, rheumatic, carcinoid, drug-induced, radiation, pregnancy |
| Peripheral Vascular | PV | 105 | 7 | 82 | 16 | Claudication and CLTI (BEST-CLI), COMPASS regimen, ABI screening, AAA surveillance, carotid (CREST-2), mesenteric, vasculitis, venous and lymphatic, PE risk stratification, CTEPH, PAH by WHO group with sotatercept |
| Cross-module / Disparities / Safety | CX | 105 | 17 | 71 | 17 | Cardio-oncology (immunotherapy, CAR-T, TKIs, anti-angiogenics), pregnancy cardiology, pre-transplant cardiac eval, geriatric frailty, end-of-life and device deactivation, autoimmune, obesity and GLP-1 (SELECT, STEP-HFpEF, SUMMIT), SDOH, disparities |

6.1 Heart Failure & Cardiomyopathy (126 gaps)
HFrEF GDMT (15 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-001 | HFrEF: Beta-blocker not prescribed. HFrEF (LVEF<=40%) without evidence-based BB (carvedilol, metoprolol succinate, bisoprolol) | HF dx (I50.2x/I50.4x), LVEF, active med RxNorm | D2, D3, D8 | Non-PHI |
| T1 | GAP-HF-002 | HFrEF: Non-evidence-based beta-blocker. HFrEF on atenolol, metoprolol tartrate, or nebivolol | HF dx, BB identity by RxNorm | D2, D3 | Non-PHI |
| T1 | GAP-HF-003 | HFrEF: BB not at target dose. On evidence-based BB but below target with HR>=60 SBP>=100 | BB dose, HR, SBP | D2, D3, D6 | Non-PHI |
| T1 | GAP-HF-004 | HFrEF: RAASi not prescribed. HFrEF without sacubitril/valsartan, ACEi, or ARB | HF dx, active med list | D2, D3 | Non-PHI |
| T1 | GAP-HF-005 | HFrEF: ARNI switch opportunity. On ACEi/ARB not ARNI; SBP>=100, K+<5.0, eGFR>=20 | HF dx, med list, SBP, K+, eGFR | D2, D3, D5, D6 | Non-PHI |
| T1 | GAP-HF-007 | HFrEF: MRA not prescribed. HFrEF without MRA; K+<5.0, eGFR>=25 | HF dx, med list, K+, eGFR | D2, D3, D5 | Non-PHI |
| T1 | GAP-HF-010 | HFrEF: SGLT2i not prescribed. HFrEF without dapagliflozin or empagliflozin; eGFR>=20 | HF dx, med list, eGFR | D2, D3, D5 | Non-PHI |
| T1 | GAP-HF-014 | HFrEF: Vericiguat candidate. Worsening HFrEF (LVEF<45) with recent hospitalization on GDMT | HF dx, LVEF, HF hospitalization, GDMT | D2, D3, D8, D11, D19 | Non-PHI |
| T2 | GAP-HF-006 | HFrEF: ARNI not at target dose. Sacubitril/valsartan below 97/103 mg BID | HF dx, ARNI dose | D2, D3 | Non-PHI |
| T2 | GAP-HF-008 | HFrEF: MRA contraindicated by labs (SAFETY). On MRA with K+>=5.5 or eGFR<20 | HF dx, MRA active, K+, eGFR | D2, D3, D5 | Non-PHI |
| T2 | GAP-HF-009 | HFrEF: MRA K+ monitoring overdue. MRA active without K+ check in past 3 months | MRA med, K+ result dates | D3, D5 | Non-PHI |
| T2 | GAP-HF-011 | HFrEF: SGLT2i eGFR contraindication noted. Eligible by dx but eGFR<20 for initiation | HF dx, eGFR | D2, D5 | Non-PHI |
| T2 | GAP-HF-012 | HFrEF: Hydralazine/ISDN gap in self-identified Black. Black race + HFrEF on ACEi/ARB without hydralazine+ISDN | HF dx, race, med list | D1, D2, D3 | Non-PHI |
| T2 | GAP-HF-013 | HFrEF: Ivabradine candidate. LVEF<=35, sinus rhythm, HR>=70 on max BB | HF dx, LVEF, rhythm, HR, BB dose | D2, D3, D6, D8, D9 | Non-PHI |
| T2 | GAP-HF-015 | HF: Digoxin inappropriate use (elderly + CKD + high dose). Age>75 + eGFR<50 + digoxin>0.125 mg | Age, eGFR, digoxin dose | D1, D3, D5 | Non-PHI |

HFpEF/HFmrEF (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-016 | HFpEF/HFmrEF: SGLT2i not prescribed. EF>=40% HF without SGLT2i (DELIVER/EMPEROR-Preserved) | HF dx, LVEF, med list | D2, D3, D8 | Non-PHI |
| T1 | GAP-HF-017 | HFpEF/HFmrEF: Finerenone not prescribed. EF>=40% HF without finerenone (FINEARTS-HF); K+<5.0, eGFR>=25 | HF dx, LVEF, med list, K+, eGFR | D2, D3, D5, D8 | Non-PHI |
| T1 | GAP-HF-018 | Obese HFpEF: GLP-1 RA not prescribed. BMI>=30 + HFpEF without semaglutide/tirzepatide | HF dx, LVEF, BMI, med list | D2, D3, D6, D8 | Non-PHI |
| T2 | GAP-HF-019 | Possible undiagnosed HFpEF. Age>=55 + HTN/DM/obesity + NT-proBNP elevated + E/e'>14 or LAVI>=34, no HF dx | Risk dx, NT-proBNP, discrete echo E/e' + LAVI | D2, D5, D8 | Non-PHI |
| T2 | GAP-HF-020 | H2FPEF score high probability without diagnosis. H2FPEF score>=6 without HF dx | BMI, BP meds, AF, PASP, age, E/e' | D2, D3, D6, D8 | Non-PHI |

Device Therapy (12 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-021 | CRT Class I candidate not implanted. LVEF<=35 + QRS>=150 + LBBB + NYHA II-IV on GDMT>=3mo | HF dx, LVEF, QRS duration, morphology, GDMT duration, device status | D2, D3, D8, D9, D10 | Non-PHI |
| T1 | GAP-HF-024 | ICD primary prevention - ischemic. LVEF<=35 + post-MI>=40d on GDMT>=3mo, no ICD | HF dx, LVEF, MI history with date, GDMT, device status | D2, D3, D7, D8, D10 | Non-PHI |
| T1 | GAP-HF-025 | ICD primary prevention - NICM (DANISH age-stratified). NICM + LVEF<=35 on GDMT>=3mo | HF dx, LVEF, ischemic etiology, GDMT, age, device | D1, D2, D3, D8, D10 | Non-PHI |
| T1 | GAP-HF-026 | ICD secondary prevention. Prior sustained VT/VF without ICD | VT/VF dx history, device status | D2, D10 | Non-PHI |
| T2 | GAP-HF-022 | CRT Class IIa candidate. LVEF<=35 + QRS 130-149 + LBBB on GDMT | Same as above | D2, D3, D8, D9, D10 | Non-PHI |
| T2 | GAP-HF-023 | CRT Class IIb candidate. LVEF<=35 + QRS>=150 + non-LBBB on GDMT | Same as above | D2, D3, D8, D9, D10 | Non-PHI |
| T2 | GAP-HF-027 | CardioMEMS candidate. NYHA III + HF hospitalization in past 12 months | HF dx, hospitalization, functional class proxy | D2, D11, D19 | Non-PHI |
| T2 | GAP-HF-029 | CRT non-responder: LBBAP/HBP upgrade consideration. Prior CRT-D with ongoing HF hospitalizations, LV pacing <93% | Device history, HF hospitalization, LV pacing % from interrogation | D10, D11, D22 | Non-PHI |
| T2 | GAP-HF-030 | CIED battery ERI/EOL approaching. Device implant date > battery life - 12 months | Device type + implant date + battery status | D10, D22 | Non-PHI |
| T2 | GAP-HF-031 | Lead extraction indication. Device infection, erosion, malfunction, or abandoned lead | Device status, infection dx, complication codes | D2, D10 | Non-PHI |
| T2 | GAP-HF-126 | Cardiac contractility modulation (CCM/Optimizer) candidate. LVEF 25-45, NYHA III, narrow QRS, on GDMT - CCM eligible | LVEF, NYHA proxy, QRS, GDMT | D2, D3, D8, D9 | Non-PHI |
| T2 | GAP-HF-127 | WCD (wearable cardioverter-defibrillator) bridge to decision. Recent MI + LVEF<=35 in waiting period for ICD eligibility | MI date, LVEF, ICD status, WCD order | D2, D3, D8, D10 | Non-PHI |

Advanced HF (13 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-028 | Advanced HF therapy evaluation (LVAD/transplant). INTERMACS 1-4 signals or inotrope-dependent, no advanced HF referral | HF dx, inotrope orders, hospitalization, referral | D2, D3, D11, D14, D19 | Non-PHI |
| T1 | GAP-HF-041 | WHF event without GDMT intensification. HF hospitalization without discharge GDMT addition/uptitration | HF dx, hospitalization, pre/post med list | D2, D3, D11, D19 | Non-PHI |
| T1 | GAP-HF-043 | Frequent flyer (>=2 HF hospitalizations in 12 months). Advanced HF trigger signal | HF dx, HF hospitalization dates | D2, D11, D19 | Non-PHI |
| T1 | GAP-HF-132 | Tolvaptan candidate for severe hyponatremia in HF. HF + Na<125 or <130 symptomatic without tolvaptan considered | HF dx, Na value, tolvaptan med | D2, D3, D5 | Non-PHI |
| T1 | GAP-HF-133 | SCAI stage C/D HF-CS: MCS escalation gap. HF-cardiogenic shock without Impella/ECMO/VA-MCS escalation | HF dx, shock dx, MCS procedures | D2, D3, D7 | Non-PHI |
| T2 | GAP-HF-042 | Serial LVEF decline. LVEF decline >=10% between serial echos | Serial LVEF discrete with dates | D8 | Non-PHI |
| T2 | GAP-HF-044 | Palliative care not consulted in advanced HF. Multiple WHF + INTERMACS 5-7 without palliative consult | HF dx, hospitalization pattern, palliative referral | D2, D11, D14 | Non-PHI |
| T2 | GAP-HF-045 | Diuretic resistance without step-up. Escalating loop dose + persistent congestion without sequential nephron blockade | Diuretic dose history, weight trend | D3, D6 | Non-PHI |
| T2 | GAP-HF-046 | Hyperkalemia preventing MRA continuation - K+ binder gap. Prior MRA D/C for K+>=5.5 without patiromer/SZC | MRA history, K+, K+ binder | D3, D4, D5 | Non-PHI |
| T2 | GAP-HF-047 | Advanced HF: Inotrope dependence. Active inotrope order (milrinone, dobutamine) | Inotrope orders | D3 | Non-PHI |
| T2 | GAP-HF-048 | Advanced HF: End-organ dysfunction pattern. Rising Cr + LFTs + hyponatremia in HF | Serial Cr, AST, ALT, Na | D5 | Non-PHI |
| T2 | GAP-HF-049 | Advanced HF: Low BP despite GDMT reduction. Serial SBP<90 with GDMT dose reductions | Serial SBP, GDMT changes | D3, D6 | Non-PHI |
| T2 | GAP-HF-050 | Advanced HF: GDMT intolerance pattern. Multiple GDMT discontinuations with labs/vitals | Med D/C history, labs/vitals at D/C | D3, D5, D6 | Non-PHI |

Iron Deficiency (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-033 | Absolute iron deficiency untreated. HF + ferritin<100 ng/mL without IV iron | HF dx, ferritin, IV iron admin records | D2, D5, D7, D19 | Non-PHI |
| T1 | GAP-HF-034 | Functional iron deficiency untreated. HF + ferritin 100-299 + TSAT<20% without IV iron | HF dx, ferritin, TSAT, IV iron | D2, D5, D7, D19 | Non-PHI |
| T2 | GAP-HF-032 | Iron deficiency screening overdue. HF without ferritin or TSAT in past 12 months | HF dx, ferritin/TSAT result dates | D2, D5 | Non-PHI |

Transitions of Care (10 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-036 | HF discharge without all 4 GDMT pillars. Discharge med list missing BB, RAASi, MRA, or SGLT2i | HF dx, discharge med list | D2, D3, D11, D19 | Non-PHI |
| T2 | GAP-HF-035 | No follow-up visit within 14 days of HF discharge. HF hospitalization discharge without HF clinic visit scheduled 7-14 days | HF dx, admit/discharge dates, post-discharge encounters | D2, D11, D19 | Non-PHI |
| T2 | GAP-HF-037 | Cardiac rehab not referred post-HF hospitalization. HFrEF stable post-discharge without cardiac rehab referral (CPT 93798) | HF dx, cardiac rehab referral | D2, D14 | Non-PHI |
| T2 | GAP-HF-130 | 30-day readmission: HF DRG. HF admission (DRG 291-293) within 30d of prior HF discharge | DRG history, admit/discharge dates | D11, D19 | Non-PHI |
| T2 | GAP-HF-131 | HF observation status misclassification. Short-stay HF encounter coded observation when inpatient criteria met | HF dx, LOS, type of bill, observation vs inpatient code | D11, D19 | Non-PHI |
| T3 | GAP-HF-038 | Depression screening overdue (PHQ). HF dx without PHQ-2/PHQ-9 in 12 months | HF dx, depression screen flowsheet | D2, D6 | Non-PHI |
| T3 | GAP-HF-039 | Sleep apnea not screened in HF. HF without STOP-BANG or polysomnography | HF dx, STOP-BANG, PSG procedure | D2, D6, D7 | Non-PHI |
| T3 | GAP-HF-040 | Vaccinations overdue in HF. HF without current flu, COVID, or pneumococcal vaccine | HF dx, immunization records | D2, D18 | Non-PHI |
| T3 | GAP-HF-128 | Home health referral gap post-HF discharge. HF discharge to home without home health referral despite NYHA III-IV | HF dx, discharge disposition, HH referral | D2, D11, D14, D19 | Non-PHI |
| T3 | GAP-HF-129 | HF discharge education documentation. HF discharge without teach-back documentation on weight, salt, meds | HF dx, discharge education flowsheet | D2, D6, D11 | Non-PHI |

Amyloid (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-051 | ATTR-CM screening: unexplained LVH + red flags. >=3 of: age>=60, low-voltage ECG, NT-proBNP disproportionate to EF, bilateral carpal tunnel, spinal stenosis, conduction disease, AA race (V122I) | Wall thickness, ECG voltage, NT-proBNP, CPT 64721 bilateral CTR, M48.0x, conduction dx, race | D1, D2, D5, D7, D8, D9 | Non-PHI |
| T1 | GAP-HF-053 | Amyloid workup: PYP scan not ordered. ATTR red flags + normal FLC without Tc-99m PYP | Red flags, FLC, PYP procedure | D2, D5, D7 | Non-PHI |
| T1 | GAP-HF-054 | ATTR-CM confirmed but no disease-modifying therapy. E85.82 or E85.1 without tafamidis/vutrisiran/patisiran/acoramidis | Amyloid dx, DMT med list | D2, D3 | Non-PHI |
| T2 | GAP-HF-052 | Amyloid workup: FLC/immunofixation not ordered. ATTR red flags, kappa/lambda FLC never measured | Red flags, FLC result history | D2, D5 | Non-PHI |
| T2 | GAP-HF-134 | AL amyloid workup gap (SPEP/UPEP/FLC). Suspected amyloid without complete plasma cell workup | Suspected amyloid, SPEP/UPEP/FLC, BMB | D2, D5, D7 | Non-PHI |
| T3 | GAP-HF-055 | ATTR-CM: TTR gene sequencing gap. Amyloid dx without TTR genetic testing order | Amyloid dx, TTR test procedure | D2, D7 | Non-PHI |
| T3 | GAP-HF-056 | V122I screening in Black patients age>=65 with HFpEF. Black race + HFpEF + age>=65 without ATTR workup | Race, age, HFpEF dx, amyloid workup | D1, D2, D7 | Non-PHI |

HCM (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-057 | HCM with obstruction not on myosin inhibitor. I42.1 + LVOT gradient>=30 rest or >=50 provoked without mavacamten/aficamten | HCM dx, LVOT gradient discrete, med list | D2, D3, D8 | Non-PHI |
| T2 | GAP-HF-135 | HCM first-degree relative cascade screening gap. Proband HCM + FDR without screening echo + ECG | HCM dx, family referral patterns | D2, D14, D17 | Non-PHI |
| T3 | GAP-HF-058 | HCM: SRT (septal reduction) candidate. HCM persistent obstruction on max medical therapy | HCM dx, gradient, med list, SRT procedure history | D2, D3, D7, D8 | Non-PHI |
| T3 | GAP-HF-059 | HCM: SCD risk stratification not documented. HCM without ICD risk assessment in 12 months | HCM dx, ICD status, risk factors (wall thickness, gradient, FHx SCD, syncope, NSVT) | D2, D8, D9, D10, D17 | Non-PHI |
| T3 | GAP-HF-136 | Apical HCM missed diagnosis. LVH pattern + apical thickening + giant T-wave inversion not diagnosed | Wall thickness by segment, ECG TWI | D8, D9 | Non-PHI |

Other Phenotypes (16 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-HF-060 | Fabry disease screening. Unexplained LVH + age<55 + CKD/neuropathy without alpha-gal A | Wall thickness, age, CKD/neuropathy, alpha-gal A LOINC | D1, D2, D5, D8 | Non-PHI |
| T3 | GAP-HF-061 | Fabry confirmed: enzyme replacement gap. E75.21 without agalsidase or migalastat | Fabry dx, med list | D2, D3 | Non-PHI |
| T3 | GAP-HF-062 | Cardiac sarcoidosis: unexplained AV block <60. New 2nd/3rd degree AV block age<60 without sarcoid workup | Age, conduction dx, FDG-PET, sarcoid dx | D1, D2, D7, D9 | Non-PHI |
| T3 | GAP-HF-063 | Cardiac sarcoid confirmed: immunosuppression gap. D86.85 without prednisone or steroid-sparing | Sarcoid dx, med list | D2, D3 | Non-PHI |
| T3 | GAP-HF-064 | Chagas CM screening. Endemic origin + RBBB+LAFB + CM without Chagas serology | Country of origin, ECG morphology, CM dx, Chagas serology | D2, D5, D9, D16 | Non-PHI |
| T3 | GAP-HF-065 | Tachycardia-mediated CM suspected. New LV dysfunction + HR>100 or PVC burden>=10% without rate/rhythm control | HR, PVC burden, LVEF, rate control meds | D3, D6, D8, D9 | Non-PHI |
| T3 | GAP-HF-066 | Pre-anthracycline baseline cardiac assessment gap. Anthracycline order without baseline echo + GLS | Chemo orders, pre-chemo echo + GLS | D3, D8 | Non-PHI |
| T3 | GAP-HF-067 | Anthracycline-induced LVEF decline. Serial LVEF drop >10% to <50% during therapy | Anthracycline admin dates, serial LVEF | D3, D8 | Non-PHI |
| T3 | GAP-HF-068 | HER2 therapy cardiac surveillance gap. Trastuzumab active without echo in past 3 months | Trastuzumab orders, echo frequency | D3, D8 | Non-PHI |
| T3 | GAP-HF-069 | ICI myocarditis screen during checkpoint inhibitor. Active ICI + new troponin or LVEF decline | ICI orders, troponin trend, LVEF | D3, D5, D8 | Non-PHI |
| T3 | GAP-HF-070 | Peripartum cardiomyopathy identification. Female + LVEF<45 last month pregnancy through 5mo postpartum | Sex, pregnancy/delivery dates, LVEF | D1, D2, D8 | Non-PHI |
| T3 | GAP-HF-071 | LVNC anticoagulation gap. I42.8 LVNC + LVEF<40 without anticoagulation | LVNC dx, LVEF, anticoag | D2, D3, D8 | Non-PHI |
| T3 | GAP-HF-072 | Takotsubo recovery monitoring gap. I51.81 without follow-up echo in 3-4 weeks | Takotsubo dx, serial echo dates | D2, D8 | Non-PHI |
| T3 | GAP-HF-073 | Radiation heart disease surveillance. Prior chest radiation (Z92.3) + cardiac dx without annual echo | Radiation history, echo dates, cardiac dx | D2, D8 | Non-PHI |
| T3 | GAP-HF-074 | ARVC: ICD + exercise restriction counseling. ARVC dx without ICD risk assessment | ARVC dx pattern, RV imaging, ICD status | D2, D8, D10 | Non-PHI |
| T3 | GAP-HF-075 | Danon disease transplant evaluation. LAMP2 mutation + massive LVH young male without transplant eval | Genetic test, wall thickness, age, sex, transplant referral | D1, D7, D8, D14 | Non-PHI |

Cardiorenal Syndrome (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-HF-137 | CRS type 1 (acute cardiorenal) untreated pattern. Acute HF + AKI without nephrology coordination | HF dx acute, eGFR decline, nephrology referral | D2, D5, D14 | Non-PHI |
| T2 | GAP-HF-138 | CRS type 2 (chronic cardiorenal): CKD progression rate. Chronic HF + eGFR slope > -3 mL/min/y | HF dx, serial eGFR with dates | D2, D5 | Non-PHI |
| T2 | GAP-HF-139 | CRS type 4 (chronic renocardiac): HF screening in advanced CKD. eGFR<30 without HF screening (NT-proBNP or echo) | eGFR, NT-proBNP, echo history | D5, D8 | Non-PHI |
| T2 | GAP-HF-140 | Cardiorenal: ultrafiltration consideration in diuretic-resistant HF. Diuretic-resistant congestion + rising Cr without UF evaluation | Diuretic doses, weight, Cr | D3, D5, D6 | Non-PHI |
| T2 | GAP-HF-141 | CRS type 5 (systemic): sepsis or shock precipitant. Acute HF in setting of sepsis without early goal-directed therapy | HF dx, sepsis dx, lactate, resuscitation bundle | D2, D5, D7 | Non-PHI |

Pericardial Disease (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-HF-146 | Tamponade physiology on echo without drainage. Effusion + tamponade features (RV collapse, IVC plethora) without drainage | Echo tamponade markers, pericardiocentesis procedure | D7, D8 | Non-PHI |
| T3 | GAP-HF-142 | Constrictive pericarditis consideration in HFpEF pattern. HFpEF + prior pericardial dx/radiation/cardiac surgery + discordance without constriction workup | HFpEF, prior pericardial etiology, constriction imaging | D2, D7, D8 | Non-PHI |
| T3 | GAP-HF-143 | Recurrent pericarditis: colchicine gap. I31.x recurrent pericarditis without colchicine | Pericarditis dx, colchicine med | D2, D3 | Non-PHI |
| T3 | GAP-HF-144 | Recurrent pericarditis refractory: IL-1 inhibitor consideration. Steroid-dependent recurrent pericarditis without rilonacept | Pericarditis dx, steroid history, rilonacept | D2, D3 | Non-PHI |
| T3 | GAP-HF-145 | Large pericardial effusion without workup. Moderate-large effusion on echo without etiologic workup | Effusion discrete, workup labs/procedures | D5, D7, D8 | Non-PHI |

LVAD/Transplant (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-147 | Post-LVAD: anticoagulation INR out of range. LVAD (Z95.811) + INR not 2.0-3.0 at last check | LVAD device, INR history | D2, D5, D10 | Non-PHI |
| T2 | GAP-HF-148 | Post-LVAD: GI bleeding without octreotide/ACEi mgmt. LVAD + recurrent GIB without angiodysplasia mgmt | LVAD, GIB dx, med strategies | D2, D3, D10 | Non-PHI |
| T2 | GAP-HF-149 | Post-LVAD: pump thrombosis screening. LVAD + elevated LDH or heart failure signs without pump thrombosis workup | LVAD, LDH, BNP, admission pattern | D5, D10 | Non-PHI |
| T2 | GAP-HF-150 | Post-LVAD: driveline infection suspicion. LVAD + fever/local findings + blood culture without full workup | LVAD, fever, blood cx, TEE | D2, D5, D10 | Non-PHI |
| T2 | GAP-HF-151 | Post-transplant: CAV surveillance angiography gap. Heart transplant (Z94.1) without annual/biannual CAV assessment | Transplant Z-code, coronary angio schedule | D2, D7 | Non-PHI |
| T2 | GAP-HF-152 | Post-transplant: rejection surveillance biopsy schedule. Heart transplant without biopsy schedule adherence year 1 | Transplant Z-code, biopsy procedures | D2, D7 | Non-PHI |
| T2 | GAP-HF-153 | Post-transplant: immunosuppression level monitoring. Tacro/CsA/sirolimus without level within past 3 months | Immunosuppressant meds, drug levels | D3, D5 | Non-PHI |
| T2 | GAP-HF-155 | Post-LVAD: RV failure pattern without MCS reassessment. LVAD + rising CVP + low CO + RV dysfunction without RV MCS discussion | LVAD, RV measures, hemodynamics | D10, D23 | Non-PHI |
| T3 | GAP-HF-154 | Post-transplant: CMV/EBV surveillance. Transplant first year without CMV PCR schedule | Transplant, CMV PCR history | D2, D5 | Non-PHI |

ECMO/MCS (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-HF-156 | VA-ECMO: LV venting/unloading gap. VA-ECMO without Impella/IABP unloading adjunct in LV distension | ECMO procedure, Impella/IABP codes, LV dilation on echo | D7, D8 | Non-PHI |
| T2 | GAP-HF-157 | VA-ECMO: weaning protocol documentation. VA-ECMO prolonged without weaning attempt or strategy | ECMO duration, weaning trial docs | D7, D8 | Non-PHI |
| T3 | GAP-HF-158 | Impella in LV recovery: escalation protocol adherence. Impella CP placed for AMI-CS without SCAI stage reassessment | Impella placement, SCAI stage, hemodynamics | D7, D23 | Non-PHI |

Genetics (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-HF-159 | Familial DCM cascade screening gap. I42.0 DCM + FDR cardiomyopathy without cascade genetic testing | DCM dx, family hx, cascade referrals | D2, D7, D14, D17 | Non-PHI |
| T3 | GAP-HF-160 | LMNA cardiomyopathy: early ICD consideration. LMNA pathogenic + >=2 risk factors (NSVT, LVEF<45, male, non-missense) | LMNA genotype, risk factor components | D2, D7, D8, D9, D10 | Non-PHI |
| T3 | GAP-HF-161 | Filamin C cardiomyopathy: ICD consideration. FLNC mutation + cardiomyopathy without ICD risk stratification | FLNC genotype, CM dx, ICD status | D2, D7, D10 | Non-PHI |

Cross-cutting (15 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-HF-076 | HF + asymptomatic LV dysfunction: Stage B progression risk. LVEF<50 + structural changes without GDMT initiation (stage B) | LVEF, structural changes, med list | D3, D8 | Non-PHI |
| T2 | GAP-HF-077 | Cardiac amyloidosis + AF: anticoagulation gap. Amyloid dx + AF without anticoagulation (all cardiac amyloid is high-risk) | Amyloid dx, AF dx, anticoag | D2, D3 | Non-PHI |
| T2 | GAP-HF-078 | HF + chronic AF: rate vs rhythm review. HF + permanent AF + HR>110 without rate control optimization | HF dx, AF dx, HR, rate meds | D2, D3, D6 | Non-PHI |
| T2 | GAP-HF-079 | HF + iron deficiency + anemia without etiology workup. HF + Hb<11 + iron deficiency without GI/hem workup | HF dx, Hb, iron studies, GI referral | D2, D5, D14 | Non-PHI |
| T2 | GAP-HF-080 | HF + thyroid dysfunction untreated. HF + TSH abnormal without thyroid therapy documented | HF dx, TSH, thyroid meds | D3, D5 | Non-PHI |
| T2 | GAP-HF-081 | HF + diabetes: HbA1c target gap. HF + DM + HbA1c>8 without intensification | HF dx, DM, HbA1c, DM meds | D2, D3, D5 | Non-PHI |
| T2 | GAP-HF-082 | HF + CKD + metformin: renal-dose review. HF + CKD + metformin with eGFR<45 without dose review | HF dx, CKD, metformin, eGFR | D2, D3, D5 | Non-PHI |
| T2 | GAP-HF-083 | HF + CHEF trial flag for primary CMR. Unclear HF etiology without cardiac MRI for etiologic workup | HF dx, CMR history | D2, D7, D8 | Non-PHI |
| T2 | GAP-HF-084 | HF + functional assessment (6MWT or CPET) never done. HFrEF without any exercise capacity assessment | HF dx, 6MWT flowsheet, CPET procedure | D2, D6, D7 | Non-PHI |
| T2 | GAP-HF-085 | HF + ICD shocks: inappropriate vs appropriate review. ICD with delivered therapies without appropriateness review | Device therapy log | D10, D22 | Non-PHI |
| T2 | GAP-HF-086 | HF in pregnancy: teratogenic med review (ACEi/ARB/ARNI/SGLT2i). Pregnancy + HF + teratogenic med | Pregnancy dx, HF dx, med list | D2, D3 | Non-PHI |
| T2 | GAP-HF-087 | HF + opioid use: high-risk interaction / OSA exacerbation. HF + chronic opioid without OSA screen or risk review | HF dx, opioid med, STOP-BANG | D2, D3, D6 | Non-PHI |
| T2 | GAP-HF-088 | HF + cancer survivorship: cardio-oncology referral gap. HF in cancer survivor on surveillance without cardio-onc f/u | HF dx, cancer history, cardio-onc encounter | D2, D11 | Non-PHI |
| T2 | GAP-HF-089 | HF + Hispanic/Latino: SDOH acculturation review. HF + primary language Spanish without culturally tailored ed | HF dx, language, SDOH codes | D1, D2, D16 | Non-PHI |
| T2 | GAP-HF-090 | HF telehealth utilization (underused). HF + rural ADI high + no telehealth encounter in 12 months | HF dx, encounter type, ADI overlay | D2, D11, D26 | Non-PHI |

6.2 Electrophysiology (89 gaps)
AF Anticoagulation (13 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-001 | AF: Anticoagulation gap (CHA2DS2-VASc qualifying). I48.x + CHA2DS2-VASc>=2 men or >=3 women without OAC | AF dx + CHA2DS2-VASc components (HF, HTN, age, DM, stroke/TIA, vasc, sex) | D1, D2, D3 | Non-PHI |
| T1 | GAP-EP-006 | AF: Dabigatran in CrCl<30 (SAFETY). Dabigatran + severe renal impairment | Dabigatran, CrCl/eGFR | D3, D5 | Non-PHI |
| T1 | GAP-EP-007 | AF: DOAC on mechanical valve (CRITICAL SAFETY). DOAC + Z95.2 or mechanical valve history | Valve history, DOAC | D2, D3, D7 | Non-PHI |
| T1 | GAP-EP-008 | AF: DOAC on moderate-severe mitral stenosis. DOAC + I05.0/I34.2 moderate-severe MS | MS dx + severity, DOAC | D2, D3, D8 | Non-PHI |
| T1 | GAP-EP-064 | AF: OAC prescribed but not filled (primary non-adherence). OAC e-prescribed but zero pharmacy fills | E-Rx orders vs pharmacy claim fills | D3, D21 | Non-PHI |
| T1 | GAP-EP-065 | AF: OAC adherence PDC<80% on chronic fills. Proportion of days covered <80% in past 12mo | Pharmacy claim fill data with days-supply | D21 | Non-PHI |
| T2 | GAP-EP-002 | AF: Warfarin with TTR<65%. On warfarin with INR TTR<65% - DOAC switch | Warfarin med, serial INR values | D3, D5 | Non-PHI |
| T2 | GAP-EP-003 | AF: DOAC dose inappropriate for CrCl. DOAC dose not matching CrCl-adjusted recommendation | DOAC type + dose, CrCl | D3, D5 | Non-PHI |
| T2 | GAP-EP-004 | AF: Apixaban dose reduction criteria missed. Age>=80, wt<=60kg, Cr>=1.5 present but on 5 mg BID (should be 2.5) | Age, weight, Cr, apixaban dose | D1, D3, D5, D6 | Non-PHI |
| T2 | GAP-EP-005 | AF: Apixaban under-dosing (2.5 BID without criteria). On 2.5 mg BID without >=2 reduction criteria | Age, weight, Cr, apixaban dose | D1, D3, D5, D6 | Non-PHI |
| T2 | GAP-EP-009 | AF: Edoxaban with CrCl>95 (reduced efficacy). Edoxaban + CrCl>95 | Edoxaban, CrCl | D3, D5 | Non-PHI |
| T2 | GAP-EP-066 | AF: Triple therapy duration gap post-PCI. AF + recent PCI on OAC + DAPT beyond 1-6 mo per AUGUSTUS/PIONEER | AF, PCI date, DAPT components, OAC | D2, D3, D7 | Non-PHI |
| T3 | GAP-EP-010 | AF: Rivaroxaban food counseling. Rivaroxaban prescribed - must be taken with food | Rivaroxaban med | D3 | Non-PHI |

LAAC (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-011 | LAAC: bleeding contraindication to OAC. AF + HAS-BLED high + documented OAC contraindication without LAAC referral | AF, bleeding hx, OAC hold reason, LAAC | D2, D3, D7, D14 | Non-PHI |
| T1 | GAP-EP-012 | LAAC: high CHA2DS2-VASc + bleed history. CHA2DS2-VASc>=3 + prior major bleed without LAAC discussion | CHA2DS2-VASc, bleed history | D2, D14 | Non-PHI |
| T2 | GAP-EP-067 | Post-LAAC: antithrombotic protocol adherence. LAAC with non-standard post-procedure antithrombotic regimen | LAAC procedure date, antithrombotic sequence | D3, D7 | Non-PHI |
| T2 | GAP-EP-068 | Post-LAAC: TEE surveillance at 45d-1y gap. LAAC without follow-up TEE | LAAC procedure, TEE dates | D7 | Non-PHI |
| T2 | GAP-EP-069 | LAAC peridevice leak >5mm: management gap. LAAC with PDL>5mm on TEE without anticoagulation reassessment | LAAC, PDL measurement, anticoag | D3, D7, D8 | Non-PHI |

Rhythm Control (11 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-013 | Early rhythm control candidate (EAST-AFNET 4). AF diagnosis within 12 months without rhythm control strategy | AF onset date, AAD meds, ablation | D2, D3, D7 | Non-PHI |
| T1 | GAP-EP-014 | AF ablation in HFrEF (CASTLE-AF). AF + LVEF<=35 without ablation referral | AF, LVEF, ablation, referral | D2, D7, D8, D14 | Non-PHI |
| T1 | GAP-EP-017 | AF + non-DHP CCB in HFrEF (SAFETY). HFrEF on verapamil/diltiazem | HF dx, LVEF, verapamil/diltiazem | D2, D3, D8 | Non-PHI |
| T1 | GAP-EP-018 | Subclinical AF: AHRE>=24h without anticoag eval. Device-detected AHRE>=24h + CHA2DS2-VASc>=2 | AHRE from device, CHA2DS2-VASc | D1, D2, D10, D22 | Non-PHI |
| T2 | GAP-EP-015 | Symptomatic paroxysmal AF - ablation candidate. Paroxysmal AF symptomatic despite AAD | AF, AAD history, symptoms | D2, D3 | Non-PHI |
| T2 | GAP-EP-016 | Post-cardioversion anticoagulation duration gap. Recent cardioversion without 4+ weeks post-procedure OAC | Cardioversion CPT 92960, OAC continuation | D3, D7 | Non-PHI |
| T2 | GAP-EP-070 | PFA ablation candidacy (pulsed field). Paroxysmal AF ablation candidate + pulmonary vein anatomy amenable | AF dx, PV imaging | D2, D7, D8 | Non-PHI |
| T2 | GAP-EP-071 | Post-ablation anticoagulation continuation gap. Post-AF ablation with CHA2DS2-VASc qualifying but OAC stopped at 3mo | Ablation date, OAC continuation, CHA2DS2-VASc | D2, D3, D7 | Non-PHI |
| T2 | GAP-EP-072 | Redo ablation consideration in recurrent AF. Prior AF ablation + recurrent AF symptoms at >3mo without redo discussion | Ablation history, AF recurrence | D2, D7 | Non-PHI |
| T2 | GAP-EP-073 | Concomitant Maze at cardiac surgery with AF. Surgical AF + cardiac surgery without concomitant Maze documented | AF, cardiac surgery CPT, Maze CPT | D2, D7 | Non-PHI |
| T3 | GAP-EP-019 | Cryptogenic stroke: ICM not implanted. I63.9 cryptogenic stroke without ICM or 30-day monitor | Stroke dx, ICM procedure | D2, D7, D10 | Non-PHI |

Atrial Tachy/SVT (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-079 | Pre-excited AF: AV nodal blocker contraindicated (CRITICAL). WPW + AF on beta-blocker/CCB/digoxin - risk of VF | WPW dx, AF dx, AV nodal blocker | D2, D3, D9 | Non-PHI |
| T2 | GAP-EP-074 | Typical atrial flutter: CTI ablation candidate. I48.3 typical flutter + symptomatic without CTI ablation offered | Atrial flutter dx, ablation procedure | D2, D7 | Non-PHI |
| T2 | GAP-EP-075 | Focal atrial tachycardia recurrent: ablation gap. Recurrent focal AT symptomatic on AAD without ablation | AT dx, AAD, ablation | D2, D3, D7 | Non-PHI |
| T2 | GAP-EP-076 | AVNRT recurrent symptomatic: ablation offered. AVNRT diagnosis recurrent without ablation option discussed | SVT dx, AAD, ablation referral | D2, D3, D7, D14 | Non-PHI |
| T2 | GAP-EP-077 | AVRT with concealed bypass tract: ablation. AVRT dx without ablation | SVT dx, EP study, ablation | D2, D7 | Non-PHI |
| T2 | GAP-EP-078 | WPW asymptomatic in high-risk occupation: EP study gap. WPW pattern on ECG in pilot/athlete without risk stratification | WPW ECG, EP study | D7, D9 | Non-PHI |
| T3 | GAP-EP-080 | Athlete's heart vs pathology: exercise stress + imaging gap. Athletes with ECG abnormalities without exercise + imaging workup | ECG abnormalities, stress test, imaging | D7, D8, D9 | Non-PHI |

VT/ICD (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-086 | VT storm: admission + sedation + ablation protocol. VT storm (>=3 sustained VT/24h) without escalation protocol | VT storm pattern, ICU admission, ablation | D2, D7, D11 | Non-PHI |
| T2 | GAP-EP-020 | Ischemic VT: catheter ablation consideration. Ischemic heart disease + VT on AAD without ablation offered | CAD dx, VT dx, AAD, ablation | D2, D3, D7 | Non-PHI |
| T2 | GAP-EP-021 | NICM VT: substrate mapping/ablation gap. NICM + monomorphic VT without EP study | NICM dx, VT dx, EP study | D2, D7 | Non-PHI |
| T2 | GAP-EP-022 | VT ablation before amiodarone escalation (VANISH). Ischemic VT + ICD shocks on AAD without ablation offered | VT, ICD therapy log, AAD, ablation | D2, D3, D7, D10 | Non-PHI |
| T2 | GAP-EP-087 | Epicardial VT substrate: access planning. Ischemic VT + failed endocardial ablation without epicardial approach | Prior ablation, substrate imaging | D7, D8 | Non-PHI |
| T2 | GAP-EP-088 | Stellate ganglion block for refractory VT storm. Refractory VT storm without SGB evaluation | VT storm, SGB procedure | D7 | Non-PHI |
| T2 | GAP-EP-089 | Inappropriate ICD shocks: programming optimization. ICD shock appropriateness review not documented after therapy | Device therapy log, programming review | D10, D22 | Non-PHI |

Channelopathies (11 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-EP-023 | Brugada syndrome diagnosis gap. ECG type 1 Brugada pattern without formal diagnosis | ECG pattern | D9 | Non-PHI |
| T2 | GAP-EP-024 | LQTS: beta-blocker gap. LQTS (I49.81 or genetic) without beta-blocker | LQTS dx, BB med | D2, D3 | Non-PHI |
| T2 | GAP-EP-025 | Acquired LQT on QT-prolonging drug (SAFETY). QTc>=500 on QT-prolonging drug without discontinuation | QTc, QT drug list (amiodarone, dronedarone, sotalol, methadone, etc.) | D3, D9 | Non-PHI |
| T2 | GAP-EP-026 | Congenital LQTS: QT-prolonging drug avoidance gap. LQTS dx + QT-prolonging drug prescribed | LQTS dx, QT drug | D2, D3 | Non-PHI |
| T2 | GAP-EP-027 | SCN5A-mediated Brugada: device decision. Confirmed Brugada + syncope or FHx SCD without ICD | Brugada dx, syncope, FHx, ICD status | D2, D10, D17 | Non-PHI |
| T2 | GAP-EP-028 | CPVT: beta-blocker + flecainide consideration. CPVT dx without nadolol or flecainide added | CPVT dx, med list | D2, D3 | Non-PHI |
| T3 | GAP-EP-081 | LQT1 genotype specific: BB choice (nadolol preferred). LQT1 on propranolol instead of nadolol | LQT1 genotype, BB identity | D2, D3 | Non-PHI |
| T3 | GAP-EP-082 | LQT2 trigger identification counseling gap. LQT2 genotype + auditory/postpartum triggers not counseled | LQT2 genotype, counseling flowsheet | D2, D6 | Non-PHI |
| T3 | GAP-EP-083 | LQT3 mexiletine eligibility. LQT3 (SCN5A gain-of-function) without mexiletine evaluated | LQT3 genotype, mexiletine med | D2, D3 | Non-PHI |
| T3 | GAP-EP-084 | Short QT syndrome: quinidine consideration. SQTS diagnosis without quinidine evaluated | SQTS dx, quinidine med | D2, D3 | Non-PHI |
| T3 | GAP-EP-085 | Early repolarization syndrome post-VF: ICD + quinidine. ERS + VF survivor without ICD or quinidine | ERS dx, VF hx, ICD, quinidine | D2, D3, D10 | Non-PHI |

Pacing (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-EP-029 | Pacemaker Class I indication not implanted. Complete AV block, symptomatic SB, sinus node dysfunction - pacer indicated | AV block dx, sinus node dx, device status | D2, D9, D10 | Non-PHI |
| T2 | GAP-EP-030 | Symptomatic bradycardia on AV nodal blocker: med reduction first. Bradyarrhythmia + AV nodal blocker before pacer decision | Bradycardia dx, HR, med list | D2, D3, D6 | Non-PHI |
| T2 | GAP-EP-031 | Vasovagal syncope recurrent: tilt or ILR. Recurrent vasovagal syncope without tilt or ILR | Syncope dx, tilt procedure, ILR | D2, D7, D10 | Non-PHI |
| T2 | GAP-EP-032 | Pacemaker syndrome from RV pacing >=40%: upgrade discussion. Single chamber RV pacemaker with >=40% pacing and HF symptoms | Pacing %, device type, HF dx | D2, D10, D22 | Non-PHI |
| T2 | GAP-EP-033 | Chronic AF with HR<40: permanent pacing vs med adjustment. AF + awake HR<40 on meds without meds first, then pacer | AF, HR pattern, med list | D2, D3, D6 | Non-PHI |
| T2 | GAP-EP-034 | Isolated left-sided CIED infection: full system removal. CIED + BSI without extraction planning | Device, BSI culture, extraction procedure | D2, D5, D10 | Non-PHI |
| T2 | GAP-EP-035 | Post-AVR (surgical or TAVR) conduction: pacer indication. Post-AVR complete AV block or symptomatic without pacer | AVR procedure, AV block dx, device status | D2, D7, D9, D10 | Non-PHI |
| T2 | GAP-EP-036 | Leadless pacemaker candidate (AV block + single chamber). Single chamber pacer indication without leadless option discussed | Pacer indication, leadless option notation | D2, D7, D10 | Non-PHI |
| T2 | GAP-EP-037 | LBBAP (left bundle branch area pacing) consideration. Pacer indication with expected >=40% pacing - LBBAP preferred | Pacer indication, LBBAP procedure | D7, D10 | Non-PHI |

CIED Management (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-EP-038 | CIED recall: patient notification and follow-up. Device on recall list without acknowledged follow-up plan | Device model + recall matching | D10, D22 | Non-PHI |
| T2 | GAP-EP-039 | CIED abandoned lead: infection risk discussion. Abandoned lead in situ without periodic surveillance | Lead history, imaging surveillance | D7, D10 | Non-PHI |
| T2 | GAP-EP-040 | CIED MRI-conditional vs non-conditional identification gap. MRI ordered for patient with non-conditional CIED without pathway clarified | MRI order, device model | D7, D10 | Non-PHI |
| T2 | GAP-EP-041 | Primary prevention ICD lifestyle/driving counseling. Primary prevention ICD without documented driving restrictions counsel | ICD, counsel flowsheet | D6, D10 | Non-PHI |
| T2 | GAP-EP-042 | CIED at EOL: deactivation discussion. Palliative care + active ICD without shock therapy deactivation discussion | Palliative encounter, device, deactivation flowsheet | D2, D10, D11 | Non-PHI |
| T2 | GAP-EP-090 | Post-CIED infection: full system extraction. Pocket infection without full system extraction | CIED, infection dx, extraction procedure | D2, D10 | Non-PHI |
| T2 | GAP-EP-092 | S-ICD candidate (young, no pacing need). Primary prevention ICD candidate age<50 without pacing need - S-ICD | Age, pacing need, device selection | D1, D10 | Non-PHI |
| T3 | GAP-EP-091 | CIED lead failure pattern detection. Device interrogation shows lead impedance anomaly without follow-up | Lead impedance trend from interrogation | D10, D22 | Non-PHI |

AAD Safety (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-EP-043 | Amiodarone: TSH overdue. On amiodarone without TSH in past 6 months | Amiodarone med, TSH result dates | D3, D5 | Non-PHI |
| T2 | GAP-EP-044 | Amiodarone: LFT overdue. On amiodarone without AST/ALT in past 6 months | Amiodarone med, LFT result dates | D3, D5 | Non-PHI |
| T2 | GAP-EP-045 | Amiodarone: baseline PFT/CXR gap. Starting amiodarone without baseline PFT or CXR | Amiodarone start, PFT/CXR history | D3, D7 | Non-PHI |
| T2 | GAP-EP-046 | Dronedarone: contraindicated in permanent AF or NYHA III-IV (SAFETY). Permanent AF or severe HF + dronedarone | AF type, NYHA proxy, dronedarone | D2, D3 | Non-PHI |
| T2 | GAP-EP-047 | Sotalol initiation: inpatient QT monitoring gap. Sotalol started outpatient without documented inpatient telemetry | Sotalol start, hospitalization flag | D3, D11 | Non-PHI |
| T2 | GAP-EP-048 | Dofetilide initiation: mandatory inpatient protocol. Dofetilide without inpatient QT protocol | Dofetilide start, inpatient encounter | D3, D11 | Non-PHI |
| T2 | GAP-EP-049 | Flecainide/propafenone in structural heart disease (SAFETY). Flecainide or propafenone + CAD or structural heart disease | CAD/SHD dx, flecainide/propafenone | D2, D3 | Non-PHI |
| T2 | GAP-EP-050 | Inappropriate ICD shocks evaluation. ICD with appropriate shock alerts requiring programming optimization | Device shock history | D10, D22 | Non-PHI |

Syncope (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-EP-093 | Syncope without ECG documented. R55 syncope dx without ECG in encounter | Syncope dx, ECG date | D2, D9 | Non-PHI |
| T2 | GAP-EP-094 | Exertional syncope: structural workup gap. Exertional syncope without echo + exercise testing | Syncope pattern, echo, stress test | D2, D7, D8 | Non-PHI |
| T2 | GAP-EP-095 | Syncope + structural heart disease: ICD eval. Syncope + significant LVH or LVEF<35 without ICD risk assessment | Syncope, wall thickness, LVEF, ICD | D2, D8, D10 | Non-PHI |
| T2 | GAP-EP-097 | Orthostatic hypotension: med review gap. OH + antihypertensive/alpha-blocker without med reconciliation | OH dx, med list | D2, D3, D6 | Non-PHI |
| T3 | GAP-EP-096 | POTS diagnostic gap. Orthostatic symptoms + HR rise>30 without POTS workup | Orthostatic vitals, POTS dx | D2, D6 | Non-PHI |
| T3 | GAP-EP-098 | Carotid sinus hypersensitivity: CSM documented. Unexplained syncope age>=60 without carotid sinus massage | Age, syncope dx, CSM documentation | D1, D2, D6 | Non-PHI |

Cardiac Arrest (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-EP-099 | Post-arrest: TTM not documented. Cardiac arrest survivor without TTM protocol documentation | Arrest dx (I46.x), TTM flowsheet/procedure | D2, D7 | Non-PHI |
| T2 | GAP-EP-100 | Post-arrest: neurological prognostication timing. Post-arrest neuroprognostication before 72h | Arrest date, neuro assessment dates | D2, D7, D11 | Non-PHI |
| T2 | GAP-EP-101 | Post-arrest: coronary angiography appropriate use. Post-arrest with suspected ACS without coronary angiography | Arrest, ACS suspicion, angio procedure | D2, D7 | Non-PHI |
| T3 | GAP-EP-102 | Cardiac arrest: family genetic counseling gap. Young (age<40) cardiac arrest without family genetic evaluation | Age, arrest dx, genetic referral | D1, D2, D14, D17 | Non-PHI |

6.3 Structural Heart (88 gaps)
Aortic Stenosis (10 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-001 | Severe AS asymptomatic: heart team review (EARLY TAVR). AV Vmax>=4.0, MG>=40, or AVA<=1.0 asymptomatic - not referred | Discrete AV measures, symptom status, heart team referral | D8, D14 | Non-PHI |
| T1 | GAP-SH-002 | Severe AS symptomatic: AVR not referred. Severe AS + HF/syncope/angina - no AVR referral | AS measures, HF/syncope/angina dx, referral | D2, D8, D14 | Non-PHI |
| T1 | GAP-SH-003 | LFLG AS: dobutamine stress echo not performed. LVEF<50 + AVA<1.0 + MG<40 without DSE | LVEF, AVA, MG, DSE procedure | D7, D8 | Non-PHI |
| T1 | GAP-SH-006 | Class IIa severe AS triggers: LVEF<55 or abnormal stress. Asymptomatic severe AS + LVEF<55% or abnormal stress | AS severity, LVEF, stress test | D7, D8 | Non-PHI |
| T2 | GAP-SH-004 | Paradoxical LFLG AS detection. Normal EF + AVA<1.0 + MG<40 + SVi<35 mL/m2 | EF, AVA, MG, stroke volume index | D8 | Non-PHI |
| T2 | GAP-SH-005 | Moderate AS with rapid progression. Moderate AS + annual Vmax increase >0.3 m/s | Serial Vmax with dates | D8 | Non-PHI |
| T2 | GAP-SH-007 | Severe AS + LV dimensional changes. Severe AS + LVESD increase on serial echo | AS severity, serial LVESD | D8 | Non-PHI |
| T2 | GAP-SH-048 | Severe AS + CAD: staged PCI vs combined revasc strategy. Severe AS + CAD needing revasc without staged strategy plan | AS, CAD dx, PCI/CABG procedure | D2, D7, D8 | Non-PHI |
| T2 | GAP-SH-049 | Heyde syndrome workup in severe AS + GIB. Severe AS + unexplained GI bleeding without vWF multimer workup | AS, GIB dx, vWF testing | D2, D5, D8 | Non-PHI |
| T2 | GAP-SH-050 | AS severity grading: moderate-severe classification gap. Intermediate values without annular sizing or CT-derived AVA clarification | AVA, MG, Vmax, CT annular measurements | D7, D8 | Non-PHI |

BAV/Aortopathy (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-051 | Marfan syndrome surveillance interval. Marfan dx without annual echo + MRI | Marfan dx, surveillance imaging | D2, D7, D8 | Non-PHI |
| T2 | GAP-SH-052 | Marfan: beta-blocker or ARB prophylaxis. Marfan aortic dilation without BB or ARB | Marfan dx, BB/ARB | D2, D3 | Non-PHI |
| T2 | GAP-SH-053 | Loeys-Dietz: lower intervention threshold gap. LDS dx + aorta>=4.0 cm (root) without surgical eval | LDS dx, aortic dim, referral | D2, D7, D8, D14 | Non-PHI |
| T2 | GAP-SH-054 | Turner syndrome: cardiac surveillance gap. Turner (Q96.x) without annual echo + MRI protocol | Turner dx, surveillance imaging | D2, D7, D8 | Non-PHI |
| T2 | GAP-SH-055 | Vascular Ehlers-Danlos: celiprolol + surveillance. vEDS dx without celiprolol + comprehensive vascular surveillance | EDS dx, celiprolol, imaging | D2, D3, D7, D8 | Non-PHI |
| T3 | GAP-SH-008 | Bicuspid AV surveillance gap. Q23.0 BAV without annual echo | BAV dx, echo dates | D2, D8 | Non-PHI |
| T3 | GAP-SH-009 | BAV aortopathy: ascending aorta surveillance. BAV + ascending aorta>=4.0 cm without CT/MRI | BAV, ascending dim, CT/MRI | D7, D8 | Non-PHI |
| T3 | GAP-SH-010 | BAV aortopathy intervention threshold. BAV + ascending aorta>=5.0 cm - intervention consideration | BAV, aortic dim | D8 | Non-PHI |
| T3 | GAP-SH-056 | Familial TAA: first-degree relative screening. TAA proband without FDR screening initiated | TAA dx, family referral | D2, D7, D14, D17 | Non-PHI |

TAVR Post-op (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-061 | ViV TAVR for failed surgical bioprosthesis. Failed SAVR bioprosthetic with SVD without ViV-TAVR vs redo surgery discussion | Prior SAVR, SVD signs, ViV TAVR | D7, D8 | Non-PHI |
| T2 | GAP-SH-012 | Prosthetic valve structural deterioration. TAVR or SAVR with mean gradient rise>=10 mmHg from baseline | Valve CPT, serial gradients | D7, D8 | Non-PHI |
| T2 | GAP-SH-013 | Post-TAVR paravalvular leak moderate+. TAVR follow-up echo showing moderate or severe PVL | TAVR, PVL grade | D7, D8 | Non-PHI |
| T2 | GAP-SH-057 | Post-TAVR conduction: new LBBB follow-up. Post-TAVR new LBBB without 30d Holter or loop recorder | TAVR date, ECG morphology, monitor | D7, D9, D10 | Non-PHI |
| T2 | GAP-SH-058 | Post-TAVR subclinical leaflet thrombosis (HALT) surveillance. Post-TAVR without CT for HALT at 30d-1y per risk | TAVR, CT imaging, HALT assessment | D7 | Non-PHI |
| T2 | GAP-SH-059 | Post-TAVR antithrombotic regimen review. Post-TAVR on DAPT >3-6 mo without reassessment | TAVR date, antithrombotic sequence | D3, D7 | Non-PHI |
| T2 | GAP-SH-060 | Post-TAVR permanent pacemaker need: monitoring pathway. Post-TAVR conduction disease without pacing decision documented | TAVR, ECG, device | D7, D9, D10 | Non-PHI |
| T2 | GAP-SH-062 | Prosthesis-patient mismatch detection (iEOA<0.65 cm2/m2). Post-AVR with severe PPM without documentation | AVR, valve size, BSA, iEOA calc | D1, D7, D8 | Non-PHI |
| T3 | GAP-SH-011 | Post-TAVR surveillance echo gap (annual). TAVR without echo in past 12 months | TAVR CPT, echo dates | D7, D8 | Non-PHI |

Mitral Regurg (10 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-014 | Severe primary MR: surgical referral. I34.0 + EROA>=0.4 or RV>=60 - no MV referral | Primary MR dx, EROA/VC/RV, referral | D2, D8, D14 | Non-PHI |
| T1 | GAP-SH-015 | Asymptomatic severe MR with LVEF 30-60 or LVESD>=40. Severe primary MR + LVEF 30-60 or LVESD>=40 without referral | MR severity, LVEF, LVESD | D8, D14 | Non-PHI |
| T1 | GAP-SH-018 | COAPT-eligible FMR not referred for TEER. EF 20-50, LVESD<=70, EROA>=0.3, on GDMT, functional MR | LVEF, LVESD, EROA, MR type, GDMT | D2, D3, D8, D14 | Non-PHI |
| T1 | GAP-SH-019 | Moderate-severe FMR (RESHAPE-HF2): heart team. FMR mod-severe + HF symptoms without heart team review | FMR severity, HF dx, heart team referral | D2, D8, D14 | Non-PHI |
| T2 | GAP-SH-016 | Severe primary MR + new AF: surgical IIa. Severe primary MR + new AF - surgical consideration | MR severity, AF dx | D2, D8 | Non-PHI |
| T2 | GAP-SH-017 | Severe primary MR + PASP>50: surgical IIa. Severe primary MR + elevated PASP - surgical consideration | MR severity, PASP | D8 | Non-PHI |
| T2 | GAP-SH-063 | MV repair rate benchmarking gap. Surgical MR patient at non-reference center where repair rate unclear | MV surgery type, facility | D7, D13 | Non-PHI |
| T2 | GAP-SH-064 | Transcatheter MVR (Tendyne/Intrepid) candidate for non-TEER anatomy. Severe MR ineligible for TEER without TMVR evaluation | MR dx, TEER eligibility, TMVR referral | D2, D7, D8 | Non-PHI |
| T2 | GAP-SH-065 | Post-TEER surveillance echo gap. TEER without echo in past 12 months | TEER CPT, echo dates | D7, D8 | Non-PHI |
| T2 | GAP-SH-066 | Recurrent MR after TEER: redo TEER vs surgery. Post-TEER recurrent significant MR without reassessment | TEER, serial MR grade | D7, D8 | Non-PHI |

Mitral Stenosis (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-020 | Mitral stenosis severity grading gap. I34.2 or I05.0 MS without MVA and mean gradient documented | MS dx, MVA, mean gradient | D2, D8 | Non-PHI |
| T2 | GAP-SH-021 | Severe MS: intervention evaluation. MVA<=1.5 symptomatic without intervention referral | MS severity, symptoms, referral | D2, D8, D14 | Non-PHI |
| T2 | GAP-SH-067 | Rheumatic MS + Wilkins score for PMBC eligibility. Rheumatic MS without Wilkins/anatomical scoring for PMBC | Rheumatic MS dx, TEE valve assessment | D2, D8 | Non-PHI |
| T2 | GAP-SH-068 | Rheumatic heart disease: secondary prophylaxis. Rheumatic heart disease without benzathine PCN prophylaxis | Rheumatic dx, BPG med | D2, D3 | Non-PHI |

Tricuspid (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-022 | Severe TR: transcatheter evaluation gap. Severe or torrential TR + NYHA II+ on diuretics without T-TEER/TTVR referral | TR severity, NYHA proxy, referral | D2, D3, D8, D14 | Non-PHI |
| T2 | GAP-SH-069 | Evoque TTVR candidacy (TRISCEND). Severe TR ineligible for T-TEER without Evoque TTVR eval | TR dx, device selection | D7, D8 | Non-PHI |
| T2 | GAP-SH-070 | Isolated tricuspid surgery outcomes benchmarking. Isolated tricuspid surgery referral at non-reference center | TR, surgery type, facility | D7, D13 | Non-PHI |
| T2 | GAP-SH-071 | CIED-related TR: lead extraction evaluation. Severe TR attributed to CIED lead without lead assessment | TR severity, lead imaging, extraction | D8, D10 | Non-PHI |
| T3 | GAP-SH-023 | TR device selection: coaptation gap + lead status. Severe TR + coaptation gap + RV lead assessment | TR measures, lead presence | D8, D10 | Non-PHI |
| T3 | GAP-SH-024 | RV dysfunction in TR (TAPSE<17 or FAC<35). TR + RV dysfunction requiring surveillance | TR severity, TAPSE, FAC | D8 | Non-PHI |

Aortic Disease (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-075 | Aortic dissection type B complicated: TEVAR evaluation. Type B dissection + malperfusion/expansion without TEVAR eval | Dissection dx, complication signs, TEVAR | D2, D7 | Non-PHI |
| T2 | GAP-SH-072 | Ascending aorta intervention threshold >=5.5 cm. Ascending aneurysm >=5.5 cm without surgical eval | Aortic dim, referral | D7, D14 | Non-PHI |
| T2 | GAP-SH-073 | Descending/thoracoabdominal aneurysm >=5.5-6.0 cm: intervention. Descending aneurysm threshold without TEVAR/open repair eval | Aortic dim, TEVAR referral | D7, D14 | Non-PHI |
| T2 | GAP-SH-074 | Aortic dissection type B uncomplicated: optimal medical therapy. Type B dissection without impulse control BB + ARB + statin | Dissection dx, med list | D2, D3 | Non-PHI |
| T2 | GAP-SH-077 | Aortic intramural hematoma (IMH): management pathway. IMH dx without type-specific management documented | IMH dx, imaging, med/surgical strategy | D2, D3, D7 | Non-PHI |
| T3 | GAP-SH-025 | Ascending aortic aneurysm surveillance by size. Aneurysm 4.0-4.9 annual; 5.0-5.4 q6mo; not imaged | Aortic dim, imaging dates | D7, D8 | Non-PHI |
| T3 | GAP-SH-076 | Aortic dissection survivor: long-term surveillance. Prior dissection without imaging 1m, 3m, 6m, 12m, then annual | Dissection history, imaging schedule | D2, D7 | Non-PHI |
| T3 | GAP-SH-078 | Penetrating atherosclerotic ulcer (PAU): surveillance/intervention. PAU without serial imaging or intervention plan | PAU dx, imaging, intervention | D2, D7 | Non-PHI |
| T3 | GAP-SH-079 | Aortitis workup (Takayasu, GCA, infectious). Aortitis imaging findings without workup | Aortitis imaging, serologies | D5, D7 | Non-PHI |

PFO/ASD (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-026 | PFO + cryptogenic stroke age<60: closure evaluation. Cryptogenic stroke age<60 with PFO without closure discussion | Stroke dx, age, PFO, closure referral | D1, D2, D14 | Non-PHI |
| T2 | GAP-SH-027 | ASD significant shunt: intervention evaluation. ASD with RV dilation or PASP elevation without closure eval | ASD dx, RV size, PASP, closure | D7, D8 | Non-PHI |
| T2 | GAP-SH-080 | PFO closure candidacy: RoPE score. Cryptogenic stroke + PFO without RoPE score documented | Stroke, PFO, RoPE components | D1, D2, D6 | Non-PHI |
| T2 | GAP-SH-082 | Post-ASD/PFO closure: antithrombotic regimen. Post-closure device without antithrombotic plan | Closure procedure, antithrombotic | D3, D7 | Non-PHI |
| T2 | GAP-SH-083 | Residual shunt post-closure: surveillance. Post-closure with residual shunt without echo surveillance | Closure history, residual on echo | D7, D8 | Non-PHI |
| T3 | GAP-SH-081 | Sinus venosus ASD identification. RA dilation + pulmonary vein anomaly on imaging without SV ASD dx | Echo/CT findings | D7, D8 | Non-PHI |

Pulmonary HTN (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-084 | PH Group 1 (PAH) diagnostic confirmation gap. Elevated PASP without right heart cath for PAH diagnosis | PASP, RHC procedure | D7, D8, D23 | Non-PHI |
| T2 | GAP-SH-085 | PH Group 2 (left-heart related): proper classification. Elevated PASP + left-heart disease without mPAP-PCWP analysis | PASP, PCWP, mPAP from RHC | D8, D23 | Non-PHI |
| T2 | GAP-SH-086 | PH Group 3 (lung disease): workup sequence. Elevated PASP + lung disease without PFT/CT chest | PASP, lung dx, PFT, CT | D5, D7 | Non-PHI |
| T2 | GAP-SH-087 | PH Group 4 (CTEPH): V/Q scan gap. PH workup without V/Q to rule out CTEPH | PH, V/Q procedure | D7 | Non-PHI |
| T3 | GAP-SH-088 | PH Group 5 miscellaneous: etiology documentation. PH without clear WHO group classification documented | PH dx, workup | D2, D7 | Non-PHI |

Pulmonary Embolism (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-SH-090 | Intermediate-high risk PE: catheter-directed thrombolysis eval. Submassive PE (RV strain or troponin elevation) without CDT discussion | PE dx, RV size, troponin, CDT procedure | D2, D5, D7, D8 | Non-PHI |
| T1 | GAP-SH-091 | High-risk (massive) PE: systemic lysis or surgical embolectomy. Massive PE (hemodynamic instability) without systemic lysis, surgical embolectomy, or ECMO | PE dx, hemodynamic data, intervention | D2, D3, D6, D7 | Non-PHI |
| T2 | GAP-SH-089 | PE PESI/sPESI risk stratification not documented. PE dx without PESI/sPESI scoring | PE dx, PESI components | D2, D6 | Non-PHI |
| T2 | GAP-SH-092 | Post-PE: CTEPH surveillance at 3-6 mo. PE + persistent symptoms at 3-6mo without CTEPH workup | PE history, symptoms, V/Q | D2, D7 | Non-PHI |
| T2 | GAP-SH-093 | IVC filter retrieval gap. Retrievable IVC filter placed >3-6 mo without retrieval planning | Filter placement date, retrieval | D7 | Non-PHI |

Infective Endocarditis (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-028 | Infective endocarditis: Duke criteria workup. Suspected IE without TEE + blood cultures x3 | IE suspected, TEE, blood cx | D5, D7, D8 | Non-PHI |
| T2 | GAP-SH-029 | IE: early surgery indications review. IE + HF or embolic or uncontrolled infection - surgery consideration | IE dx, HF, embolic, abx response | D2, D5, D7 | Non-PHI |
| T2 | GAP-SH-030 | S. aureus bacteremia: TEE evaluation. S. aureus BSI without TEE | BSI culture, TEE procedure | D5, D7 | Non-PHI |

ACHD (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-094 | Coarctation adult: repair vs surveillance gap. Unrepaired or repaired coarctation without annual BP upper/lower gradient | Coarct dx, BP 4 extremity, imaging | D2, D6, D7 | Non-PHI |
| T2 | GAP-SH-096 | Tetralogy of Fallot adult: pulmonary valve replacement eval. TOF repair + RV dilation/dysfunction without PVR eval | TOF history, RV size, PVR referral | D2, D7, D8, D14 | Non-PHI |
| T2 | GAP-SH-097 | Systemic RV (ccTGA, post-Senning/Mustard): surveillance. Systemic RV anatomy without dedicated ACHD center f/u | ACHD dx, specialist encounter | D2, D11 | Non-PHI |
| T2 | GAP-SH-099 | Ebstein anomaly: arrhythmia surveillance. Ebstein without annual rhythm monitoring | Ebstein dx, monitor/ECG | D2, D9, D10 | Non-PHI |
| T2 | GAP-SH-100 | ACHD transition of care: pediatric to adult. Age>=18 congenital heart patient without adult cardiology transition | Age, CHD dx, adult cardio encounter | D1, D2, D11 | Non-PHI |
| T2 | GAP-SH-101 | Eisenmenger physiology: PAH-specific therapy eval. Unrepaired CHD + Eisenmenger without PAH therapy evaluation | CHD, Eisenmenger dx, PAH meds | D2, D3 | Non-PHI |
| T3 | GAP-SH-095 | Post-coarctation repair: re-coarctation surveillance. Post-coarctation repair without serial imaging | Coarct repair history, imaging | D2, D7 | Non-PHI |
| T3 | GAP-SH-098 | Fontan physiology: liver surveillance gap. Fontan circulation without liver imaging + labs | Fontan history, liver imaging, LFTs | D2, D5, D7 | Non-PHI |

Cardiac Masses (2 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-SH-102 | Cardiac mass on echo without CMR characterization. Incidental mass on echo without CMR or contrast imaging | Echo mass finding, CMR history | D7, D8 | Non-PHI |
| T3 | GAP-SH-103 | Atrial myxoma: surgical referral gap. Atrial myxoma dx without surgical referral | Myxoma dx, referral, surgery | D2, D7, D14 | Non-PHI |

HCM Interventions (2 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-SH-104 | Septal alcohol ablation: post-procedure conduction surveillance. ASA procedure without post-procedure telemetry + ECG f/u | ASA procedure, telemetry, ECG | D7, D9 | Non-PHI |
| T2 | GAP-SH-105 | Surgical myectomy vs alcohol ablation: decision docs. HCM SRT candidate without documented decision rationale | HCM SRT eligibility, procedure choice | D2, D7 | Non-PHI |

6.4 Coronary Artery Disease (90 gaps)
Lipid Management (13 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-001 | ASCVD: Statin not prescribed. I25.x, I21.x, I63.x, I70.x, Z95.x without any statin | ASCVD dx list, med list | D2, D3 | Non-PHI |
| T1 | GAP-CAD-002 | Post-ACS: High-intensity statin gap. I21.x within 12 mo not on atorva 40-80 or rosuva 20-40 | ACS dx date, statin type/dose | D2, D3 | Non-PHI |
| T1 | GAP-CAD-003 | LDL not at goal <70: add ezetimibe. ASCVD + LDL>=70 on max statin, no ezetimibe | ASCVD, LDL, statin dose, ezetimibe | D2, D3, D5 | Non-PHI |
| T1 | GAP-CAD-004 | LDL still not at goal: PCSK9i/inclisiran. ASCVD + LDL>=70 on statin + ezetimibe | ASCVD, LDL, statin+ezetimibe, PCSK9i | D2, D3, D5 | Non-PHI |
| T1 | GAP-CAD-005 | LDL<55 extreme risk not achieved. Polyvascular or recurrent + LDL>=55 despite max | Polyvasc pattern, LDL, meds | D2, D3, D5 | Non-PHI |
| T1 | GAP-CAD-056 | Statin prescribed but not filled (primary non-adherence). Statin e-Rx with zero fills in pharmacy claims | Statin Rx vs fill data | D3, D21 | Non-PHI |
| T1 | GAP-CAD-057 | Statin chronic adherence PDC<80%. Chronic statin with PDC<80% in past 12mo | Pharmacy fill data | D21 | Non-PHI |
| T2 | GAP-CAD-006 | Statin intolerance: bempedoic acid. Documented statin intolerance + LDL elevated without bempedoic acid | Statin allergy/intolerance, LDL, bempedoic | D3, D5, D15 | Non-PHI |
| T2 | GAP-CAD-007 | LDL not measured in secondary prevention (12mo). ASCVD without LDL in past 12 months | ASCVD, LDL dates | D2, D5 | Non-PHI |
| T2 | GAP-CAD-008 | Lp(a) never measured in ASCVD. ASCVD without ever-measured Lp(a) | ASCVD, Lp(a) history | D2, D5 | Non-PHI |
| T2 | GAP-CAD-058 | PCSK9i prior auth gap / cost barrier. PCSK9i prescribed + not filled due to PA/cost | PCSK9i Rx, fill status, denial codes | D3, D21 | Non-PHI |
| T3 | GAP-CAD-009 | ApoB not measured for risk refinement. ASCVD or FH suspected without ApoB | ASCVD/FH, ApoB | D2, D5 | Non-PHI |
| T3 | GAP-CAD-010 | hs-CRP not measured (residual inflammatory risk). ASCVD without hs-CRP | ASCVD, hs-CRP | D2, D5 | Non-PHI |

Primary Prevention (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-011 | Primary prevention statin gap (PREVENT risk>=7.5). Age 40-75 + PREVENT risk>=7.5 without statin | Age, risk components, statin | D1, D2, D3, D5, D6 | Non-PHI |
| T1 | GAP-CAD-012 | Diabetes primary prevention statin. E11.x age>=40 without statin | DM, age, statin | D1, D2, D3 | Non-PHI |
| T1 | GAP-CAD-014 | Icosapent ethyl eligible. ASCVD + TG 150-499 + statin without icosapent | ASCVD, TG, statin, icosapent | D2, D3, D5 | Non-PHI |
| T3 | GAP-CAD-013 | Familial hypercholesterolemia screening (LDL>=190). LDL>=190 without FH evaluation/genetic testing | LDL, FH dx, genetic testing | D2, D5, D7 | Non-PHI |
| T3 | GAP-CAD-059 | CAC score for intermediate-risk primary prevention. Borderline/intermediate ASCVD risk without CAC score | PREVENT components, CAC procedure | D5, D6, D7 | Non-PHI |
| T3 | GAP-CAD-060 | Polygenic risk score + CAC integration. Premature CAD family history without CAC + risk recalibration | FHx premature CAD, CAC, risk calc | D17, D7 | Non-PHI |

DAPT (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-015 | Post-ACS DAPT: clopidogrel vs prasugrel/ticagrelor. Post-ACS on clopidogrel without contraindication to pras/tica | ACS date, P2Y12i type | D2, D3 | Non-PHI |
| T1 | GAP-CAD-016 | Prasugrel + prior stroke/TIA (SAFETY). Prasugrel + stroke/TIA history | Stroke/TIA, prasugrel | D2, D3 | Non-PHI |
| T2 | GAP-CAD-018 | Post-PCI DAPT duration review. PCI date vs P2Y12i duration appropriateness | PCI date, P2Y12i | D3, D7 | Non-PHI |
| T2 | GAP-CAD-061 | DAPT de-escalation post-PCI (TWILIGHT/TICO). Post-PCI 1-3 mo + low ischemic risk without ticagrelor monotherapy eval | PCI date, risk strata, P2Y12 sequence | D2, D3, D7 | Non-PHI |
| T2 | GAP-CAD-062 | Triple therapy AF+PCI: duration minimization (AUGUSTUS). AF+recent PCI on OAC+DAPT beyond 1-6 mo | AF, PCI, OAC, DAPT | D2, D3, D7 | Non-PHI |
| T3 | GAP-CAD-017 | Prasugrel age>75 or weight<60 (not recommended). Prasugrel in elderly/low-weight | Age, weight, prasugrel | D1, D3, D6 | Non-PHI |
| T3 | GAP-CAD-019 | High bleeding risk: DAPT shortening (PRECISE-DAPT>=25). PRECISE-DAPT>=25 on extended DAPT | Bleed risk components, DAPT duration | D3, D5, D7 | Non-PHI |

Post-ACS Therapies (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-020 | Post-ACS: beta-blocker gap. Post-ACS without BB unless contraindicated | ACS dx, BB | D2, D3 | Non-PHI |
| T2 | GAP-CAD-021 | Post-ACS: ACEi/ARB gap. Post-ACS + LVEF<40 or DM/CKD/HTN without ACEi/ARB | ACS, LVEF, comorbid, med | D2, D3, D8 | Non-PHI |
| T2 | GAP-CAD-022 | Post-MI: ICD evaluation at day 40. Post-MI LVEF<=35 at >=40 days without ICD consideration | MI date, LVEF, device | D2, D8, D10 | Non-PHI |
| T2 | GAP-CAD-023 | Post-ACS colchicine gap (LoDoCo2). Post-ACS without colchicine considered | ACS dx, colchicine | D2, D3 | Non-PHI |
| T2 | GAP-CAD-024 | Post-MI SGLT2i gap (EMPACT-MI/DAPA-MI). Post-MI without SGLT2i even without diabetes | MI, SGLT2i, eGFR | D2, D3, D5 | Non-PHI |
| T2 | GAP-CAD-025 | Post-ACS smoking cessation pharmacotherapy gap. Post-ACS + active smoker without cessation meds | ACS, smoking status, cessation meds | D2, D3, D16 | Non-PHI |

STEMI/ACS Timing (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-063 | STEMI door-to-balloon >90 min. STEMI first medical contact to PCI >90 min | STEMI timing, PCI time | D7, D11 | Non-PHI |
| T1 | GAP-CAD-065 | NSTEMI early invasive strategy (GRACE>=140). NSTEMI + GRACE>=140 without angio within 24h | NSTEMI, GRACE components, angio timing | D2, D5, D6, D7 | Non-PHI |
| T2 | GAP-CAD-064 | STEMI transfer D2B >120 min. STEMI transfer to PCI center >120 min from first contact | Transfer pattern, PCI time | D7, D11, D19 | Non-PHI |
| T2 | GAP-CAD-066 | NSTEMI delayed strategy for GRACE<140: timing window. NSTEMI low-intermediate risk + angio beyond 72h | NSTEMI, angio timing | D7 | Non-PHI |
| T2 | GAP-CAD-067 | Unstable angina vs NSTEMI classification gap. Suspected ACS without troponin trend to differentiate | Suspected ACS, troponin series | D5 | Non-PHI |

Polyvascular (2 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-026 | Polyvascular disease: intensified regimen. CAD + PAD + carotid/cerebrovasc - intensification pattern | CAD, PAD, carotid/stroke dx | D2 | Non-PHI |
| T2 | GAP-CAD-027 | Polyvascular: COMPASS dual pathway. Polyvascular pattern without rivaroxaban 2.5 + ASA considered | Polyvasc, med list | D2, D3 | Non-PHI |

Post-CABG (2 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-028 | Post-CABG: statin + BB + ASA gap. CABG history without statin/BB/ASA all three | CABG procedure, med list | D2, D3, D7 | Non-PHI |
| T2 | GAP-CAD-029 | Post-CABG: cardiac rehab referral. CABG without cardiac rehab referral | CABG, rehab referral (CPT 93798) | D7, D14 | Non-PHI |

Chronic CAD (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-030 | Chronic CAD: 2024 ACC appropriateness review. I25.10 + persistent angina on max GDMT without invasive eval | CAD dx, angina, med list, cath history | D2, D3, D7 | Non-PHI |
| T2 | GAP-CAD-031 | ISCHEMIA trial-eligible pattern: OMT-first confirmation. Stable CAD + positive stress + planned PCI without OMT trial docs | Stable CAD, stress test, med list, PCI planning | D2, D3, D7 | Non-PHI |
| T2 | GAP-CAD-032 | Stable angina: anti-anginal optimization. Stable angina on monotherapy (BB alone) without additional anti-anginal | Angina, anti-anginal meds | D2, D3 | Non-PHI |
| T2 | GAP-CAD-033 | Ranolazine candidate (refractory angina on 2 agents). Refractory angina on 2 anti-anginals without ranolazine trial | Angina, anti-anginal count, ranolazine | D2, D3 | Non-PHI |

MINOCA/INOCA (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-034 | MINOCA workup: CMR not obtained. MI with non-obstructive CAD without CMR | MI dx, coronary findings, CMR | D2, D7, D8 | Non-PHI |
| T2 | GAP-CAD-035 | MINOCA: IVUS/OCT for plaque disruption. MINOCA without intracoronary imaging to rule out plaque disruption | MINOCA, intracor imaging | D7 | Non-PHI |
| T2 | GAP-CAD-036 | INOCA: coronary function testing (CFR/IMR). Stable angina + nonobstructive CAD without CFR/IMR or provocation | Angina, coronary functional testing | D7 | Non-PHI |
| T2 | GAP-CAD-037 | Vasospastic angina: provocation testing gap. Angina pattern suggesting vasospasm without acetylcholine provocation | Angina pattern, provocation procedure | D2, D7 | Non-PHI |
| T2 | GAP-CAD-038 | Microvascular angina: CCB + nitrate + nicorandil strategy. Confirmed microvascular angina without stepwise therapy | Microvascular angina, anti-anginal escalation | D2, D3 | Non-PHI |

Intracoronary Imaging (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-068 | Borderline lesion: FFR/iFR not measured. Intermediate angiographic stenosis without FFR/iFR before PCI | Angio findings, FFR/iFR procedure | D7 | Non-PHI |
| T2 | GAP-CAD-069 | Complex PCI without IVUS/OCT guidance. LM or ostial or bifurcation or CTO without intracor imaging | Complex PCI type, IVUS/OCT | D7 | Non-PHI |
| T2 | GAP-CAD-070 | Stent sizing by IVUS: underexpansion risk. Calcified lesion PCI without IVUS + strategy for expansion | PCI calcium score, IVUS, IVL/atherectomy | D7 | Non-PHI |

Complex PCI (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-071 | LM disease: heart team review (SYNTAX II). Left main disease without heart team documented decision | LM disease, heart team referral | D7, D8, D14 | Non-PHI |
| T2 | GAP-CAD-072 | CTO PCI candidate: operator/center expertise match. CTO PCI referral to high-volume center | CTO, facility volume | D7, D13 | Non-PHI |
| T2 | GAP-CAD-073 | Calcified lesion: rotational atherectomy/IVL consideration. Calcified lesion without atherectomy or IVL adjunct | PCI calcium, atherectomy/IVL procedure | D7 | Non-PHI |
| T2 | GAP-CAD-074 | Bifurcation PCI strategy: provisional vs 2-stent. Bifurcation lesion without strategy documentation | Bifurcation, PCI technique | D7 | Non-PHI |

Stent Complications (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-075 | Acute stent thrombosis: emergent repeat intervention. Post-PCI chest pain + ST changes within 24h without repeat angio | PCI date, ST recurrence, angio | D2, D7, D9 | Non-PHI |
| T2 | GAP-CAD-076 | Subacute stent thrombosis: DAPT compliance review. Stent thrombosis 1-30d post-PCI + DAPT adherence review | PCI, ST, DAPT fill data | D3, D7, D21 | Non-PHI |
| T3 | GAP-CAD-039 | In-stent restenosis: DCB consideration. ISR without drug-coated balloon consideration | ISR dx, DCB procedure | D2, D7 | Non-PHI |

Cardiogenic Shock (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-042 | DanGer Shock pattern - Impella in AMI-CS. STEMI + cardiogenic shock + no Impella placed | STEMI, shock (R57.0), Impella | D2, D7 | Non-PHI |
| T1 | GAP-CAD-043 | MCS escalation from IABP in ongoing shock. Cardiogenic shock on IABP without Impella/ECMO escalation | Shock, IABP, subsequent MCS | D2, D7 | Non-PHI |
| T2 | GAP-CAD-040 | SCAI stage C shock + IABP only: Impella escalation. SCAI C + IABP placed without Impella escalation within 6h | Shock dx, IABP, Impella timing | D2, D7 | Non-PHI |
| T2 | GAP-CAD-041 | SCAI stage D: ECMO evaluation. Refractory shock without VA-ECMO evaluation | Shock severity, ECMO procedure | D2, D7 | Non-PHI |
| T2 | GAP-CAD-077 | SCAI Stage B pre-shock identification. SBP<90 + tachycardia + near-shock state pattern without close monitoring | SBP, HR, lactate, escalation flag | D5, D6 | Non-PHI |
| T2 | GAP-CAD-078 | Shock team activation documentation. Cardiogenic shock without multidisciplinary shock team involvement | Shock dx, team consult notes | D2, D11, D14 | Non-PHI |

Adjunctive (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-044 | Post-MI SSRI consideration for depression (ENRICHD pattern). Post-MI PHQ-9 positive without SSRI trial | MI, PHQ, med list | D2, D3, D6 | Non-PHI |
| T2 | GAP-CAD-045 | Post-MI influenza vaccination gap. Post-MI without influenza vaccine current season | MI, flu vaccine | D2, D18 | Non-PHI |
| T2 | GAP-CAD-046 | Post-MI cardiac rehab referral + enrollment. Post-ACS discharge without cardiac rehab referral | ACS, rehab referral (CPT 93798) | D2, D14 | Non-PHI |
| T3 | GAP-CAD-079 | ICD patient + drive/employment counseling. Post-ICD without return-to-drive documentation | ICD, counsel flowsheet | D6, D10 | Non-PHI |
| T3 | GAP-CAD-080 | Post-ACS sexual activity counseling. Post-ACS at f/u without sexual activity discussion documented | ACS f/u, counsel flowsheet | D2, D6, D11 | Non-PHI |

Special Etiologies (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CAD-081 | SCAD (Spontaneous Coronary Artery Dissection) in young woman. ACS + age<60 female + nonobstructive CAD without SCAD suspicion/FMD workup | Age, sex, ACS, SCAD dx consideration | D1, D2, D7 | Non-PHI |
| T2 | GAP-CAD-082 | Post-SCAD: beta-blocker + FMD screening. SCAD dx without BB or extracoronary FMD imaging | SCAD, BB, FMD screening (renal/carotid) | D2, D3, D7 | Non-PHI |
| T3 | GAP-CAD-083 | Radiation-induced CAD: proximal LAD/LM focus. Prior chest radiation + CAD without dedicated follow-up | Radiation hx, CAD dx | D2, D7 | Non-PHI |
| T3 | GAP-CAD-084 | Coronary vasculitis workup (Kawasaki, Takayasu). CAD in young age + systemic inflammatory features without vasculitis workup | Age, CAD, inflammatory markers | D1, D2, D5 | Non-PHI |
| T3 | GAP-CAD-085 | Cocaine/methamphetamine-induced CAD/CM. Substance use + cardiac dx without substance cessation referral | Substance use dx, cardiac dx, cessation | D2, D14, D16 | Non-PHI |
| T3 | GAP-CAD-086 | Myocardial bridging symptomatic: workup. Imaging bridging + angina pattern without provocation + strategy | Bridging imaging, angina, workup | D2, D7 | Non-PHI |
| T3 | GAP-CAD-087 | Cardiac allograft vasculopathy surveillance. Heart transplant without annual IVUS or angio | Transplant, annual imaging | D2, D7 | Non-PHI |
| T3 | GAP-CAD-088 | Chest radiation valve + coronary combined management. Prior radiation + dual valve/coronary disease without integrated strategy | Radiation, valve + coronary dx | D2, D7, D8 | Non-PHI |

Cardiac Imaging (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-047 | CCTA for intermediate chest pain. Low-intermediate pretest probability chest pain without CCTA | Chest pain dx, CCTA procedure | D2, D7 | Non-PHI |
| T2 | GAP-CAD-048 | Stress imaging modality mismatch. Inability to exercise routed to treadmill instead of pharm stress | Exercise capacity, stress modality | D6, D7 | Non-PHI |
| T3 | GAP-CAD-089 | Appropriate use: repeat stress testing overuse. Serial stress tests in stable patient without guideline-supported indication | Stress procedure count | D7 | Non-PHI |

Peri-procedure (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-049 | Pre-op cardiac risk assessment not documented. Non-cardiac surgery at high risk without RCRI/NSQIP calculation | Surgery type, RCRI components | D2, D5, D6, D7 | Non-PHI |
| T2 | GAP-CAD-050 | Pre-op beta-blocker decision documentation. High-risk surgery + no BB on board without decision documented | Surgery risk, BB, pre-op encounter | D3, D7 | Non-PHI |
| T2 | GAP-CAD-051 | Post-PCI non-cardiac surgery timing. Recent PCI (within 30d BMS/180d DES) + non-cardiac surgery without delay rationale | PCI date, subsequent surgery | D7 | Non-PHI |
| T2 | GAP-CAD-090 | Post-arrest TTM with subsequent coronary angio. Post-arrest + TTM without coronary angio appropriateness documented | Arrest, TTM, angio | D2, D7 | Non-PHI |

Post-procedure (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CAD-052 | Pre-PCI contrast-induced nephropathy risk + pre-hydration. PCI + eGFR<45 without pre-hydration documented | eGFR, PCI, hydration orders | D3, D5, D7 | Non-PHI |
| T2 | GAP-CAD-053 | Radial access: appropriate utilization. Elective PCI via femoral without radial feasibility documented | PCI access, facility pattern | D7 | Non-PHI |
| T2 | GAP-CAD-054 | Same-day discharge PCI: protocol adherence. Elective outpatient PCI without same-day discharge consideration | PCI type, discharge timing | D7, D11 | Non-PHI |
| T2 | GAP-CAD-055 | Post-CABG sternal wound surveillance. Post-CABG without follow-up wound eval at 2 weeks | CABG, follow-up encounter | D7, D11 | Non-PHI |

6.5 Valvular Heart Disease (Surgical) (105 gaps)
Mechanical Valve (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-VHD-001 | Mechanical valve + sub-therapeutic INR. Mechanical valve (Z95.2) + INR below target range at last check | Mech valve Z-code or history, INR target, INR value | D2, D5, D7 | Non-PHI |
| T1 | GAP-VHD-005 | Mechanical valve: DOAC prescribed (CRITICAL SAFETY). Mechanical valve + any DOAC on active med list | Mech valve, DOAC RxNorm | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-002 | Mechanical AVR INR target mismatch (non-On-X). Standard mechanical AVR on INR target 2.0-3.0 (should be 2.5-3.5 for most) | Valve model, INR target range | D3, D5, D7 | Non-PHI |
| T2 | GAP-VHD-003 | On-X mechanical AVR: eligible lower INR not adopted. On-X AVR >3mo post-op on INR 2.5-3.5 (eligible for 1.5-2.0 + ASA 81) | On-X valve model, operative date, INR target | D3, D5, D7 | Non-PHI |
| T2 | GAP-VHD-004 | Mechanical MVR INR target (2.5-3.5) not met. Mechanical MVR on INR target 2.0-3.0 | Valve position, INR target | D3, D5, D7 | Non-PHI |
| T2 | GAP-VHD-006 | Mechanical valve + ASA 81 adjunct gap. Mechanical valve without low-dose ASA adjunct when indicated | Mech valve, ASA med | D3, D7 | Non-PHI |
| T2 | GAP-VHD-007 | Mechanical valve bridging strategy for procedure. Mech valve + recent procedure without documented bridging plan | Mech valve, procedure date, LMWH/heparin orders | D3, D7 | Non-PHI |
| T2 | GAP-VHD-008 | Warfarin pharmacogenomics in unstable INR. Chronic warfarin + repeated TTR<65% without CYP2C9/VKORC1 testing discussed | Warfarin, INR TTR, pharmacogenomic result | D3, D5 | Non-PHI |
| T2 | GAP-VHD-009 | Home INR monitoring eligible but not offered. Mechanical valve on chronic warfarin without home INR option discussed | Mech valve, INR frequency, home monitor | D3, D5, D6 | Non-PHI |

Bioprosthetic Valve (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-010 | Bioprosthetic valve surveillance echo gap. Bioprosthetic valve (Z95.3) without annual echo | Bio valve, echo dates | D2, D7, D8 | Non-PHI |
| T2 | GAP-VHD-011 | Bioprosthetic structural valve deterioration (SVD) signs. Serial echo gradient rise >=10 mmHg or new PVL on bio valve | Serial gradients + PVL, valve type | D7, D8 | Non-PHI |
| T2 | GAP-VHD-012 | Post-TAVR HALT (subclinical leaflet thrombosis) detection. TAVR without 4D CT at 30d-1y to screen for HALT | TAVR date, CT cardiac | D7 | Non-PHI |
| T2 | GAP-VHD-013 | Post-TAVR HALT confirmed: anticoagulation consideration. HALT on imaging without short-course anticoagulation | HALT finding, anticoag | D3, D7 | Non-PHI |
| T2 | GAP-VHD-014 | Post-SAVR bioprosthetic: 3-6 month warfarin bridge gap. Recent surgical bio AVR without 3-6 mo post-op anticoagulation | Bio AVR date, anticoag | D3, D7 | Non-PHI |
| T2 | GAP-VHD-015 | Post-bioprosthetic MVR: 3-6 month warfarin gap. Recent bio MVR without 3-6 mo post-op warfarin | Bio MVR date, warfarin | D3, D7 | Non-PHI |
| T2 | GAP-VHD-016 | Bioprosthetic valve lifelong ASA gap. Bioprosthetic valve >6mo post-op without ASA 81 lifelong | Bio valve, ASA med | D3, D7 | Non-PHI |
| T2 | GAP-VHD-017 | Failed SAVR bioprosthesis: ViV-TAVR vs redo SAVR discussion. SVD of prior SAVR without heart team discussion | Prior SAVR, SVD, heart team referral | D7, D14 | Non-PHI |

Prosthesis Selection (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-018 | Prosthesis selection: age-based mismatch (mech in elderly). Primary AVR age>70 with mechanical valve without shared decision documented | Age, valve type, decision note | D1, D7 | Non-PHI |
| T2 | GAP-VHD-019 | Prosthesis selection: bio in young without shared decision. AVR age<50 with bioprosthetic without re-operation discussion documented | Age, valve type, decision note | D1, D7 | Non-PHI |
| T2 | GAP-VHD-020 | Heyde syndrome screening in severe AS + GIB. Severe AS + unexplained GIB without vWF multimer assessment | AS dx, GIB, vWF testing | D2, D5, D7 | Non-PHI |
| T2 | GAP-VHD-021 | Patient-prosthesis mismatch (PPM) detection iEOA<0.65. Post-AVR iEOA<0.65 cm2/m2 without PPM flagged | BSA, EOA, valve size, iEOA calc | D1, D7, D8 | Non-PHI |
| T2 | GAP-VHD-022 | Severe PPM (iEOA<0.55): management consideration. Severe PPM post-AVR without intervention consideration | iEOA, intervention | D7, D8 | Non-PHI |
| T3 | GAP-VHD-023 | Sutureless/rapid-deployment valve candidate eval. AVR + small root + bioprosthetic indicated without sutureless option eval | Small annulus, valve choice | D7, D8 | Non-PHI |

Surgical AVR (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-024 | Ross procedure candidate: young AVR patient eval. AVR candidate age<50 without Ross procedure discussion | Age, AVR candidacy, Ross eval | D1, D7, D14 | Non-PHI |
| T2 | GAP-VHD-026 | Valve-sparing root (David procedure) for aortic root disease. Aortic root disease + preserved leaflets without David procedure eval | Aortic root dilation, leaflet status, procedure | D7, D8 | Non-PHI |
| T2 | GAP-VHD-027 | Yacoub remodeling: anatomy-specific suitability. Aortic root surgery candidate without David vs Yacoub discussion | Root anatomy, procedure selection | D7 | Non-PHI |
| T2 | GAP-VHD-028 | Bentall procedure for root + valve disease. Root aneurysm + AV disease without composite graft (Bentall) eval | Root size, AV disease, procedure | D7, D8 | Non-PHI |
| T2 | GAP-VHD-029 | Stentless valve consideration in small root. Small root + AVR without stentless valve option considered | Annulus size, valve type | D7, D8 | Non-PHI |
| T3 | GAP-VHD-025 | Ozaki procedure (AV neocuspidization) consideration. AVR candidate with pericardial preservation option not discussed | AVR candidacy, Ozaki referral | D7, D14 | Non-PHI |

Surgical MVR (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-030 | MV repair rate gap: reference center referral. Primary MR surgical candidate at low-repair-rate center | MR dx, facility repair rate | D7, D13 | Non-PHI |
| T2 | GAP-VHD-031 | Robotic MVR candidacy not discussed. Isolated primary MV disease without minimally invasive/robotic option | MV disease, procedure approach | D7, D14 | Non-PHI |
| T2 | GAP-VHD-032 | MV repair vs replacement: repair feasibility documentation. MV replacement done without documented repair feasibility assessment | MV procedure, repair attempt note | D7 | Non-PHI |
| T2 | GAP-VHD-033 | Chordal preservation during MVR: technique documentation. MV replacement without chordal preservation documentation | MVR procedure, technique | D7 | Non-PHI |
| T2 | GAP-VHD-035 | MitraClip/TEER vs surgery: heart team decision. MR candidate without heart team documented device vs surgery decision | MR, heart team referral | D7, D14 | Non-PHI |
| T3 | GAP-VHD-034 | Alfieri edge-to-edge surgical repair for complex MR. Complex MV anatomy + incomplete repair without Alfieri stitch consideration | MR complexity, Alfieri technique | D7 | Non-PHI |
| T3 | GAP-VHD-036 | Post-MV surgery AF surveillance. Post-MV surgery without post-op monitoring for AF 30d | MV surgery, rhythm monitoring | D7, D9, D10 | Non-PHI |

Concomitant Procedures (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-037 | Concomitant Maze at valve surgery when AF present. Valve surgery + pre-op AF without concomitant Maze documented | Valve surgery, AF dx, Maze CPT | D2, D7 | Non-PHI |
| T2 | GAP-VHD-038 | LAA exclusion (AtriClip) at cardiac surgery with AF. Cardiac surgery + AF without LAA exclusion documented | Cardiac surgery, AF, AtriClip CPT | D2, D7 | Non-PHI |
| T2 | GAP-VHD-039 | Tricuspid annuloplasty with left-sided valve surgery. Left valve surgery + TR moderate or TA dilation without TV annuloplasty | Left valve surgery, TR grade, TA size, TV procedure | D7, D8 | Non-PHI |
| T2 | GAP-VHD-040 | Concomitant CABG at valve surgery with CAD. Valve surgery + CAD needing revasc without concomitant CABG | Valve surgery, CAD, CABG CPT | D2, D7 | Non-PHI |
| T2 | GAP-VHD-041 | Root enlargement for small annulus. Small annulus + standard AVR without root enlargement consideration | Annulus size, root enlargement technique | D7, D8 | Non-PHI |

IE General (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-042 | Duke criteria 2023 documentation gap. IE dx without Duke criteria components documented | IE dx, Duke components (blood cx, echo, predisposition) | D2, D5, D7 | Non-PHI |
| T2 | GAP-VHD-043 | IE suspected: TTE first before TEE appropriately. Suspected IE going directly to TEE without TTE | Suspected IE, TTE, TEE sequence | D7, D8 | Non-PHI |
| T2 | GAP-VHD-044 | IE with negative TTE: TEE gap. Suspected IE + negative TTE without TEE follow-up | IE suspected, TTE result, TEE | D7, D8 | Non-PHI |
| T2 | GAP-VHD-045 | Blood culture-negative IE: expanded workup gap. BCN IE without serology for Coxiella, Bartonella, Tropheryma | BCN IE, serology panel | D5, D7 | Non-PHI |
| T2 | GAP-VHD-046 | PVE: FDG-PET/CT consideration. Prosthetic valve IE without FDG-PET/CT in diagnostic workup | PVE dx, FDG-PET procedure | D7 | Non-PHI |
| T2 | GAP-VHD-047 | IE: IDU/MDT coordination documented. IE dx without ID consultation documented | IE dx, ID consult encounter | D2, D11, D14 | Non-PHI |
| T2 | GAP-VHD-048 | Repeat blood cultures during IE treatment. IE on abx without repeat blood cultures to confirm clearance | IE, serial blood cx | D5 | Non-PHI |
| T2 | GAP-VHD-049 | IE echocardiogram at end of therapy. IE completion of treatment without end-of-therapy echo | IE, abx completion, end-TTE | D7, D8 | Non-PHI |

IE Pathogens (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-VHD-050 | S. aureus bacteremia: TEE indication adherence. S. aureus BSI (any) without TEE performed | S. aureus cx, TEE procedure | D5, D7 | Non-PHI |
| T2 | GAP-VHD-051 | Streptococcus bovis/gallolyticus: colonoscopy gap. Strep bovis group IE without colonoscopy for colon cancer screening | Strep bovis cx, colonoscopy procedure | D5, D7 | Non-PHI |
| T2 | GAP-VHD-052 | HACEK organisms: recognition and treatment. HACEK IE without appropriate antibiotic regimen | HACEK cx, abx regimen | D3, D5 | Non-PHI |
| T2 | GAP-VHD-053 | Fungal IE: surgical consideration strongly indicated. Candida or fungal IE without surgical referral | Fungal cx, surgical referral | D5, D7, D14 | Non-PHI |
| T2 | GAP-VHD-054 | Bartonella IE workup in BCN + exposure history. BCN IE + cat exposure/homelessness without Bartonella serology | BCN IE, Bartonella serology, SDOH flags | D5, D7, D16 | Non-PHI |
| T2 | GAP-VHD-055 | Coxiella (Q fever) IE: chronic form workup. BCN IE with culture negative x3 without Coxiella serology | BCN IE, Coxiella titers | D5 | Non-PHI |
| T2 | GAP-VHD-056 | Tropheryma whipplei IE: special culture/PCR. BCN IE with GI/arthritic symptoms without Whipple workup | BCN IE, T. whipplei PCR | D5 | Non-PHI |

IE Surgical (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-VHD-057 | IE + acute HF: urgent surgery indicated. IE + new or worsening HF without surgical eval | IE, HF dx, surgical referral | D2, D7, D14 | Non-PHI |
| T1 | GAP-VHD-058 | IE + perivalvular abscess: surgical indication. IE + abscess on echo without surgical referral | IE, abscess finding, referral | D7, D14 | Non-PHI |
| T1 | GAP-VHD-061 | PVE with dehiscence or fistula: urgent surgery. PVE + dehiscence/fistula without surgical referral | PVE, imaging finding, surgical referral | D7, D14 | Non-PHI |
| T2 | GAP-VHD-059 | IE + embolic event on therapy: surgery consideration. IE + recurrent embolic event on abx without surgical eval | IE, embolic event, abx, surgery | D2, D7, D14 | Non-PHI |
| T2 | GAP-VHD-060 | IE + large mobile vegetation (>10mm): surgery consideration. IE + vegetation >10mm without surgical discussion | IE, vegetation size, surgical referral | D7, D8, D14 | Non-PHI |
| T2 | GAP-VHD-062 | Right-sided IE in IVDU: surgery vs medical management. Right-sided IE + IVDU + persistent bacteremia without multi-D discussion | Right IE, IVDU dx (F11.x), surgical referral | D2, D7, D14, D16 | Non-PHI |

IE Prophylaxis (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-063 | IE prophylaxis pre-dental: prosthetic valve. Prosthetic valve (Z95.2/Z95.3) + dental procedure without amoxicillin 2g | Prosthetic valve, dental procedure, abx | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-064 | IE prophylaxis: prior IE pre-dental procedure. Prior IE + dental procedure without prophylaxis | Prior IE dx, dental CPT, abx | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-065 | IE prophylaxis: unrepaired cyanotic CHD + procedure. Unrepaired cyanotic CHD + dental/high-risk procedure without prophylaxis | CHD dx, procedure, abx | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-066 | IE prophylaxis: prior CHD repair with residual defect + procedure. Repaired CHD with residual + procedure without prophylaxis | CHD history, residual defect, procedure | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-067 | IE prophylaxis: inappropriate use (no indication). MVP or native valve disease without high-risk category receiving prophylaxis | Valve dx, prophylaxis med | D2, D3 | Non-PHI |

PVT (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-VHD-068 | Mechanical prosthetic valve thrombosis detection: elevated gradient. Mech valve + gradient rise >=50% from baseline without thrombosis workup | Mech valve, serial gradients, workup | D5, D7, D8 | Non-PHI |
| T2 | GAP-VHD-069 | PVT confirmation: fluoroscopy/cinefluoroscopy for stuck leaflet. Suspected PVT without fluoroscopic leaflet motion assessment | PVT suspected, fluoroscopy | D7 | Non-PHI |
| T2 | GAP-VHD-070 | PVT: TEE for thrombus visualization. Suspected PVT without TEE | PVT suspected, TEE | D7, D8 | Non-PHI |
| T2 | GAP-VHD-071 | PVT treatment: fibrinolysis vs surgery decision doc. Confirmed PVT without documented lysis-vs-surgery decision | PVT confirmed, treatment selection | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-072 | Post-PVT: anticoagulation intensification. Post-PVT without increased INR target + ASA adjunct | PVT history, INR target, ASA | D3, D5, D7 | Non-PHI |

Post-op Surveillance (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-077 | Post-valve AF: anticoagulation maintenance. Post-valve surgery + new AF without anticoagulation | Valve surgery, post-op AF, OAC | D2, D3, D7 | Non-PHI |
| T2 | GAP-VHD-078 | Prosthesis dysfunction: mean gradient elevation threshold. Post-op mean gradient >20 without workup | Post-op gradient, follow-up | D7, D8 | Non-PHI |
| T3 | GAP-VHD-073 | Baseline post-op echo before discharge. Valve surgery without pre-discharge TTE | Valve surgery, pre-discharge echo | D7, D8 | Non-PHI |
| T3 | GAP-VHD-074 | 30-day post-op echo gap. Valve surgery without 30-day post-op echo | Valve surgery, 30d echo | D7, D8 | Non-PHI |
| T3 | GAP-VHD-075 | 6-month post-op echo gap. Valve surgery without 6-month post-op echo for baseline comparison | Valve surgery, 6-month echo | D7, D8 | Non-PHI |
| T3 | GAP-VHD-076 | Annual post-op echo gap (beyond year 1). Valve surgery >1y without annual echo | Valve surgery date, annual echo | D7, D8 | Non-PHI |

Rheumatic (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-079 | Rheumatic fever secondary prophylaxis gap. Rheumatic heart disease (I05-I09) without benzathine PCN prophylaxis | Rheumatic dx, BPG med/injection | D2, D3 | Non-PHI |
| T2 | GAP-VHD-080 | Rheumatic MS + Wilkins score for PMBC decision. Rheumatic MS candidate for intervention without Wilkins score | Rheumatic MS, TEE valve scoring | D2, D7, D8 | Non-PHI |
| T2 | GAP-VHD-081 | PMBC candidacy: anatomy-based selection. Rheumatic MS with Wilkins<=8 + eligible anatomy without PMBC offered | MS, Wilkins, anatomy, PMBC procedure | D7, D8 | Non-PHI |
| T2 | GAP-VHD-082 | Commissurotomy vs MVR decision docs (rheumatic). Rheumatic MS surgical candidate without commissurotomy vs MVR decision | Rheumatic MS, procedure choice | D7 | Non-PHI |
| T2 | GAP-VHD-083 | Rheumatic heart + AF: anticoagulation adherence. Rheumatic heart + AF on warfarin (DOAC contraindicated) | Rheumatic dx, AF, OAC type | D2, D3 | Non-PHI |
| T3 | GAP-VHD-084 | Rheumatic fever family screening gap. Family member with rheumatic heart without echo screening in FDRs | Rheumatic proband, family referral | D2, D14, D17 | Non-PHI |

Carcinoid (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-VHD-085 | Carcinoid syndrome: 24-hour urinary 5-HIAA gap. Carcinoid syndrome suspicion without 5-HIAA measurement | Carcinoid dx, 5-HIAA result | D2, D5 | Non-PHI |
| T3 | GAP-VHD-086 | Carcinoid heart: TV/PV surveillance echo. Carcinoid syndrome without annual echo for TV/PV involvement | Carcinoid dx, echo dates | D2, D7, D8 | Non-PHI |
| T3 | GAP-VHD-087 | Carcinoid heart: somatostatin analog therapy. Carcinoid syndrome without somatostatin analog (octreotide/lanreotide) | Carcinoid dx, somatostatin analog | D2, D3 | Non-PHI |
| T3 | GAP-VHD-088 | Carcinoid heart: tricuspid/pulmonary valve surgery timing. Severe carcinoid TV disease + controlled primary without surgical eval | Carcinoid, TV/PV disease, surgical referral | D2, D7, D14 | Non-PHI |
| T3 | GAP-VHD-089 | Carcinoid: hepatic metastasis control. Carcinoid heart + hepatic mets without mets-directed therapy | Carcinoid, liver mets, targeted therapy | D2, D3 | Non-PHI |
| T3 | GAP-VHD-090 | Carcinoid crisis prevention pre-procedure. Carcinoid patient + procedure without octreotide preop protocol | Carcinoid, procedure, octreotide orders | D3, D7 | Non-PHI |

Drug-Induced (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-VHD-091 | Dopamine agonist (cabergoline/pergolide) valve surveillance. Cabergoline/pergolide long-term without echo surveillance | Dopamine agonist, echo schedule | D3, D7, D8 | Non-PHI |
| T3 | GAP-VHD-092 | Ergotamine: valvular surveillance gap. Chronic ergotamine without periodic echo | Ergotamine, echo schedule | D3, D7, D8 | Non-PHI |
| T3 | GAP-VHD-093 | Serotonergic drug + valve dysfunction association check. New valve disease + long-term serotonergic (MDMA, some TCAs) without drug review | Valve dx, serotonergic meds | D3, D7 | Non-PHI |
| T3 | GAP-VHD-094 | Benfluorex or fenfluramine history: valve surveillance. History of anorectics + new valve disease without echo surveillance | Drug history, echo | D3, D7 | Non-PHI |

Radiation (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-VHD-095 | Prior chest radiation: valve surveillance gap. Chest radiation >10y ago without periodic echo surveillance | Radiation history (Z92.3), echo schedule | D2, D7, D8 | Non-PHI |
| T3 | GAP-VHD-096 | Radiation valve + CAD + pericardial: integrated management. Radiation cardiac disease without comprehensive cardiac eval | Radiation hx, cardiac evaluation | D2, D7, D8 | Non-PHI |
| T3 | GAP-VHD-097 | Radiation valve: TAVR vs SAVR decision (high re-op risk). Radiation AV disease + intervention candidate - TAVR preferred discussion | Radiation, AV disease, procedure type | D2, D7, D14 | Non-PHI |

Pregnancy (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-VHD-099 | Mechanical valve + pregnancy 1st trimester: LMWH protocol. Pregnant + mech valve + warfarin >5mg/day without LMWH transition in T1 | Pregnancy, mech valve, warfarin dose, LMWH | D2, D3 | Non-PHI |
| T2 | GAP-VHD-098 | Mechanical valve + pregnancy: pre-conception counseling. Pre-conception female + mechanical valve without counseling documented | Sex, age, mech valve, counsel flowsheet | D1, D2, D6 | Non-PHI |
| T2 | GAP-VHD-100 | Mechanical valve + pregnancy: anti-Xa monitoring on LMWH. Pregnant on LMWH without peak anti-Xa targeting 0.8-1.2 | Pregnancy, LMWH, anti-Xa levels | D3, D5 | Non-PHI |
| T2 | GAP-VHD-101 | Mechanical valve + pregnancy 36 weeks: LMWH restart + delivery plan. Pregnant + mech valve near term without LMWH restart + delivery plan | Pregnancy 36w+, mech valve, plan docs | D2, D3 | Non-PHI |

Valve Progression (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-VHD-103 | Severe chronic AR asymptomatic: surgical thresholds. Severe AR asymptomatic + LVESD>=50 or LVEF<=55% without surgical eval | AR severity, LVESD, LVEF, referral | D7, D8, D14 | Non-PHI |
| T3 | GAP-VHD-102 | Moderate AR progression surveillance. Moderate AR without annual echo | AR grade, echo dates | D2, D7, D8 | Non-PHI |
| T3 | GAP-VHD-104 | Mixed valve disease: comprehensive staging. Combined AS + MR + AR without integrated staging documented | Multiple valve dx, severity grading | D2, D8 | Non-PHI |
| T3 | GAP-VHD-105 | Primary MR grade underestimation on single measure. Moderate MR by color only without EROA + RV + VC triangulation | MR grade, EROA, RV, VC | D8 | Non-PHI |

6.6 Peripheral Vascular (105 gaps)
PAD Detection (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-001 | PAD: ABI never measured in symptomatic patient. Claudication symptoms or I73.9 without ABI | Claudication dx, ABI flowsheet | D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-002 | Diabetic + PAD risk: ABI screening gap. DM age>=50 + smoking/neuropathy without ABI | DM, age, risk factors, ABI | D1, D2, D6 | Non-PHI |
| T2 | GAP-PV-003 | Abnormal ABI (<=0.9) without PAD dx coded. ABI<=0.9 without I73.9 or I70.2x on problem list | ABI result, PAD dx | D2, D6 | Non-PHI |
| T2 | GAP-PV-004 | Non-compressible ABI (>1.4): TBI follow-up gap. ABI>1.4 without toe-brachial index | ABI, TBI flowsheet | D6 | Non-PHI |
| T2 | GAP-PV-005 | PAD: exercise ABI for normal resting ABI + symptoms. Claudication + normal resting ABI without exercise ABI | Symptoms, resting ABI, exercise ABI | D6, D7 | Non-PHI |
| T2 | GAP-PV-006 | PAD Rutherford classification gap. PAD dx without Rutherford category documented | PAD dx, classification flowsheet | D2, D6 | Non-PHI |
| T2 | GAP-PV-007 | PAD Fontaine staging. PAD dx without Fontaine stage documented | PAD dx, Fontaine stage | D2, D6 | Non-PHI |

PAD Prevention (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-PV-011 | PAD: rivaroxaban 2.5 BID + ASA (COMPASS/VOYAGER). PAD without COMPASS-regimen consideration | PAD, rivaroxaban 2.5, ASA | D2, D3 | Non-PHI |
| T2 | GAP-PV-008 | PAD: statin not prescribed. I73.9 or I70.2x without any statin | PAD dx, statin med | D2, D3 | Non-PHI |
| T2 | GAP-PV-009 | PAD: high-intensity statin gap. PAD without high-intensity statin unless intolerant | PAD, statin intensity | D2, D3 | Non-PHI |
| T2 | GAP-PV-010 | PAD: antiplatelet gap. PAD without ASA or clopidogrel | PAD, antiplatelet med | D2, D3 | Non-PHI |
| T2 | GAP-PV-012 | PAD: cilostazol for claudication. Claudication + Rutherford I-II without cilostazol unless CI | Claudication, Rutherford, cilostazol, HF | D2, D3 | Non-PHI |
| T2 | GAP-PV-013 | PAD: supervised exercise therapy referral. Claudication without supervised exercise therapy referral (CPT 93668) | Claudication, SET CPT | D2, D7, D14 | Non-PHI |
| T2 | GAP-PV-014 | PAD: smoking cessation intervention. PAD + active smoker without cessation intervention | PAD, smoking status, cessation program | D2, D3, D16 | Non-PHI |
| T2 | GAP-PV-015 | PAD + DM: A1c target gap. PAD + DM + A1c>8 without intensification | PAD, DM, A1c, DM meds | D2, D3, D5 | Non-PHI |
| T2 | GAP-PV-016 | PAD + BP control: SBP>140 gap. PAD + SBP>140 without antihypertensive intensification | PAD, SBP, antihypertensives | D2, D3, D6 | Non-PHI |

CLTI (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-PV-017 | CLTI: BEST-CLI-eligible heart team discussion. CLTI (rest pain, ulcer, gangrene) without revasc team discussion | CLTI dx, heart team referral | D2, D7, D14 | Non-PHI |
| T1 | GAP-PV-018 | CLTI: endovascular vs surgical decision (BEST-CLI). CLTI + intervention without documented strategy | CLTI, intervention type decision | D2, D7 | Non-PHI |
| T2 | GAP-PV-019 | CLTI + diabetic foot: multidisciplinary team. CLTI + diabetic foot without MDT podiatry/wound referral | CLTI, DM, foot ulcer, referrals | D2, D14 | Non-PHI |
| T2 | GAP-PV-020 | Pedal loop angioplasty for distal CLTI. CLTI with infrapopliteal disease without pedal loop consideration | CLTI, TASC lesion, pedal approach | D7 | Non-PHI |
| T2 | GAP-PV-021 | CLTI: WIfI staging documentation. CLTI without WIfI (Wound/Ischemia/foot Infection) staging | CLTI, WIfI components | D2, D6 | Non-PHI |
| T2 | GAP-PV-022 | CLTI: SVS amputation risk assessment. CLTI without amputation risk stratification | CLTI, risk stratification flowsheet | D2, D6 | Non-PHI |

TASC Staging (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-023 | TASC II A/B iliac lesion: endovascular approach. Iliac disease + TASC A/B without endovascular intervention option | Iliac imaging, TASC class, procedure | D7 | Non-PHI |
| T2 | GAP-PV-024 | TASC II C/D iliac: endovascular experienced operator or surgical bypass. Iliac disease + TASC C/D without appropriate approach decision | Iliac imaging, TASC class, procedure | D7 | Non-PHI |
| T2 | GAP-PV-025 | TASC II A/B fem-pop: endovascular first. Fem-pop disease + TASC A/B without endovascular first | Fem-pop imaging, TASC, procedure | D7 | Non-PHI |
| T2 | GAP-PV-026 | TASC II C/D fem-pop: hybrid vs bypass decision. Fem-pop TASC C/D without bypass vs hybrid documented | Fem-pop, TASC, procedure decision | D7 | Non-PHI |
| T2 | GAP-PV-027 | CERAB (covered endovascular reconstruction of aortic bifurcation): complex aortoiliac. Complex aortoiliac without CERAB vs open decision | Aortoiliac imaging, procedure | D7 | Non-PHI |

Mesenteric Ischemia (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-028 | Acute mesenteric ischemia: suspected without CTA. Sudden abdominal pain + risk factors without mesenteric CTA | Abdominal pain dx, CTA abd | D2, D7 | Non-PHI |
| T2 | GAP-PV-029 | Chronic mesenteric ischemia: food fear + weight loss without workup. Post-prandial pain + weight loss without mesenteric imaging | Symptoms, mesenteric CTA/US | D2, D7 | Non-PHI |
| T2 | GAP-PV-030 | Confirmed CMI: revasc indication. Chronic mesenteric ischemia + 2+ vessel disease without revasc eval | CMI dx, vessel disease, procedure | D2, D7, D14 | Non-PHI |
| T2 | GAP-PV-031 | Median arcuate ligament syndrome consideration. Young patient + post-prandial pain + celiac compression on imaging | Age, pain, celiac imaging | D1, D2, D7 | Non-PHI |
| T2 | GAP-PV-032 | Non-occlusive mesenteric ischemia (NOMI) in shock. Shock + elevated lactate + abdominal pain without NOMI consideration | Shock, lactate, abdominal exam | D2, D5, D6 | Non-PHI |

Renal Artery (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-033 | Resistant HTN: RAS screening gap. BP uncontrolled on 3+ agents including diuretic without RAS workup | BP, med count, RAS imaging | D2, D3, D6, D7 | Non-PHI |
| T2 | GAP-PV-034 | FMD (fibromuscular dysplasia) screening in young HTN female. HTN age<35 female without FMD imaging screening | Age, sex, HTN, imaging | D1, D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-035 | RAS intervention: CORAL-aligned decision docs. RAS dx + HTN controlled without documented CORAL-aligned decision | RAS dx, BP control, decision | D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-036 | Flash pulmonary edema + bilateral RAS: intervention. Flash pulmonary edema + bilateral RAS without intervention | Pulm edema, RAS bilateral, intervention | D2, D7 | Non-PHI |

Vasculitis (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-037 | Takayasu arteritis: ESR/CRP monitoring + imaging surveillance. Takayasu dx without serial ESR/CRP + imaging | Takayasu dx, ESR/CRP, imaging dates | D2, D5, D7 | Non-PHI |
| T2 | GAP-PV-038 | Takayasu: glucocorticoid + steroid-sparing agent gap. Active Takayasu without immunosuppression | Takayasu, med list | D2, D3 | Non-PHI |
| T2 | GAP-PV-039 | Giant cell arteritis: temporal artery biopsy or large-vessel imaging. Suspected GCA age>=50 without biopsy or imaging | Age, GCA suspected, biopsy/imaging | D1, D2, D7 | Non-PHI |
| T2 | GAP-PV-040 | GCA: steroid initiation + tocilizumab consideration. GCA dx without prompt steroid + IL-6 inhibitor consideration | GCA dx, med list | D2, D3 | Non-PHI |
| T2 | GAP-PV-041 | Buerger disease (thromboangiitis obliterans): smoking cessation critical. Buerger dx + continued smoking without intensive cessation | Buerger dx, smoking, cessation | D2, D3, D16 | Non-PHI |
| T2 | GAP-PV-042 | Behcet vascular involvement: anticoag + immunosuppression. Behcet + vascular thrombosis without integrated management | Behcet, vascular thrombosis, meds | D2, D3 | Non-PHI |

Upper Extremity (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-043 | Subclavian stenosis: BP differential >15 mmHg arms. BP differential without vascular workup | Bilateral BP, imaging | D6, D7 | Non-PHI |
| T2 | GAP-PV-044 | Subclavian steal syndrome: symptoms + imaging. Subclavian stenosis + vertebrobasilar symptoms without duplex/angio | Symptoms, vertebral flow imaging | D7 | Non-PHI |
| T2 | GAP-PV-045 | Thoracic outlet syndrome: positional workup. Upper extremity symptoms + positional without TOS workup | Symptoms, positional maneuvers, imaging | D2, D7 | Non-PHI |
| T2 | GAP-PV-046 | Popliteal entrapment syndrome in young athlete. Young athlete + calf claudication without PAES consideration | Age, symptoms, imaging | D1, D2, D7 | Non-PHI |
| T2 | GAP-PV-047 | Pre-dialysis access mapping gap. Pre-dialysis CKD without vessel mapping for AVF planning | CKD stage 4-5, vessel mapping US | D2, D7 | Non-PHI |

Raynaud (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-049 | Secondary Raynaud + digital ischemia: CCB + PDE5i. Secondary Raynaud + digital ulcer without stepwise therapy | Raynaud, ulcer, med list | D2, D3 | Non-PHI |
| T2 | GAP-PV-050 | Scleroderma-associated Raynaud: early referral. Scleroderma + Raynaud without rheumatology coordination | Scleroderma, Raynaud, referral | D2, D14 | Non-PHI |
| T3 | GAP-PV-048 | Raynaud primary vs secondary: distinction workup. Raynaud dx without ANA + nailfold capillaroscopy | Raynaud dx, ANA, capillaroscopy | D2, D5 | Non-PHI |

AAA (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-PV-055 | AAA >=5.5 cm (male) intervention threshold. AAA>=5.5 cm male without surgical/endo referral | AAA size, sex, referral | D1, D2, D7, D14 | Non-PHI |
| T1 | GAP-PV-056 | AAA >=5.0 cm (female) intervention threshold. AAA>=5.0 cm female without surgical/endo referral | AAA size, sex, referral | D1, D2, D7, D14 | Non-PHI |
| T2 | GAP-PV-051 | AAA screening: male age 65-75 ever-smoker. Male age 65-75 smoking history without AAA US screening | Age, sex, smoking hx, AAA screen US | D1, D2, D7 | Non-PHI |
| T2 | GAP-PV-057 | AAA rapid expansion: intervention. AAA expanding >0.5 cm/6mo without intervention discussion | Serial AAA sizes, referral | D7, D14 | Non-PHI |
| T3 | GAP-PV-052 | AAA surveillance: 3.0-3.9 every 3 years. AAA 3.0-3.9 cm without surveillance US every 3 years | AAA size, US dates | D2, D7 | Non-PHI |
| T3 | GAP-PV-053 | AAA surveillance: 4.0-4.9 annual. AAA 4.0-4.9 cm without annual US | AAA size, US dates | D2, D7 | Non-PHI |
| T3 | GAP-PV-054 | AAA surveillance: 5.0-5.4 every 6 months. AAA 5.0-5.4 cm without 6-month surveillance | AAA size, US dates | D2, D7 | Non-PHI |

Carotid/CVA (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-PV-058 | Symptomatic carotid stenosis>=70%: revasc within 2 weeks. Recent stroke/TIA + carotid stenosis>=70% without revasc within 2 weeks | Stroke/TIA, carotid severity, CEA/CAS date | D2, D7 | Non-PHI |
| T2 | GAP-PV-059 | CREST-2 pattern: asymptomatic carotid 70-99% decision docs. Asymptomatic carotid 70-99% without documented decision rationale | Carotid severity, symptoms, decision | D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-060 | Post-CEA/CAS antiplatelet + statin continuation. Post-carotid revasc without antiplatelet + statin | Carotid procedure, med list | D2, D3, D7 | Non-PHI |
| T2 | GAP-PV-061 | Carotid duplex surveillance post-revasc. Post-CEA/CAS without duplex at 1 month, then annual | Procedure, duplex dates | D7 | Non-PHI |
| T2 | GAP-PV-062 | Intracranial stenosis: aggressive medical therapy (SAMMPRIS). ICAD + stroke/TIA without SAMMPRIS-aligned medical therapy | ICAD, stroke/TIA, med list | D2, D3 | Non-PHI |

Venous Disease (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-063 | Iliofemoral DVT: thrombolysis consideration (ATTRACT). Extensive proximal DVT without thrombolysis discussion | DVT extent, CDT procedure | D2, D7 | Non-PHI |
| T2 | GAP-PV-064 | Recurrent DVT + thrombophilia workup gap. Recurrent VTE without thrombophilia workup | VTE history, thrombophilia labs | D2, D5 | Non-PHI |
| T2 | GAP-PV-065 | May-Thurner syndrome: left iliac DVT + compression check. Left iliofemoral DVT without May-Thurner evaluation | DVT laterality, iliac imaging | D2, D7 | Non-PHI |
| T2 | GAP-PV-066 | Paget-Schroetter (upper extremity effort thrombosis). Upper extremity DVT in athlete/active patient without TOS workup | UE DVT, TOS evaluation | D2, D7 | Non-PHI |
| T2 | GAP-PV-067 | Post-thrombotic syndrome: compression + skin care. Post-DVT PTS symptoms without compression therapy order | DVT history, PTS dx, compression Rx | D2, D3 | Non-PHI |
| T2 | GAP-PV-068 | IVC filter placement: contraindication to AC documented. IVC filter placement without documented AC contraindication | Filter placement, AC hold reason | D3, D7 | Non-PHI |
| T2 | GAP-PV-069 | Retrievable IVC filter: retrieval at 3-6 months gap. Retrievable filter placed >6 months without retrieval | Filter placement date, retrieval CPT | D7 | Non-PHI |
| T2 | GAP-PV-070 | Chronic venous insufficiency: compression therapy gap. CEAP class 2+ without compression therapy order | CEAP class, compression Rx | D2, D3 | Non-PHI |
| T2 | GAP-PV-071 | Varicose veins intervention: CEAP 3+ with symptoms. Varicose veins + CEAP 3+ symptomatic without ablation eval | CEAP class, symptoms, ablation procedure | D2, D7 | Non-PHI |

PE Risk Strat (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-072 | PESI or sPESI risk stratification not documented. PE dx without PESI/sPESI scoring | PE dx, PESI components | D2, D6 | Non-PHI |
| T2 | GAP-PV-073 | PE + RV strain: catheter-directed therapy evaluation. Submassive PE with RV dysfunction without CDT eval | PE, RV size/TAPSE, CDT | D2, D7, D8 | Non-PHI |
| T2 | GAP-PV-074 | Massive PE: systemic lysis or surgical embolectomy. Massive PE (hypotension) without lysis/embolectomy/ECMO | PE, hemodynamics, intervention | D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-075 | FlowTriever/EKOS candidacy in submassive PE. Submassive PE without mechanical thrombectomy evaluation | PE severity, thrombectomy procedure | D7 | Non-PHI |
| T2 | GAP-PV-076 | Post-PE anticoagulation duration review. PE on AC without 3-6 mo review for duration decision | PE date, AC continuation | D3, D7 | Non-PHI |
| T2 | GAP-PV-077 | Unprovoked PE: cancer screening. Unprovoked PE without age-appropriate cancer screening | Unprovoked PE, cancer screening status | D2, D7 | Non-PHI |

CTEPH (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-PV-079 | CTEPH dx: PTE evaluation (operable vs not). CTEPH dx without pulmonary thromboendarterectomy eligibility assessment | CTEPH dx, PTE referral | D2, D7, D14 | Non-PHI |
| T2 | GAP-PV-078 | Post-PE 3-6mo persistent dyspnea: V/Q for CTEPH. Post-PE + persistent dyspnea at 3-6mo without V/Q scan | PE history, dyspnea, V/Q | D2, D7 | Non-PHI |
| T2 | GAP-PV-080 | Inoperable CTEPH: balloon pulmonary angioplasty consideration. Inoperable CTEPH without BPA evaluation | CTEPH inoperable, BPA procedure | D7 | Non-PHI |
| T2 | GAP-PV-081 | CTEPH medical therapy: riociguat. CTEPH inoperable or residual after PTE without riociguat | CTEPH status, riociguat med | D2, D3 | Non-PHI |

PAH (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-082 | PAH functional class not documented. PAH dx without WHO functional class in last 12mo | PAH dx, FC flowsheet | D2, D6 | Non-PHI |
| T2 | GAP-PV-083 | PAH risk stratification: low-intermediate-high. PAH without risk stratification tool (ESC/ERS or REVEAL 2.0) | PAH dx, risk tool components | D2, D5, D6, D8 | Non-PHI |
| T2 | GAP-PV-084 | PAH initial therapy: ERA + PDE5i combination. New PAH without combination therapy initiation | PAH dx, med list | D2, D3 | Non-PHI |
| T2 | GAP-PV-085 | PAH sotatercept (STELLAR trial) candidacy. PAH on background triple therapy without sotatercept eval | PAH, meds, sotatercept | D2, D3 | Non-PHI |
| T2 | GAP-PV-086 | PAH + functional decline: prostacyclin escalation. PAH functional decline without prostacyclin escalation | PAH, FC trend, prostacyclin | D3, D6 | Non-PHI |
| T2 | GAP-PV-087 | PAH lung transplant referral timing. PAH + intermediate-high risk on max therapy without transplant referral | PAH risk, meds, transplant referral | D2, D3, D14 | Non-PHI |

AVM (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-PV-088 | HHT (Osler-Weber-Rendu) screening in recurrent epistaxis. Recurrent epistaxis + telangiectasias without HHT evaluation | Epistaxis, telangiectasia, HHT workup | D2, D7 | Non-PHI |
| T3 | GAP-PV-089 | Pulmonary AVM: hypoxia + paradoxical embolus risk. Hypoxia + HHT without pulmonary AVM imaging | Hypoxia, HHT, pulm AVM imaging | D5, D7 | Non-PHI |
| T3 | GAP-PV-090 | HHT: endoscopic evaluation for GI AVM. HHT + iron deficiency anemia without GI endoscopy | HHT, Fe, endoscopy | D2, D5, D7 | Non-PHI |

Vascular Access (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-PV-091 | AVF surveillance: annual access flow. Dialysis access without annual flow measurement | Dialysis, access flow | D7 | Non-PHI |
| T3 | GAP-PV-092 | AV access thrombosis: salvage vs new access. Recurrent AV access failure without salvage strategy | Access failure pattern, strategy | D7 | Non-PHI |
| T3 | GAP-PV-093 | Central venous stenosis post-central line. Prior central line + upper extremity swelling without venogram | Line history, swelling, venogram | D2, D7 | Non-PHI |

Lymphatic/Misc (2 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-PV-094 | Lymphedema staging documentation. Lymphedema dx without ISL stage documented | Lymphedema, staging flowsheet | D2, D6 | Non-PHI |
| T3 | GAP-PV-095 | Secondary lymphedema after cancer: CDT referral. Post-cancer lymphedema without CDT (complete decongestive therapy) referral | Lymphedema, cancer hx, CDT referral | D2, D14 | Non-PHI |

Peri-procedure (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-096 | Pre-vascular surgery cardiac risk stratification. Major vascular surgery without pre-op cardiac risk (RCRI or NSQIP) | Vascular surgery, pre-op eval | D6, D7 | Non-PHI |
| T2 | GAP-PV-097 | Contrast-induced nephropathy prophylaxis in CKD + vascular procedure. eGFR<45 + vascular contrast procedure without pre-hydration | eGFR, procedure, hydration | D3, D5, D7 | Non-PHI |
| T3 | GAP-PV-098 | Post-bypass surveillance: 3, 6, 12 mo duplex. Lower extremity bypass without 3-6-12 mo duplex | Bypass procedure, duplex schedule | D7 | Non-PHI |
| T3 | GAP-PV-099 | EVAR surveillance: CT at 1 month, 6 months, annual. EVAR without surveillance CT schedule adherence | EVAR, CT schedule | D7 | Non-PHI |
| T3 | GAP-PV-100 | Endoleak detection post-EVAR: type and management. EVAR surveillance showing endoleak without intervention decision | EVAR, endoleak type, decision | D7 | Non-PHI |

Special Populations (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-PV-101 | Diabetic foot: annual monofilament + ABI. DM without annual foot exam + ABI | DM, foot exam flowsheet, ABI | D2, D6, D7 | Non-PHI |
| T2 | GAP-PV-102 | Rural/ADI-high + PAD: SET telehealth alternative. PAD + rural/ADI high without home-based exercise program | PAD, ADI overlay, SET/home program | D2, D26 | Non-PHI |
| T2 | GAP-PV-103 | Pregnancy + vascular emergency (AAA, dissection). Pregnancy + aortic emergency without coordinated care plan | Pregnancy, aortic emergency, plan docs | D2, D7 | Non-PHI |
| T2 | GAP-PV-105 | Elderly + PAD + frailty: Clinical Frailty Scale. Elderly + PAD without CFS or frailty assessment | Age, PAD, frailty tool | D1, D2, D6 | Non-PHI |
| T3 | GAP-PV-104 | Transgender hormone therapy + VTE risk counseling. Transgender + hormone therapy without VTE risk counseling documented | Gender identity, hormone tx, counsel | D1, D2, D3 | Non-PHI |

6.7 Cross-module / Disparities / Safety (105 gaps)
Cardio-Onc (17 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-001 | Anthracycline: baseline LVEF + GLS before initiation. Anthracycline order without baseline echo with GLS | Chemo orders, echo + GLS | D3, D8 | Non-PHI |
| T1 | GAP-CX-007 | ICI myocarditis surveillance during checkpoint inhibitor. Active ICI without troponin baseline + surveillance | ICI orders, troponin schedule | D3, D5 | Non-PHI |
| T1 | GAP-CX-008 | ICI myocarditis suspected: high-dose steroids. ICI + troponin elevation + CV dysfunction without steroid initiation | ICI, troponin, steroid order | D3, D5 | Non-PHI |
| T1 | GAP-CX-016 | Prior chest radiation: long-term cardiac surveillance. Chest radiation >5y ago without cardiac surveillance plan | Radiation hx (Z92.3), echo schedule | D2, D7, D8 | Non-PHI |
| T2 | GAP-CX-002 | HER2 therapy surveillance: q3mo echo. Trastuzumab without echo every 3 months | Trastuzumab orders, echo frequency | D3, D8 | Non-PHI |
| T2 | GAP-CX-003 | Anthracycline + trastuzumab sequential: combined CV risk. Combined anthracycline + HER2 therapy without intensive CV surveillance | Chemo sequence, echo frequency | D3, D8 | Non-PHI |
| T2 | GAP-CX-004 | Cancer survivor + CV risk: long-term surveillance. 5+ years post-anthracycline without annual echo | Cancer history, anthracycline, echo | D2, D8 | Non-PHI |
| T2 | GAP-CX-005 | Cancer therapy + hypertension: management gap. Cancer therapy + BP>140 without intensification | Chemo, BP, antihypertensives | D3, D6 | Non-PHI |
| T2 | GAP-CX-006 | Cancer therapy cardiotoxicity baseline HFA-ICOS risk. Starting cardiotoxic therapy without HFA-ICOS risk stratification | Therapy type, risk score | D3, D6, D8 | Non-PHI |
| T2 | GAP-CX-009 | CAR-T therapy cardiac surveillance. CAR-T therapy without baseline echo + troponin + BNP | CAR-T orders, cardiac workup | D3, D5, D8 | Non-PHI |
| T2 | GAP-CX-010 | CRS post-CAR-T: cardiac consequences monitoring. Cytokine release syndrome post-CAR-T without cardiac monitoring | CAR-T, CRS dx, monitoring | D5, D8 | Non-PHI |
| T2 | GAP-CX-011 | TKI (ibrutinib, ponatinib) AF surveillance. BTK/BCR-ABL TKI without AF surveillance | TKI orders, ECG/monitor | D3, D9, D10 | Non-PHI |
| T2 | GAP-CX-012 | Proteasome inhibitor (carfilzomib/bortezomib) HF surveillance. Proteasome inhibitor + CV risk without echo surveillance | Proteasome inhibitor, echo | D3, D8 | Non-PHI |
| T2 | GAP-CX-013 | 5-FU/capecitabine: ischemia/vasospasm recognition. 5-FU/capecitabine + chest pain without ischemia/vasospasm workup | Chemo, chest pain, workup | D2, D3, D7 | Non-PHI |
| T2 | GAP-CX-014 | ADT (androgen deprivation therapy): CV risk intensification. ADT start without CV risk factor optimization | ADT orders, CV risk factors | D2, D3, D5 | Non-PHI |
| T2 | GAP-CX-015 | Anti-angiogenic (bevacizumab, sunitinib): BP + HF monitoring. Anti-angiogenic without BP + cardiac monitoring | Anti-angiogenic, BP, echo | D3, D6, D8 | Non-PHI |
| T2 | GAP-CX-017 | Cardio-oncology referral: complex cases. Cardiotoxic therapy + baseline CV disease without cardio-onc referral | Therapy, baseline CVD, referral | D2, D14 | Non-PHI |

Pregnancy (9 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-021 | Mechanical valve + pregnancy: anticoagulation transition protocol. Pregnant + mech valve without documented LMWH/warfarin protocol | Pregnancy, mech valve, AC plan | D2, D3 | Non-PHI |
| T1 | GAP-CX-025 | Pregnancy + ACEi/ARB/ARNI/SGLT2i (teratogen safety). Pregnancy + teratogenic med on active list | Pregnancy, med list | D2, D3 | Non-PHI |
| T2 | GAP-CX-018 | Pregnancy + CV disease: mWHO risk classification. Pregnant + known CV disease without mWHO risk stratification | Pregnancy, CVD, mWHO components | D2, D6 | Non-PHI |
| T2 | GAP-CX-019 | HCM + pregnancy: BB continuation + planning. HCM + pregnant without BB management documented | HCM, pregnancy, BB | D2, D3 | Non-PHI |
| T2 | GAP-CX-020 | PH + pregnancy: contraception counseling (pregnancy contraindicated). PAH in reproductive-age female without contraception documented | PAH, sex, age, contraception | D1, D2, D3 | Non-PHI |
| T2 | GAP-CX-022 | Aortopathy + pregnancy: surveillance + delivery planning. Aortopathy + pregnancy without serial imaging + delivery plan | Aortopathy, pregnancy, imaging | D2, D7 | Non-PHI |
| T2 | GAP-CX-023 | Peripartum cardiomyopathy: bromocriptine + standard HF therapy. PPCM dx without BB + ACEi post-partum + bromocriptine eval | PPCM, med list, delivery date | D2, D3 | Non-PHI |
| T2 | GAP-CX-024 | Postpartum PE risk: prophylaxis in high-risk. Postpartum + high VTE risk without prophylaxis | Postpartum, VTE risk factors, prophylaxis | D2, D3 | Non-PHI |
| T3 | GAP-CX-026 | Preeclampsia: long-term CV risk follow-up. History preeclampsia without CV risk assessment at 6-12mo postpartum | Preeclampsia hx, CV f/u | D2, D6 | Non-PHI |

Pre-Transplant (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-027 | Pre-kidney transplant: stress testing. Pre-kidney transplant without appropriate cardiac stress evaluation | Pre-transplant eval, stress test | D2, D7 | Non-PHI |
| T2 | GAP-CX-028 | Pre-liver transplant: cardiac workup (cirrhotic CM risk). Pre-liver transplant without cardiac evaluation for cirrhotic CM | Pre-transplant eval, echo + stress | D2, D7, D8 | Non-PHI |
| T2 | GAP-CX-029 | Pre-transplant PAH screening. Pre-transplant + unexplained dyspnea without PAH workup | Transplant candidate, PAH workup | D7, D8 | Non-PHI |
| T2 | GAP-CX-030 | Pre-transplant coronary eval in high-risk. Age>50 or DM or CV hx pre-transplant without coronary eval | Age, comorbid, coronary eval | D1, D2, D7 | Non-PHI |

Adolescent Transition (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-CX-031 | ACHD transition from pediatric to adult: age 18-21. Age 18-21 + congenital heart dx without adult cardio transition | Age, CHD dx, encounter type | D1, D2, D11 | Non-PHI |
| T3 | GAP-CX-032 | Teen inherited cardiac condition: genetic counseling. Age 13-18 + inherited condition (HCM, LQTS) without genetic counseling | Age, inherited dx, counseling referral | D1, D2, D14, D17 | Non-PHI |
| T3 | GAP-CX-033 | Athlete pre-participation screening red flags. Competitive athlete + syncope/FHx/murmur without cardiac eval | Athlete status, red flags, eval | D2, D17 | Non-PHI |

Geriatric (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-034 | Pre-procedure CFS (Clinical Frailty Scale). Elderly + cardiac procedure planned without CFS | Age, procedure, CFS flowsheet | D1, D6, D7 | Non-PHI |
| T2 | GAP-CX-036 | Geriatric + polypharmacy: medication deprescribing. >=10 meds age>=65 without deprescribing review | Age, med count, deprescribing note | D1, D3, D6 | Non-PHI |
| T2 | GAP-CX-038 | Fall risk assessment + anticoagulation review. Elderly on AC without fall risk assessment | Age, AC med, fall risk flowsheet | D1, D3, D6 | Non-PHI |
| T3 | GAP-CX-035 | Fried frailty phenotype in elderly cardiac. Age>=70 + cardiac dx without frailty phenotype assessment | Age, cardiac dx, frailty assessment | D1, D2, D6 | Non-PHI |
| T3 | GAP-CX-037 | Cognitive impairment screening + medication adherence. Elderly + chronic cardiac meds without cognitive screen | Age, cardiac med, cognitive screen | D1, D3, D6 | Non-PHI |
| T3 | GAP-CX-039 | Sarcopenia assessment in advanced HF elderly. Advanced HF + age>=70 without sarcopenia screening | HF, age, sarcopenia assessment | D1, D2, D6 | Non-PHI |

End-of-Life (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-040 | Palliative care: advanced HF triggers. Multiple WHF + high symptom burden without palliative referral | HF hospitalization, symptom score, referral | D2, D11, D14 | Non-PHI |
| T2 | GAP-CX-041 | Advance directive documentation in advanced cardiac disease. Advanced cardiac disease without advance directive | Cardiac dx, AD documentation | D2, D16 | Non-PHI |
| T2 | GAP-CX-043 | ICD deactivation at end-of-life. Palliative care + active ICD without shock therapy deactivation | Palliative referral, ICD, deactivation | D2, D10 | Non-PHI |
| T3 | GAP-CX-042 | Goals of care conversation pre-high-risk procedure. High-risk cardiac procedure without documented GOC discussion | Procedure, GOC note | D7, D11 | Non-PHI |
| T3 | GAP-CX-044 | Hospice enrollment timing in advanced HF. Late HF hospice enrollment (<7 days before death) | HF, hospice enrollment date, death date | D11, D19, D24 | Non-PHI |

Autoimmune (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T3 | GAP-CX-045 | SLE + CV risk: accelerated atherosclerosis screening. SLE age>=35 without CV risk assessment | SLE dx, age, CV risk | D1, D2, D5 | Non-PHI |
| T3 | GAP-CX-046 | RA + CV risk: guideline-based assessment + statin. RA + elevated inflammation without CV risk optimization | RA, CRP, statin | D2, D3, D5 | Non-PHI |
| T3 | GAP-CX-047 | Psoriasis severe + CV risk. Severe psoriasis without CV risk stratification | Psoriasis dx, risk calc | D2, D6 | Non-PHI |
| T3 | GAP-CX-048 | SSc (scleroderma) PAH screening. SSc dx without annual PAH screening | SSc dx, PAH workup | D2, D7, D8 | Non-PHI |
| T3 | GAP-CX-049 | Sarcoidosis: cardiac involvement screening. Systemic sarcoid without cardiac screening | Sarcoid dx, ECG, echo, CMR | D2, D7, D8, D9 | Non-PHI |

Obesity/GLP-1 (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-053 | Obesity-CV: GLP-1 SELECT eligibility (CVD + obesity). ASCVD + BMI>=27 without GLP-1 RA semaglutide | CVD, BMI, GLP-1 RA | D2, D3, D6 | Non-PHI |
| T1 | GAP-CX-054 | HFpEF + obesity: STEP-HFpEF semaglutide. HFpEF + BMI>=30 without semaglutide evaluation | HFpEF, BMI, semaglutide | D2, D3, D6, D8 | Non-PHI |
| T1 | GAP-CX-055 | HFpEF + obesity: SUMMIT tirzepatide. HFpEF + obesity without tirzepatide eval | HFpEF, BMI, tirzepatide | D2, D3, D6, D8 | Non-PHI |
| T2 | GAP-CX-050 | BMI>=30 + CV risk: structured weight management. BMI>=30 + CVD without weight management plan | BMI, CVD, weight mgmt | D2, D3, D6 | Non-PHI |
| T2 | GAP-CX-051 | Bariatric surgery candidacy: BMI>=35 + metabolic dz. BMI>=40 or BMI>=35 + comorbid without bariatric referral | BMI, comorbid, bariatric referral | D2, D6, D14 | Non-PHI |
| T2 | GAP-CX-052 | Post-bariatric surgery: cardiac reassessment. Post-bariatric + prior CVD without cardiac follow-up | Bariatric CPT, CVD, follow-up | D2, D7 | Non-PHI |
| T2 | GAP-CX-056 | SURMOUNT-eligible: BMI + metabolic. BMI>=30 or >=27+comorbid without tirzepatide eval | BMI, comorbid, tirzepatide | D2, D3, D6 | Non-PHI |

HRT/Contraception (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-057 | Combined OCP + VTE risk factors (SAFETY). Combined OCP + age>=35 smoker or BMI high without alternative discussion | OCP med, age, smoking, BMI | D1, D3, D6 | Non-PHI |
| T2 | GAP-CX-059 | HRT decision post-menopause + CV risk. Menopausal symptoms + HRT consideration without CV risk discussion | Menopause, HRT, risk discussion | D2, D3, D6 | Non-PHI |
| T3 | GAP-CX-058 | HRT + migraine with aura (SAFETY). Combined estrogen + migraine with aura | HRT, migraine type | D2, D3 | Non-PHI |

Cardiorenal-Metabolic (4 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-061 | CKM: SGLT2i use across eligible domains. CKM pattern without SGLT2i | CKM components, SGLT2i | D2, D3, D5 | Non-PHI |
| T1 | GAP-CX-062 | CKM: finerenone in DKD. DM + eGFR 25-60 + albuminuria without finerenone | DM, eGFR, UACR, finerenone | D2, D3, D5 | Non-PHI |
| T1 | GAP-CX-063 | CKM: ARNI where eligible (HF pillar). HF + CKM without ARNI | HF, CKM, ARNI | D2, D3 | Non-PHI |
| T2 | GAP-CX-060 | Cardiorenal-metabolic syndrome (CKM): stage documented. Multiple CKM components without staging documented | HF + CKD + T2DM + obesity, staging | D2, D5, D6 | Non-PHI |

Sleep/Substance/Psych (7 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-064 | OSA untreated + CV disease: CPAP adherence. OSA + CVD on CPAP with poor adherence data | OSA, CVD, CPAP adherence | D2, D3, D7 | Non-PHI |
| T2 | GAP-CX-065 | OSA undiagnosed: STOP-BANG high + no PSG. STOP-BANG>=5 without PSG | STOP-BANG score, PSG | D6, D7 | Non-PHI |
| T2 | GAP-CX-067 | Alcohol use disorder + CM: cessation + CV care. Alcoholic CM + active use without cessation referral | AUD dx, CM, cessation program | D2, D16 | Non-PHI |
| T2 | GAP-CX-068 | Cocaine/methamphetamine + CV event: cessation coordination. Substance use + CV event without cessation intervention | Substance dx, CV event, cessation | D2, D16 | Non-PHI |
| T2 | GAP-CX-069 | Depression + CV disease: PHQ-9 + SSRI consideration. CVD + positive PHQ without SSRI trial | CVD, PHQ, SSRI | D2, D3, D6 | Non-PHI |
| T2 | GAP-CX-070 | Anxiety + CVD: cognitive behavioral therapy referral. CVD + anxiety dx without therapy referral | CVD, anxiety, therapy referral | D2, D14 | Non-PHI |
| T3 | GAP-CX-066 | Central sleep apnea in HF: ASV contraindication awareness. HFrEF + central sleep apnea with ASV (contraindicated per SERVE-HF) | HF, LVEF, central SA, ASV device | D2, D7, D8 | Non-PHI |

SDOH/Disparities (8 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-076 | Black patient + HFrEF: H/ISDN consideration. Self-identified Black + HFrEF on ACEi/ARB without H/ISDN | Race, HFrEF, meds | D1, D2, D3 | Non-PHI |
| T2 | GAP-CX-071 | High ADI patient + HF: intensive care coordination. HF + ADI top quintile without care coordination program | HF, ADI overlay, care mgmt | D2, D16, D26 | Non-PHI |
| T2 | GAP-CX-072 | Food insecurity + HF: dietitian/resources. HF + food insecurity code without dietitian/SNAP resource referral | HF, SDOH codes Z59.4x, resources | D2, D16 | Non-PHI |
| T2 | GAP-CX-073 | Language barrier + CV disease: interpreter utilization. Primary non-English + CVD without interpreter documented | Language, CVD, interpreter | D1, D2, D11 | Non-PHI |
| T2 | GAP-CX-075 | Health literacy + complex regimen: teach-back. Complex med regimen + low literacy indicator without teach-back | Med count, literacy flag, counsel | D3, D6, D16 | Non-PHI |
| T2 | GAP-CX-077 | Hispanic/Latino + HF: culturally-tailored education. Hispanic/Latino + HF without culturally-tailored education | Ethnicity, HF, counsel | D1, D2, D6 | Non-PHI |
| T2 | GAP-CX-078 | Medicaid payer + CV therapy access: prior auth support. Medicaid + specialty cardiac med with PA failure | Payer, med, PA status | D2, D3, D15 | Non-PHI |
| T3 | GAP-CX-074 | Transportation barrier: telehealth alternative. Transportation barrier + multiple no-shows without telehealth offered | SDOH codes Z59.82, encounters | D2, D11, D16 | Non-PHI |

Preventive (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-079 | 2024 ACC/AHA lipid update: LDL goal <55 extreme risk. Extreme risk + LDL>=55 despite max | Extreme risk criteria, LDL, meds | D2, D3, D5 | Non-PHI |
| T2 | GAP-CX-080 | PREVENT risk calculator (ACC 2023) utilization. Primary prevention eval without PREVENT scoring | Primary prev eligible, PREVENT components | D2, D5, D6 | Non-PHI |
| T2 | GAP-CX-081 | 2025 ACS guideline adherence: multi-discipline review. ACS admission without guideline-aligned discharge bundle | ACS dx, discharge bundle components | D2, D3, D11 | Non-PHI |

Coordination (6 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-082 | Cardiology no-show pattern: outreach gap. Multiple no-shows in cardiology without outreach | Cardiology encounters, no-show pattern, outreach | D2, D11 | Non-PHI |
| T2 | GAP-CX-083 | Referral to cardiology: completion tracking. Cardiology referral placed without completed visit in 90 days | Referral date, visit completion | D11, D14 | Non-PHI |
| T2 | GAP-CX-084 | Post-discharge 7-day call: completion. High-risk discharge without 7-day call documented | Discharge date, phone note | D6, D11 | Non-PHI |
| T2 | GAP-CX-085 | Care gap notification system: closed loop. Care gap identified but no closure by 30 days | Gap identification date, closure documentation | D11, D16 | Non-PHI |
| T2 | GAP-CX-086 | Medication reconciliation at transitions. Hospital discharge without documented reconciliation | Discharge med list, reconciliation note | D3, D11 | Non-PHI |
| T2 | GAP-CX-087 | Pharmacy outreach for adherence intervention. PDC<80% without pharmacy outreach documented | Med, PDC, pharmacy intervention | D3, D21 | Non-PHI |

Telehealth (3 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-088 | Remote BP monitoring in resistant HTN. Resistant HTN without home BP monitoring program | HTN resistant, HBPM flowsheet | D2, D6 | Non-PHI |
| T2 | GAP-CX-089 | Remote patient monitoring in HF eligible. HF + high-risk + rural without RPM enrollment | HF, risk, ADI overlay, RPM flag | D2, D6, D26 | Non-PHI |
| T2 | GAP-CX-090 | Telehealth utilization for stable follow-up. Stable cardiology follow-up without telehealth option offered | Encounter type, stability proxy | D11 | Non-PHI |

Quality Measures (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-091 | HEDIS Statin Therapy for CVD (SPC): compliant. ASCVD age 21-75 male / 40-75 female without statin therapy (HEDIS) | Age, sex, ASCVD, statin | D1, D2, D3 | Non-PHI |
| T2 | GAP-CX-092 | HEDIS CBP (Controlling High BP). HTN age 18-85 + BP>=140/90 last visit | HTN dx, age, BP | D1, D2, D6 | Non-PHI |
| T2 | GAP-CX-093 | HEDIS PBH (Persistence of Beta-Blocker after MI). Post-MI without BB continuation 6 months | MI date, BB persistence | D2, D3, D21 | Non-PHI |
| T2 | GAP-CX-094 | MIPS cardiovascular quality measures: LDL control. Eligible cardiovascular patient missing LDL measure | Eligible, LDL measure | D2, D5 | Non-PHI |
| T2 | GAP-CX-095 | CMS Star Rating: medication adherence (PDC) for statin, RAS, DM. Star measure eligible with PDC<80% | Star denominator, PDC | D21 | Non-PHI |

Panel Management (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T2 | GAP-CX-096 | Panel: undiagnosed HTN (BP>=140 x2 without dx). Panel BP elevations without HTN coded | Panel-level BP, HTN dx | D6, D18 | Non-PHI |
| T2 | GAP-CX-097 | Panel: undiagnosed AF (ECG patterns + no dx). ECG showing AF without I48.x | ECG patterns, AF dx | D2, D9 | Non-PHI |
| T2 | GAP-CX-098 | Panel: ASCVD without any statin. Panel attribution: ASCVD without statin Rx | ASCVD dx panel, statin | D2, D3 | Non-PHI |
| T2 | GAP-CX-099 | Panel: DM + no CV protection regimen. Panel: DM without SGLT2i or GLP-1 cardioprotective | DM, ASCVD risk, cardioprotective | D2, D3, D6 | Non-PHI |
| T2 | GAP-CX-100 | Panel: elevated risk (PREVENT>=20) without any CV therapy. PREVENT>=20 10-year risk without statin or BP or antiplatelet | Risk calc, meds | D2, D3, D6 | Non-PHI |

Safety (5 gaps)
| Priority | ID | Gap Name and Detection Logic | Structured Data Elements | Domains | PHI |
|---|---|---|---|---|---|
| T1 | GAP-CX-101 | NSAID in HF or CKD: interaction alert not actioned. Chronic NSAID + HF or eGFR<60 | NSAID, HF, eGFR | D2, D3, D5 | Non-PHI |
| T1 | GAP-CX-102 | QT-prolonging drug combinations (ACS + antifungals + methadone). Multiple QT drugs co-prescribed | Med list with QT markers | D3, D9 | Non-PHI |
| T1 | GAP-CX-103 | Warfarin + antibiotic interaction: INR check. Warfarin + new antibiotic without INR check within 7 days | Warfarin, abx start, INR check | D3, D5 | Non-PHI |
| T1 | GAP-CX-104 | DOAC + strong CYP inhibitor/inducer interaction. DOAC + interacting med without dose review | DOAC, interacting med | D3 | Non-PHI |
| T2 | GAP-CX-105 | Inadvertent omission on discharge med reconciliation. Pre-admission cardiac med not on discharge list without rationale | Pre/post-admit med list | D3, D11 | Non-PHI |


---

## Document Discipline

This document is the canonical clinical spec referenced by:
- `docs/PATH_TO_ROBUST.md` — strategic plan
- `docs/audit/AUDIT_FRAMEWORK.md` — audit framework
- `docs/audit/PHASE_0B_*.md` — clinical content audits
- `backend/src/ingestion/gaps/*` — rule registry
- Any future demo, sales, or clinical-validation work

Updates to this document trigger a Path to Robust v[N+1] revision.

**Authority:** TAILRD Comprehensive Clinical Knowledge Base v4.0 (March 2026), maintained by Tony Das MD (CMO) and the TAILRD clinical team.

**Provenance:** Sanitized derivative of TAILRD-BSW-Scoping-Document-v7.1 §1.3 (Top 25) + §Part 4 (Clinical Gap Catalog). Commercial framing (scoping meeting structure, ROI commercial framing, delivery timelines, agreements, BSW participants) stripped. Clinical content reproduced verbatim as the platform's clinical IP.
