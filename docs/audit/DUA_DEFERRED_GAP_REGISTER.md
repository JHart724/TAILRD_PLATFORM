# DUA-Deferred Gap Register (v3.0 Track A)

**Status:** DUA-DEFERRED - blocked on data no current source (Synthea generation or the FHIR/CSV ingestion pipeline) provides; build+test when real EHR data lands (Redox / Epic FHIR). NOT counted in the pre-DUA buildout.

**Source:** v3.0 Track A-ingest scoping pass (read-only data-blocked inventory) + the deterministic re-derivation recorded here. Re-derived from the canonical `docs/audit/canonical/<MODULE>.spec.json` `structuredDataElements` field joined to `<MODULE>.crosswalk.json` classifications, across all 6 modules, against the ingested-data baseline (see Method). Procedure-presence (CPT/SNOMED) and medication temporal/start-date dependencies were UNBLOCKED by PR #396 (engine-signature threading) and are excluded from this register.

**Definition (operator-locked, NARROW):** a gap is DUA-DEFERRED only if its core trigger needs a genuinely-non-synthesizable element: device-interrogation, genetic-molecular, ECG-morphology, or REAL-EHR-ONLY echo/imaging morphology. Two adjacent classes of data-blocked gaps are recorded as their own tranches and are NOT part of the DUA-deferred count: (Tranche 2) gaps blocked on a synthesizable echo/physiologic numeric, which could be early-unblocked via Synthea-generation expansion; and (Tranche 3) process/documentation-gated gaps (adherence/fill data, shared-decision/counseling notes, staging flowsheets, scores).

---

## 1. Three-tier buildout accounting

Canonical spec universe (the 6-module crosswalk): **603** spec gaps.

| Bucket | Count | Meaning |
|---|---|---|
| DET_OK (built) | 93 | detection implemented + verified |
| non-DET_OK | 510 | SPEC_ONLY or PARTIAL_DETECTION (the buildout surface) |

The 510 non-DET_OK gaps decompose exactly into four buckets:

| Tier | Count | Buildable pre-DUA? | Description |
|---|---|---|---|
| Buildable-now | 263 | YES | needs no blocked element - dx + standard labs + meds (+ start-date) + procedures + EF-number + age/sex/race. Un-authored, not data-blocked. (Was 273; the HF buildout reclassified 3 HF gaps - HF-084/087/149. The EP buildout reclassified 7 more - EP-075/077/086/035 to Tranche 1, EP-031/036/094 to Tranche 3. EP-101 stays here as deferred-buildable: it needs a coronary-angiography CPT set, not real-EHR data.) |
| Tranche 2 - Synthea-expansion candidate | 108 | YES, if Synthea generation is expanded | blocked only on a synthesizable echo/physiologic numeric (valve gradient/area, EROA, aortic/AAA diameter, ABI, stenosis %, PASP, E/e', GLS, wall thickness, TAPSE). A synthetic numeric enables build+test pre-DUA. |
| Tranche 3 - process/doc-gated | 54 | NO (needs real EHR) | real-EHR-only documentation: pharmacy fill/PDC, shared-decision/heart-team/counseling notes, staging flowsheets, risk scores. |
| **Tranche 1 - DUA-DEFERRED** | **85** | **NO (needs real EHR)** | **device-interrogation + genetic-molecular + ECG-morphology + REAL-EHR-ONLY echo/imaging + (HF-buildout reconciliation) functional-capacity + (EP-buildout reconciliation) EP-study-mechanism + procedure-sequence. The DUA-gated set.** |

Check: 263 + 108 + 85 + 54 = 510 (all non-DET_OK accounted).

**Pre-DUA buildable surface** = 270 (buildable-now) + 108 (Tranche 2, with Synthea-generation investment) = **378**.
**DUA-gated** = 85 (Tranche 1) + 54 (Tranche 3 documentation) = 139, of which the **85 Tranche-1 set is the DUA-deferred gap register** below. The AUDIT-163 surgical-completeness (KB-completeness) tranche is tracked separately in the findings register and is NOT part of this accounting.

**Reconciliation to the earlier estimate:** the v3.0 scoping pass estimated ~52 DUA-deferred after the ~69 threading-unblock. The deterministic re-derivation lands at **79** under the locked narrow definition. The +27 delta is the REAL-EHR-ONLY echo/imaging subset (34 gaps: endocarditis/PVT TEE findings, HALT, Wilkins scoring, GLS strain, cardiac-mass characterization, valve-model identity) that the analysis judged genuinely unsynthesizable rather than Synthea-expandable. The earlier ~52 corresponds approximately to device + genetic + ECG-morphology + the few hardest echo findings; the boundary between "REAL-EHR-ONLY echo" (Tranche 1) and "synthesizable echo" (Tranche 2) is the single tuning knob that moves the count.

**HF-buildout reconciliation (2026-06-16):** the HF module buildout confirmed the real HF data-blocked floor is higher than the register's original 21. Three HF gaps the original scoping pass treated as buildable-now were reclassified as data-blocked: GAP-HF-084 (functional capacity / 6MWT-CPET - no objective functional-test feed) and GAP-HF-149 (LVAD pump-thrombosis hemolysis surveillance - LVAD pump telemetry + LDH/plasma-free-Hb) to Tranche 1; GAP-HF-087 (chronic opioid + untreated OSA - sleep-study/STOP-BANG documentation) to Tranche 3, because its blocker is process-documentation (social-process-doc), which is Tranche 3 by the deterministic Section-7 rule. This moves HF Tranche-1 from 21 to **23**, total Tranche 1 from 79 to **81**, Tranche 3 from 50 to **51**, and buildable-now from 273 to 270 (total non-DET_OK unchanged at 510). HF-084 extends the element-type taxonomy with functional-capacity (6MWT/CPET, real-EHR-only, not emitted by the current Synthea generator).

---

## 2. Tranche 1 - DUA-DEFERRED register (85)

The genuinely-data-source-blocked set. Build+test when real EHR data lands. Columns: GAP-ID, Module, Clin-Tier (clinical priority T1/T2/T3 from spec - NOT the tranche number), Classification, Title, Data element(s) needed, Element-type, Synthesizability, Pilot-value.

| GAP-ID | Module | Clin-Tier | Classification | Title | Data element(s) needed | Element-type | Synthesizability | Pilot-value |
|---|---|---|---|---|---|---|---|---|
| GAP-CAD-009 | CAD | T3 | SPEC_ONLY | ApoB not measured for risk refinement | ApoB lab | genetic-molecular | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-013 | CAD | T3 | SPEC_ONLY | Familial hypercholesterolemia screening | FH genetic testing | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-060 | CAD | T3 | PARTIAL_DETECTION | Polygenic risk score + CAC integration | polygenic risk score | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-075 | CAD | T2 | SPEC_ONLY | Acute stent thrombosis: emergent repeat PCI | ST-segment changes on ECG | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-084 | CAD | T3 | SPEC_ONLY | Coronary vasculitis workup (Kawasaki, Takayasu) | inflammatory markers / serologies | genetic-molecular | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-EP-032 | EP | T2 | PARTIAL_DETECTION | Pacemaker syndrome from RV pacing >=40% | RV pacing % from interrogation | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-EP-038 | EP | T2 | SPEC_ONLY | CIED recall: patient notification | device model / recall match | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-EP-039 | EP | T2 | PARTIAL_DETECTION | CIED abandoned lead: infection risk | lead history from interrogation | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-EP-040 | EP | T2 | PARTIAL_DETECTION | CIED MRI-conditional identification | device model conditional-status | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-EP-081 | EP | T3 | PARTIAL_DETECTION | LQT1 genotype-specific BB choice | LQT1 genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-082 | EP | T3 | SPEC_ONLY | LQT2 trigger identification counseling | LQT2 genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-083 | EP | T3 | SPEC_ONLY | LQT3 mexiletine eligibility | SCN5A genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-091 | EP | T3 | PARTIAL_DETECTION | CIED lead failure pattern detection | lead impedance trend | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-EP-075 | EP | T2 | PARTIAL_DETECTION | Focal atrial tachycardia recurrent: ablation gap | EP-study mechanism (ICD-10 I47.1 lumps AVNRT/AVRT/focal-AT; no focal-AT-specific code) | EP-study-mechanism | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-077 | EP | T2 | PARTIAL_DETECTION | AVRT concealed bypass tract: ablation | EP-study mechanism (concealed accessory pathway has no surface-ECG marker) | EP-study-mechanism | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-035 | EP | T2 | SPEC_ONLY | Post-AVR conduction: pacer indication | AVR (structural) procedure linkage + post-procedure conduction-onset timing | procedure-sequence | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-086 | EP | T1 | PARTIAL_DETECTION | VT storm: admission + sedation + ablation protocol | VT-storm episode count (>=3 sustained VT/24h) from device telemetry / shock log | device-interrogation | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-HF-021 | HF | T1 | PARTIAL_DETECTION | CRT Class I candidate not implanted | QRS duration + LBBB morphology | ECG-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-022 | HF | T2 | PARTIAL_DETECTION | CRT Class IIa candidate not implanted | QRS duration + LBBB/non-LBBB morphology | ECG-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-023 | HF | T2 | SPEC_ONLY | CRT Class IIb candidate not considered | QRS duration + non-LBBB morphology | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-029 | HF | T2 | SPEC_ONLY | CRT non-responder: upgrade/optimization evaluation | CRT response + BiV pacing % from interrogation | device-interrogation | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-030 | HF | T2 | PARTIAL_DETECTION | CIED battery ERI/EOL: generator-change planning | battery status from interrogation | device-interrogation | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-051 | HF | T1 | PARTIAL_DETECTION | ATTR-CM screening: unexplained LVH + red flags | LV wall thickness + ECG low voltage | ECG-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-052 | HF | T2 | PARTIAL_DETECTION | Amyloid workup FLC/immunofixation gap | serum free light chain / immunofixation | genetic-molecular | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-HF-053 | HF | T1 | PARTIAL_DETECTION | Amyloid workup: PYP scan not ordered | PYP scintigraphy + FLC | genetic-molecular | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-HF-055 | HF | T3 | PARTIAL_DETECTION | ATTR-CM TTR gene sequencing gap | TTR genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-056 | HF | T3 | PARTIAL_DETECTION | V122I screening Black HFpEF age>=65 | amyloid/genetic workup | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-064 | HF | T3 | SPEC_ONLY | Chagas CM screening | RBBB + LAFB ECG pattern | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-066 | HF | T3 | PARTIAL_DETECTION | Pre-anthracycline baseline assessment | baseline GLS strain | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-068 | HF | T3 | PARTIAL_DETECTION | HER2 therapy cardiac surveillance | serial GLS surveillance | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-069 | HF | T3 | PARTIAL_DETECTION | ICI myocarditis screen | GLS decline | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-075 | HF | T3 | SPEC_ONLY | Danon disease transplant evaluation | LAMP2 genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-084 | HF | T3 | SPEC_ONLY | Functional capacity not objectively assessed (6MWT/CPET) | 6-minute-walk distance / CPET peak VO2 | functional-capacity | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-085 | HF | T2 | PARTIAL_DETECTION | HF + ICD shocks appropriateness review | delivered-therapy/shock log | device-interrogation | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-134 | HF | T2 | PARTIAL_DETECTION | AL amyloid workup gap (SPEP/UPEP/FLC) | monoclonal protein / FLC | genetic-molecular | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-HF-136 | HF | T3 | SPEC_ONLY | Apical HCM missed diagnosis | segmental wall thickness + giant TWI | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-149 | HF | T2 | PARTIAL_DETECTION | LVAD pump thrombosis: hemolysis surveillance gap | LVAD pump telemetry (power/PI) + LDH/plasma-free-Hb | device-interrogation | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-HF-159 | HF | T3 | SPEC_ONLY | Familial DCM cascade screening | cascade genetic testing | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-160 | HF | T3 | SPEC_ONLY | LMNA cardiomyopathy early ICD | LMNA genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-161 | HF | T3 | SPEC_ONLY | Filamin C cardiomyopathy ICD | FLNC genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-048 | PV | T3 | SPEC_ONLY | Raynaud primary vs secondary workup | nailfold capillaroscopy | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-064 | PV | T2 | SPEC_ONLY | Recurrent DVT + thrombophilia workup gap | thrombophilia genetic panel | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-008 | SH | T3 | PARTIAL_DETECTION | Bicuspid AV surveillance gap | BAV congenital morphology + echo | genetic-molecular | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-019 | SH | T1 | SPEC_ONLY | Moderate-severe FMR (RESHAPE-HF2): heart team | FMR severity grade + heart-team doc | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-SH-049 | SH | T2 | SPEC_ONLY | Heyde syndrome workup in severe AS + GIB | AS severity + vWF multimer assay | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-051 | SH | T2 | SPEC_ONLY | Marfan syndrome surveillance interval | genetic aortopathy + echo/MRI | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-053 | SH | T2 | SPEC_ONLY | Loeys-Dietz: lower intervention threshold | LDS genotype + aortic root dimension | genetic-molecular | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-054 | SH | T2 | SPEC_ONLY | Turner syndrome: cardiac surveillance | genetic + echo/MRI surveillance | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-055 | SH | T2 | SPEC_ONLY | Vascular Ehlers-Danlos: celiprolol + surveillance | vEDS genotype + vascular imaging | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-057 | SH | T2 | SPEC_ONLY | Post-TAVR conduction: new LBBB follow-up | ECG conduction morphology | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-058 | SH | T2 | SPEC_ONLY | Post-TAVR subclinical leaflet thrombosis (HALT) | CT leaflet morphology | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-060 | SH | T2 | SPEC_ONLY | Post-TAVR permanent pacemaker need pathway | ECG conduction-disease morphology | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-064 | SH | T2 | PARTIAL_DETECTION | Transcatheter MVR candidate (non-TEER anatomy) | MR severity + annular/leaflet anatomy | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-SH-067 | SH | T2 | SPEC_ONLY | Rheumatic MS + Wilkins score for PMBC | Wilkins leaflet morphology | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-069 | SH | T2 | PARTIAL_DETECTION | Evoque TTVR candidacy (TRISCEND) | TR grade + valve anatomy | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-SH-071 | SH | T2 | SPEC_ONLY | CIED-related TR: lead extraction evaluation | TR grade + lead-leaflet imaging | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-081 | SH | T3 | SPEC_ONLY | Sinus venosus ASD identification | RA dilation + PV-anomaly anatomy | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-102 | SH | T3 | SPEC_ONLY | Cardiac mass on echo without CMR | echo mass characterization | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-SH-104 | SH | T2 | SPEC_ONLY | Septal alcohol ablation: conduction surveillance | post-procedure ECG/telemetry | ECG-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-002 | VHD | T2 | SPEC_ONLY | Mechanical AVR INR target mismatch (non-On-X) | valve model/brand attribute | device-interrogation | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-003 | VHD | T2 | SPEC_ONLY | On-X mechanical AVR: lower INR not adopted | On-X valve-model attribute | device-interrogation | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-004 | VHD | T2 | SPEC_ONLY | Mechanical MVR INR target not met | valve-position attribute | device-interrogation | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-008 | VHD | T2 | SPEC_ONLY | Warfarin pharmacogenomics in unstable INR | CYP2C9/VKORC1 genotype | genetic-molecular | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-012 | VHD | T2 | SPEC_ONLY | Post-TAVR HALT detection | 4D cardiac-CT leaflet thrombosis | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-013 | VHD | T2 | SPEC_ONLY | Post-TAVR HALT confirmed: anticoagulation | HALT imaging finding | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-017 | VHD | T2 | SPEC_ONLY | Failed SAVR bioprosthesis: ViV vs redo | SVD severity + heart-team doc | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-VHD-027 | VHD | T2 | SPEC_ONLY | Yacoub remodeling suitability | root anatomy detail | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-034 | VHD | T3 | SPEC_ONLY | Alfieri edge-to-edge for complex MR | MR-complexity morphology + technique | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-042 | VHD | T2 | SPEC_ONLY | Duke criteria 2023 documentation | echo IE findings + Duke components | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-043 | VHD | T2 | SPEC_ONLY | IE suspected: TTE first before TEE | TTE/TEE imaging sequence | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-044 | VHD | T2 | SPEC_ONLY | IE with negative TTE: TEE gap | negative-TTE finding | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-046 | VHD | T2 | SPEC_ONLY | PVE: FDG-PET/CT consideration | PVE imaging classification | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-050 | VHD | T1 | SPEC_ONLY | S. aureus bacteremia: TEE indication | TEE echo evaluation | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-VHD-053 | VHD | T2 | SPEC_ONLY | Fungal IE: surgical consideration | echo IE/vegetation finding | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-057 | VHD | T1 | SPEC_ONLY | IE + acute HF: urgent surgery | echo IE + valve-destruction severity | echo-morphology | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-VHD-059 | VHD | T2 | SPEC_ONLY | IE + embolic event on therapy: surgery | echo IE + embolic-event finding | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-062 | VHD | T2 | SPEC_ONLY | Right-sided IE in IVDU: surgery vs medical | right-sided vegetation + multi-D doc | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-069 | VHD | T2 | SPEC_ONLY | PVT confirmation: fluoroscopy stuck leaflet | cinefluoroscopic leaflet motion | device-interrogation | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-070 | VHD | T2 | SPEC_ONLY | PVT: TEE for thrombus visualization | TEE thrombus finding | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-071 | VHD | T2 | SPEC_ONLY | PVT treatment: lysis vs surgery decision | confirmed-PVT finding + decision | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-072 | VHD | T2 | SPEC_ONLY | Post-PVT: anticoagulation intensification | prior-PVT imaging confirmation | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-082 | VHD | T2 | SPEC_ONLY | Commissurotomy vs MVR decision (rheumatic) | valve morphology + decision doc | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-093 | VHD | T3 | SPEC_ONLY | Serotonergic drug + valve dysfunction | new-valve-disease echo severity | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-096 | VHD | T3 | PARTIAL_DETECTION | Radiation valve + CAD + pericardial: integrated | multi-structure imaging eval | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-097 | VHD | T3 | SPEC_ONLY | Radiation valve: TAVR vs SAVR decision | AV severity + decision doc | echo-morphology | REAL-EHR-ONLY | STANDARD-BACKFILL |

(85 rows.)

---

## 3. Tranche 2 - Synthea-expansion candidates (108)

Blocked on a synthesizable echo/physiologic numeric. NOT DUA-deferred: a Synthea-generation expansion that emits the numeric would let these build+test pre-DUA. The intersection with HIGH-PILOT-VALUE (44 gaps - see Section 5) is the candidate set for early-unblock investment.

| GAP-ID | Module | Clin-Tier | Classification | Title | Data element(s) needed | Element-type | Synthesizability | Pilot-value |
|---|---|---|---|---|---|---|---|---|
| GAP-CAD-035 | CAD | T2 | PARTIAL_DETECTION | MINOCA: IVUS/OCT for plaque disruption | intracoronary IVUS/OCT findings | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-069 | CAD | T2 | PARTIAL_DETECTION | Complex PCI without IVUS/OCT guidance | angiographic lesion morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-070 | CAD | T2 | PARTIAL_DETECTION | Stent sizing by IVUS: underexpansion risk | IVUS calcium/expansion | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-071 | CAD | T1 | SPEC_ONLY | LM disease: heart team review (SYNTAX II) | LM angiographic disease + SYNTAX | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-072 | CAD | T2 | SPEC_ONLY | CTO PCI candidate: expertise match | CTO angiographic finding | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-073 | CAD | T2 | SPEC_ONLY | Calcified lesion: atherectomy/IVL consideration | angiographic calcium burden | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-CAD-074 | CAD | T2 | SPEC_ONLY | Bifurcation PCI strategy | bifurcation lesion morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-EP-095 | EP | T2 | SPEC_ONLY | Syncope + structural heart disease: ICD eval | LV wall thickness (LVH) | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-019 | HF | T2 | PARTIAL_DETECTION | Possible undiagnosed HFpEF | E/e' + LAVI | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-020 | HF | T2 | PARTIAL_DETECTION | H2FPEF high probability without dx | E/e' + PASP | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-057 | HF | T1 | PARTIAL_DETECTION | HCM with obstruction not on myosin inhibitor | LVOT gradient | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-HF-058 | HF | T3 | PARTIAL_DETECTION | HCM SRT (septal reduction) candidate | LVOT gradient on max therapy | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-059 | HF | T3 | PARTIAL_DETECTION | HCM SCD risk stratification | max wall thickness + risk factors | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-060 | HF | T3 | PARTIAL_DETECTION | Fabry disease screening | unexplained-LVH wall thickness | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-142 | HF | T3 | SPEC_ONLY | Constrictive pericarditis in HFpEF | septal bounce / discordance | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-HF-146 | HF | T2 | SPEC_ONLY | Tamponade physiology on echo | RV collapse / IVC plethora | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-001 | PV | T2 | PARTIAL_DETECTION | PAD: ABI never measured in symptomatic patient | ABI flowsheet value | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-PV-002 | PV | T2 | PARTIAL_DETECTION | Diabetic + PAD risk: ABI screening gap | ABI value | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-PV-003 | PV | T2 | PARTIAL_DETECTION | Abnormal ABI (<=0.9) without PAD dx | ABI result | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-PV-004 | PV | T2 | SPEC_ONLY | Non-compressible ABI (>1.4): TBI follow-up | ABI + toe-brachial index | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-PV-005 | PV | T2 | SPEC_ONLY | PAD: exercise ABI for normal resting ABI | resting + exercise ABI | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-PV-020 | PV | T2 | SPEC_ONLY | Pedal loop angioplasty for distal CLTI | infrapopliteal TASC lesion morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-021 | PV | T2 | SPEC_ONLY | CLTI: WIfI staging documentation | wound grade + ABI/TcPO2 + infection | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-023 | PV | T2 | SPEC_ONLY | TASC II A/B iliac lesion: endovascular | iliac TASC class from imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-024 | PV | T2 | PARTIAL_DETECTION | TASC II C/D iliac: endovascular or bypass | iliac TASC class from imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-025 | PV | T2 | SPEC_ONLY | TASC II A/B fem-pop: endovascular first | fem-pop TASC class from imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-026 | PV | T2 | SPEC_ONLY | TASC II C/D fem-pop: hybrid vs bypass | fem-pop TASC class + decision | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-027 | PV | T2 | SPEC_ONLY | CERAB: complex aortoiliac | aortoiliac imaging morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-031 | PV | T2 | SPEC_ONLY | Median arcuate ligament syndrome consideration | celiac compression on imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-036 | PV | T2 | SPEC_ONLY | Flash pulmonary edema + bilateral RAS | bilateral RAS severity on imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-043 | PV | T2 | SPEC_ONLY | Subclavian stenosis: BP differential >15 arms | bilateral-arm BP pair | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-044 | PV | T2 | SPEC_ONLY | Subclavian steal syndrome: symptoms + imaging | vertebral flow duplex morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-052 | PV | T3 | SPEC_ONLY | AAA surveillance: 3.0-3.9 every 3 years | AAA diameter + US dates | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-053 | PV | T3 | SPEC_ONLY | AAA surveillance: 4.0-4.9 annual | AAA diameter + US dates | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-054 | PV | T3 | SPEC_ONLY | AAA surveillance: 5.0-5.4 every 6 months | AAA diameter + US dates | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-055 | PV | T1 | SPEC_ONLY | AAA >=5.5 cm (male) intervention threshold | AAA diameter (cm) | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-056 | PV | T1 | SPEC_ONLY | AAA >=5.0 cm (female) intervention threshold | AAA diameter (cm) | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-057 | PV | T2 | SPEC_ONLY | AAA rapid expansion: intervention | serial AAA diameters | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-058 | PV | T1 | SPEC_ONLY | Symptomatic carotid >=70%: revasc within 2 weeks | carotid stenosis % | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-059 | PV | T2 | PARTIAL_DETECTION | CREST-2: asymptomatic carotid 70-99% decision | carotid stenosis % + decision | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-065 | PV | T2 | PARTIAL_DETECTION | May-Thurner: left iliac DVT + compression | iliac vein compression on imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-073 | PV | T2 | SPEC_ONLY | PE + RV strain: catheter-directed therapy eval | RV size / TAPSE | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-091 | PV | T3 | SPEC_ONLY | AVF surveillance: annual access flow | dialysis-access flow rate | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-PV-100 | PV | T3 | SPEC_ONLY | Endoleak detection post-EVAR: type and management | endoleak type on surveillance imaging | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-001 | SH | T1 | PARTIAL_DETECTION | Severe AS asymptomatic: heart team (EARLY TAVR) | AV Vmax / mean gradient / AVA | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-002 | SH | T1 | PARTIAL_DETECTION | Severe AS symptomatic: AVR not referred | AV Vmax/MG/AVA | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-003 | SH | T1 | SPEC_ONLY | LFLG AS: dobutamine stress echo not performed | AVA, mean gradient | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-004 | SH | T2 | SPEC_ONLY | Paradoxical LFLG AS detection | AVA, MG, SVi | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-005 | SH | T2 | PARTIAL_DETECTION | Moderate AS with rapid progression | serial Vmax | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-006 | SH | T1 | PARTIAL_DETECTION | Class IIa severe AS triggers | AS severity + stress result | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-007 | SH | T2 | PARTIAL_DETECTION | Severe AS + LV dimensional changes | serial LVESD | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-009 | SH | T3 | PARTIAL_DETECTION | BAV aortopathy: ascending aorta surveillance | ascending-aorta dimension | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-010 | SH | T3 | SPEC_ONLY | BAV aortopathy intervention threshold | ascending-aorta dimension | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-012 | SH | T2 | PARTIAL_DETECTION | Prosthetic valve structural deterioration | serial mean gradient | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-013 | SH | T2 | PARTIAL_DETECTION | Post-TAVR paravalvular leak moderate+ | PVL grade on echo | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-014 | SH | T1 | PARTIAL_DETECTION | Severe primary MR: surgical referral | EROA / vena contracta / regurg volume | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-015 | SH | T1 | PARTIAL_DETECTION | Asymptomatic severe MR with LVEF 30-60 | MR severity + LVESD | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-017 | SH | T2 | SPEC_ONLY | Severe primary MR + PASP>50: surgical IIa | MR severity + PASP | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-018 | SH | T1 | PARTIAL_DETECTION | COAPT-eligible FMR not referred for TEER | EROA + LVESD + FMR grade | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-020 | SH | T2 | PARTIAL_DETECTION | Mitral stenosis severity grading gap | MVA + mean gradient | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-021 | SH | T2 | SPEC_ONLY | Severe MS: intervention evaluation | MVA + symptom status | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-022 | SH | T1 | PARTIAL_DETECTION | Severe TR: transcatheter evaluation gap | TR severity grade | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-023 | SH | T3 | PARTIAL_DETECTION | TR device selection: coaptation gap + lead | TR coaptation gap measure | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-024 | SH | T3 | PARTIAL_DETECTION | RV dysfunction in TR (TAPSE<17 / FAC<35) | TAPSE, FAC | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-025 | SH | T3 | SPEC_ONLY | Ascending aortic aneurysm surveillance by size | aortic dimension + imaging dates | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-027 | SH | T2 | PARTIAL_DETECTION | ASD significant shunt: intervention evaluation | RV size, PASP (Qp:Qs) | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-048 | SH | T2 | PARTIAL_DETECTION | Severe AS + CAD: staged PCI vs combined | AS severity (gradient/AVA) | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-050 | SH | T2 | SPEC_ONLY | AS severity grading gap | AVA, MG, Vmax | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-061 | SH | T1 | PARTIAL_DETECTION | ViV TAVR for failed surgical bioprosthesis | prosthetic gradient (SVD) | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-062 | SH | T2 | SPEC_ONLY | Prosthesis-patient mismatch (iEOA<0.65) | valve EOA + BSA-indexed iEOA | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-066 | SH | T2 | SPEC_ONLY | Recurrent MR after TEER: redo vs surgery | serial MR grade post-TEER | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-072 | SH | T2 | SPEC_ONLY | Ascending aorta intervention threshold >=5.5 | ascending-aortic dimension | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-073 | SH | T2 | SPEC_ONLY | Descending/TAA aneurysm >=5.5-6.0 cm | descending-aortic dimension | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-SH-083 | SH | T2 | SPEC_ONLY | Residual shunt post-closure: surveillance | residual-shunt grade on echo | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-084 | SH | T2 | SPEC_ONLY | PH Group 1 (PAH) diagnostic confirmation gap | PASP (echo) | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-SH-085 | SH | T2 | SPEC_ONLY | PH Group 2 (left-heart) classification | PASP + PCWP/mPAP | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-010 | VHD | T2 | SPEC_ONLY | Bioprosthetic valve surveillance echo gap | surveillance-echo presence/severity | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-011 | VHD | T2 | PARTIAL_DETECTION | Bioprosthetic structural valve deterioration | serial gradient rise + new PVL | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-020 | VHD | T2 | SPEC_ONLY | Heyde syndrome screening in severe AS + GIB | quantitative AS severity | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-021 | VHD | T2 | SPEC_ONLY | Patient-prosthesis mismatch iEOA<0.65 | EOA + valve-size + BSA | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-022 | VHD | T2 | SPEC_ONLY | Severe PPM (iEOA<0.55) management | iEOA value | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-023 | VHD | T3 | SPEC_ONLY | Sutureless/rapid-deployment valve eval | annular dimension | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-026 | VHD | T2 | SPEC_ONLY | Valve-sparing root (David) eval | aortic-root dilation + leaflet status | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-028 | VHD | T2 | SPEC_ONLY | Bentall for root + valve disease | root size (aneurysm) | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-029 | VHD | T2 | SPEC_ONLY | Stentless valve in small root | annulus size | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-039 | VHD | T2 | PARTIAL_DETECTION | Tricuspid annuloplasty with left-sided surgery | TR grade + annulus size | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-041 | VHD | T2 | SPEC_ONLY | Root enlargement for small annulus | annulus size | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-058 | VHD | T1 | SPEC_ONLY | IE + perivalvular abscess: surgery | perivalvular abscess echo finding | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-060 | VHD | T2 | SPEC_ONLY | IE + large mobile vegetation (>10mm): surgery | vegetation size/mobility | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-061 | VHD | T1 | SPEC_ONLY | PVE with dehiscence/fistula: urgent surgery | dehiscence/fistula imaging | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-068 | VHD | T1 | PARTIAL_DETECTION | Mechanical PVT: elevated gradient | serial prosthetic mean-gradient | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-073 | VHD | T3 | SPEC_ONLY | Baseline post-op echo before discharge | pre-discharge echo presence | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-074 | VHD | T3 | SPEC_ONLY | 30-day post-op echo gap | 30-day echo presence | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-075 | VHD | T3 | SPEC_ONLY | 6-month post-op echo gap | 6-month echo presence | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-076 | VHD | T3 | SPEC_ONLY | Annual post-op echo gap | annual echo presence | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-078 | VHD | T2 | SPEC_ONLY | Prosthesis dysfunction: mean gradient >20 | post-op mean gradient | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-080 | VHD | T2 | SPEC_ONLY | Rheumatic MS + Wilkins score for PMBC | TEE Wilkins valve-morphology | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-081 | VHD | T2 | SPEC_ONLY | PMBC candidacy: anatomy-based selection | Wilkins + valve anatomy | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-086 | VHD | T3 | SPEC_ONLY | Carcinoid heart: TV/PV surveillance echo | surveillance-echo TV/PV involvement | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-088 | VHD | T3 | SPEC_ONLY | Carcinoid heart: TV/PV surgery timing | severe-TV-disease echo severity | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-091 | VHD | T3 | SPEC_ONLY | Dopamine agonist valve surveillance | surveillance-echo presence | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-092 | VHD | T3 | SPEC_ONLY | Ergotamine: valvular surveillance | surveillance-echo presence | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-094 | VHD | T3 | SPEC_ONLY | Anorectic history: valve surveillance | new-valve echo finding | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-095 | VHD | T3 | PARTIAL_DETECTION | Prior chest radiation: valve surveillance | surveillance-echo presence | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-102 | VHD | T3 | SPEC_ONLY | Moderate AR progression surveillance | AR grade + surveillance echo | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-103 | VHD | T2 | SPEC_ONLY | Severe chronic AR asymptomatic: surgical thresholds | AR severity + LVESD | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |
| GAP-VHD-104 | VHD | T3 | SPEC_ONLY | Mixed valve disease: comprehensive staging | multi-valve severity grading | echo-morphology | SYNTHEA-EXPANDABLE | STANDARD-BACKFILL |
| GAP-VHD-105 | VHD | T3 | SPEC_ONLY | Primary MR grade underestimation single-measure | EROA + regurg-volume + vena contracta | echo-morphology | SYNTHEA-EXPANDABLE | HIGH-PILOT-VALUE |

(108 rows.)

---

## 4. Tranche 3 - process/documentation-gated (54)

Real-EHR-only documentation (pharmacy fill/PDC, shared-decision/heart-team/counseling notes, staging flowsheets, risk scores). Not synthesizable in a way that proves real behavior; requires real EHR data flow. NOT part of the DUA-deferred count, recorded for completeness.

| GAP-ID | Module | Clin-Tier | Classification | Title | Data element(s) needed | Element-type | Synthesizability | Pilot-value |
|---|---|---|---|---|---|---|---|---|
| GAP-CAD-044 | CAD | T2 | PARTIAL_DETECTION | Post-MI SSRI consideration for depression | PHQ-9 screening result | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-056 | CAD | T1 | SPEC_ONLY | Statin prescribed but not filled | pharmacy fill / claims | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-057 | CAD | T1 | SPEC_ONLY | Statin chronic adherence PDC<80% | longitudinal pharmacy fill | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-058 | CAD | T2 | SPEC_ONLY | PCSK9i prior auth gap / cost barrier | fill status + PA/denial codes | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-076 | CAD | T2 | SPEC_ONLY | Subacute stent thrombosis: DAPT compliance | DAPT fill/adherence | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-078 | CAD | T2 | SPEC_ONLY | Shock team activation documentation | shock-team consult notes | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-CAD-079 | CAD | T3 | PARTIAL_DETECTION | ICD patient + drive/employment counseling | counseling flowsheet | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-002 | EP | T2 | SPEC_ONLY | AF: Warfarin with TTR<65% | serial INR / TTR longitudinal | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-031 | EP | T2 | PARTIAL_DETECTION | Vasovagal syncope recurrent: tilt or ILR | vasovagal subtype + recurrence (R55 generic; not codable) | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-036 | EP | T2 | SPEC_ONLY | Leadless pacemaker candidate: option discussion | leadless-option shared-decision documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-094 | EP | T2 | PARTIAL_DETECTION | Exertional syncope: structural workup gap | exertional-syncope pattern (clinical context; not codable) | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-064 | EP | T1 | SPEC_ONLY | AF: OAC prescribed but not filled | e-Rx vs pharmacy fill | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-EP-065 | EP | T1 | SPEC_ONLY | AF: OAC adherence PDC<80% | pharmacy claim fills | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-HF-087 | HF | T3 | SPEC_ONLY | Chronic opioid + untreated OSA in HF: risk review | OSA documentation (sleep-study AHI / STOP-BANG) + opioid list | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-006 | PV | T2 | SPEC_ONLY | PAD Rutherford classification gap | Rutherford stage documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-007 | PV | T2 | SPEC_ONLY | PAD Fontaine staging | Fontaine stage documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-017 | PV | T1 | PARTIAL_DETECTION | CLTI: BEST-CLI-eligible heart team discussion | heart team referral doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-018 | PV | T1 | PARTIAL_DETECTION | CLTI: endovascular vs surgical decision | documented intervention strategy | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-019 | PV | T2 | SPEC_ONLY | CLTI + diabetic foot: multidisciplinary team | MDT podiatry/wound referral | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-022 | PV | T2 | SPEC_ONLY | CLTI: SVS amputation risk assessment | risk-stratification flowsheet | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-035 | PV | T2 | SPEC_ONLY | RAS intervention: CORAL-aligned decision docs | documented decision rationale | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-041 | PV | T2 | SPEC_ONLY | Buerger disease: smoking cessation critical | intensive cessation intervention doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-068 | PV | T2 | SPEC_ONLY | IVC filter: contraindication to AC documented | documented AC contraindication | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-072 | PV | T2 | SPEC_ONLY | PESI or sPESI risk stratification not documented | PESI/sPESI score documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-077 | PV | T2 | SPEC_ONLY | Unprovoked PE: cancer screening | cancer-screening status doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-079 | PV | T1 | SPEC_ONLY | CTEPH dx: PTE evaluation (operable vs not) | PTE referral/eligibility doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-082 | PV | T2 | SPEC_ONLY | PAH functional class not documented | WHO functional class flowsheet | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-083 | PV | T2 | SPEC_ONLY | PAH risk stratification | ESC/ERS or REVEAL score components | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-086 | PV | T2 | SPEC_ONLY | PAH + functional decline: prostacyclin escalation | FC trend documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-087 | PV | T2 | SPEC_ONLY | PAH lung transplant referral timing | PAH risk doc + transplant referral | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-094 | PV | T3 | PARTIAL_DETECTION | Lymphedema staging documentation | ISL stage documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-095 | PV | T3 | PARTIAL_DETECTION | Secondary lymphedema after cancer: CDT referral | CDT referral documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-096 | PV | T2 | SPEC_ONLY | Pre-vascular surgery cardiac risk stratification | RCRI/NSQIP pre-op score doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-102 | PV | T2 | SPEC_ONLY | Rural/ADI-high + PAD: SET telehealth alternative | ADI overlay + SET enrollment | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-103 | PV | T2 | SPEC_ONLY | Pregnancy + vascular emergency plan | coordinated care-plan documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-104 | PV | T3 | SPEC_ONLY | Transgender hormone therapy + VTE risk counseling | VTE-risk counseling documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-PV-105 | PV | T2 | SPEC_ONLY | Elderly + PAD + frailty: Clinical Frailty Scale | CFS frailty score documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-009 | VHD | T2 | SPEC_ONLY | Home INR monitoring eligible but not offered | home-INR offer documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-018 | VHD | T2 | SPEC_ONLY | Prosthesis selection: mech in elderly | shared-decision documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-019 | VHD | T2 | SPEC_ONLY | Prosthesis selection: bio in young | shared-decision documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-030 | VHD | T2 | SPEC_ONLY | MV repair-rate reference-center referral | facility MV-repair-rate metric | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-031 | VHD | T2 | SPEC_ONLY | Robotic MVR candidacy | procedure-approach discussion | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-032 | VHD | T2 | SPEC_ONLY | MV repair-feasibility documentation | repair-attempt/feasibility note | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-033 | VHD | T2 | SPEC_ONLY | Chordal preservation technique documentation | operative-technique note | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-035 | VHD | T2 | SPEC_ONLY | MitraClip/TEER vs surgery heart-team decision | heart-team decision doc | social-process-doc | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-VHD-037 | VHD | T2 | SPEC_ONLY | Concomitant Maze at valve surgery w/ AF | intra-op Maze documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-038 | VHD | T2 | SPEC_ONLY | LAA exclusion at cardiac surgery | intra-op LAA-exclusion documentation | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-045 | VHD | T2 | SPEC_ONLY | Blood culture-negative IE: expanded workup | BCN-status + serology panel | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-084 | VHD | T3 | SPEC_ONLY | Rheumatic fever family screening | family-member echo screening referral | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-085 | VHD | T3 | SPEC_ONLY | Carcinoid syndrome: 24-hr urinary 5-HIAA gap | 24-hour urinary 5-HIAA | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-098 | VHD | T2 | PARTIAL_DETECTION | Mechanical valve + pregnancy: pre-conception counseling | counseling flowsheet | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-099 | VHD | T1 | SPEC_ONLY | Mech valve + pregnancy 1st-trimester: LMWH protocol | pregnancy-trimester + transition-protocol | social-process-doc | REAL-EHR-ONLY | HIGH-PILOT-VALUE |
| GAP-VHD-100 | VHD | T2 | SPEC_ONLY | Mech valve + pregnancy: anti-Xa monitoring | peak anti-Xa level | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |
| GAP-VHD-101 | VHD | T2 | SPEC_ONLY | Mech valve + pregnancy 36wk: delivery plan | gestational-age + delivery-plan doc | social-process-doc | REAL-EHR-ONLY | STANDARD-BACKFILL |

(54 rows.)

---

## 5. Element-type rollup - the "what to ingest at DUA" worklist

Ranked by Tranche-1 (DUA-deferred) gaps unblocked. This is the future ingestion worklist for when real EHR data lands.

| Element-type (data feed to ingest at DUA) | Tranche-1 gaps unblocked | Notes |
|---|---|---|
| echo-morphology (REAL-EHR-ONLY imaging) | 34 | endocarditis/PVT TEE findings, HALT/CT-leaflet, Wilkins scoring, GLS strain, cardiac-mass characterization, valve anatomy. Tranche-2 adds 108 more echo gaps that a synthesizable numeric would unblock. |
| genetic-molecular | 23 | amyloid typing (PYP/FLC/immunofixation), inherited-CM genotype (TTR, LMNA, FLNC, LAMP2), channelopathy genotype (LQT1/2/3), FH/PRS/ApoB, thrombophilia, pharmacogenomics. |
| device-interrogation | 14 | CIED pacing %, shocks/therapy log, lead impedance/history, device model/recall/MRI-conditional, valve-model identity, LVAD pump telemetry (power/PI), VT-storm episode count (EP-086). |
| ECG-morphology | 10 | QRS duration + LBBB/RBBB morphology (CRT), low-voltage, fragmented QRS/TWI, ST-segment, conduction-disease post-procedure. (AUDIT-070: QRS/QTc not FHIR-ingested.) |
| functional-capacity (REAL-EHR-ONLY) | 1 | HF-084 6-minute-walk distance / CPET peak VO2. Added in the HF-buildout reconciliation; not emitted by the current Synthea generator. (HF-087, the OSA/STOP-BANG case, is social-process-doc -> Tranche 3, not counted here.) |
| EP-study-mechanism (REAL-EHR-ONLY) | 2 | EP-075 focal AT + EP-077 concealed AVRT. Added in the EP-buildout chunk-2 reconciliation: ICD-10 I47.1 does not distinguish AVNRT/AVRT/focal-AT, and a concealed accessory pathway has no surface-ECG marker - the mechanism needs an electrophysiology-study report (not ingested). |
| procedure-sequence (REAL-EHR-ONLY) | 1 | EP-035 post-AVR conduction pacer indication. Added in the EP-buildout chunk-3 reconciliation: needs the AVR (structural) procedure linkage plus the post-procedure conduction-onset timing (new AV block AFTER the valve replacement) - neither the AVR CPT linkage nor the temporal sequence is ingested. |

Cross-tier ingestion leverage (all tranches, ranked by total gaps a feed unblocks):
- Quantitative echo/imaging numeric feed (valve gradient/area, EROA, dimensions, ABI, stenosis %, PASP, E/e', GLS, TAPSE): 142 gaps (34 Tranche-1 REAL + 108 Tranche-2 synthesizable). The single highest-leverage ingestion target.
- Pharmacy fill / claims feed (PDC, primary non-adherence): ~8 gaps (Tranche-3 adherence cluster).
- Device-interrogation feed: 13 gaps. Genetic/molecular feed: 23 gaps. ECG waveform/interval feed: 10 gaps. Functional-capacity (6MWT/CPET) feed: 1 gap.

## 6. Early-unblock candidate set (Synthea-expansion investment)

The intersection (Tranche-2 SYNTHEA-EXPANDABLE AND HIGH-PILOT-VALUE) is the candidate set for possible early-unblock via Synthea-generation expansion before DUA: **44 gaps** - SH 21, VHD 16, PV 5, HF 2. Dominated by AS/MR/TR/AR severity grading and valve-intervention-timing gaps (high structural-heart / valvular commercial value). Building synthetic quantitative-echo emission into the Synthea generator would let these build+test pre-DUA. Operator finalizes per-gap.

---

## 7. Method and caveats

- **Ingested-data baseline (what does NOT block a gap):** ICD-10 dx; RxNorm meds (ingredient-expanded per AUDIT-118) + med start-date (PR #396); procedure codes CPT+SNOMED (PR #396); age/sex/race; labs BNP, NT-proBNP, Troponin, CK-MB, Total Cholesterol, LDL, HDL, Triglycerides, HbA1c, Creatinine, eGFR, INR, PT, PTT, D-dimer; vitals BP sys/dia, HR, RR, Temp, O2 sat, Weight, Height, BMI; LVEF numeric.
- **Tranche rule (deterministic):** Tranche 1 if element-type is device-interrogation OR genetic-molecular OR ECG-morphology OR (echo-morphology AND REAL-EHR-ONLY) OR functional-capacity OR EP-study-mechanism OR procedure-sequence. Tranche 2 if echo-morphology AND SYNTHEA-EXPANDABLE. Tranche 3 if social-process-doc. (functional-capacity was added to the Tranche-1 clause in the 2026-06-16 HF-buildout reconciliation - HF-084 6MWT/CPET, real-EHR-only and not emitted by the current Synthea generator. HF-087, the OSA/STOP-BANG case, is social-process-doc and therefore Tranche 3 per this rule. HF-149 (LVAD pump-thrombosis) is Tranche 1 via device-interrogation (LVAD pump telemetry); its LDH / plasma-free-Hb adjunct is also a non-ingested lab, not in the baseline panel above. EP-study-mechanism was added in the 2026-06-16 EP-buildout chunk-2 reconciliation - EP-075 focal AT and EP-077 concealed AVRT need an electrophysiology-study mechanism distinction that ICD-10 / surface ECG cannot supply; real-EHR-only, not synthesizable.)
- **The 79 vs ~52 estimate:** see Section 1 reconciliation. The Tranche-1/Tranche-2 boundary (REAL-EHR-ONLY vs SYNTHEA-EXPANDABLE echo) is a per-gap clinical judgment and the single knob that moves the count; the synthesizability column is recorded per-gap so the boundary can be retuned on review.
- **DET_OK-watch exclusions:** four EP gaps (GAP-EP-018 AHRE, GAP-EP-023 Brugada, GAP-EP-050 / GAP-EP-089 inappropriate-ICD-shocks) carry a DET_OK evaluator that fires on a proxy rather than the true blocked trigger (device-interrogation / ECG-morphology). They are NOT counted here (filter excludes DET_OK) but are flagged: their detection is proxy-only until the real device/ECG feed lands.
- **Clinical-tier (T1/T2/T3) in the tables is the spec clinical-priority marker, NOT the tranche number.** Do not confuse with Tranche 1/2/3.
- This register is docs-only and changes no gap rule, spec, or canonical artifact. It records scope; it does not build.

---

## CPT-verification-blocked sub-tranche (NEW, 2026-06-17)

**Distinct from Tranche 1 (DUA echo-morphology), Tranche 2 (Synthea-expandable numeric), and Tranche 3 (process/doc).** These gaps are NOT data-blocked: the `procedureCodes` param is threaded engine-wide (PR #396) and both runners populate it. They are VERIFICATION-blocked: they must gate on a structural-procedure CPT.

**UNBLOCKED 2026-06-17 (manufacturer-guide verification + operator sign-off):** the CPT bar was met for the closure + mitral-TEER codes via device-manufacturer reimbursement guides (the reachable authoritative public source - see §16.7). The following moved OUT of this tranche and are now BUILT: GAP-SH-082 + GAP-SH-083 (gate on `93580` ASD/PFO or `93581` VSD closure - Abbott Amplatzer guide), GAP-SH-065 + GAP-SH-066 (gate on `33418`/`33419` mitral TEER - Abbott MitraClip guide; MITRAL, not the mislabeled tricuspid `0544T/0545T`). Each consumes the existing `procedureCodes` param; no threading needed.

**STILL PARKED (did not clear the two-key CPT bar):**

| GAP-ID | Module | Title | CPT needed | Why still parked | Buildable when |
|---|---|---|---|---|---|
| GAP-SH-104 | SH | Septal alcohol ablation: post-procedure conduction surveillance | alcohol septal ablation (candidate 93583) | 93583 is confirmable only via NON-manufacturer sources (encyclopedia / generic coding pages); no device reimbursement guide exists for an alcohol-and-balloon technique, so it does NOT clear the §16.7 two-key bar. | an authoritative source (AMA/AHA Coding Clinic, or operator-direct) confirms 93583 |

**TEVAR currency note (no gap parked here):** SH-075 names TEVAR as recommendation text (no CPT gate), so no action. For any FUTURE TEVAR CPT gate, use the CPT-2026-current set `{33880, 33881, 33882, 33883, 33886}`; the formerly-candidate `33884/33889/33891` were DELETED in CPT 2026 (per §16.7 annual-currency).

**Optional cleanup (not a new gap):** the VHD LAAC-TEE-follow-up gap detects LAAC via the over-broad `Z95.818` instead of the manufacturer-confirmed `LAAC_CPT` (33340, Boston Scientific Watchman guide) that the EP module already uses. Migrate to 33340 when the CPT-cleanup pass runs. Not blocking; opportunistic.

**Related finding:** AUDIT-168 (RESOLVED 2026-06-17 - the suspect structural CPTs were manufacturer-verified; the confirmed-wrong `0544T/0545T` tricuspid-TEER mislabel was corrected to `0569T/0570T`).

---

## PV chunk-1 threading/code-blocked sub-tranche (NEW, 2026-06-18)

**Source:** the PV chunk-1 buildout §16/threading gate found 3 of the banked PV audit's "~10 buildable" gaps over-assumed threading (the AUDIT-181 ApoB over-assumption class). They were NOT built (avoiding the AUDIT-177 always-fire-proxy), held SPEC_ONLY, and recorded here for the post-modules re-audit. These do NOT change the Section-1 counts (already in the 510 non-DET_OK buckets). See findings register **AUDIT-183**.

| GAP-ID | Module | Title | Blocked element | Tranche | Unblock path |
|---|---|---|---|---|---|
| GAP-PV-021 | PV | CLTI: WIfI staging documentation | `wifi_score` is a `type:string` csvSchema column NOT wired to `labValues` (`Record<string,number>`, populated from the patientWriter `labFields` allowlist) - always undefined at the engine | Tranche 3 (process/doc - staging score) | a threading PR (AUDIT-070 class) mapping WIfI to a numeric/staged observation reaching `labValues` |
| GAP-PV-037 | PV | Takayasu: serial ESR/CRP + imaging surveillance | neither ESR nor CRP is threaded (no observationService FHIR LOINC->slug mapping; not in the CSV `labFields` allowlist) - `labValues['crp']`/`['esr']` always undefined | Tranche 2 (Synthea-expandable numeric) | a threading PR (AUDIT-070 class) mapping ESR + CRP LOINCs on both FHIR + CSV paths |
| GAP-PV-060 | PV | Post-CEA/CAS antiplatelet + statin continuation | no clean post-carotid-revascularization ICD-10 code (`Z95.820` = peripheral angioplasty status, not carotid; CEA leaves no implant code) | code-floor (procedure-signal) | gate on a carotid-revasc CPT (`35301` CEA / `37215`-`37216` CAS) once procedure threading covers carotid revasc, OR a Z-code convention |
