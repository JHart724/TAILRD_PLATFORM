/**
 * TAILRD Platform — ICD-10-CM Code Lookup Service
 *
 * Clinically relevant ICD-10-CM codes for the 104 TAILRD gaps across
 * Heart Failure, EP, CAD, Structural Heart, Valvular Disease,
 * and Peripheral Vascular modules.
 */

import { ICD10Code } from './types';

// ---------------------------------------------------------------------------
// Master ICD-10-CM Registry
// ---------------------------------------------------------------------------
export const ICD10_CODES: Record<string, ICD10Code> = {
  // =========================================================================
  // HEART FAILURE  (I50.x, I42.x, E85.x)
  // =========================================================================
  'I50': { code: 'I50', description: 'Heart failure', category: 'Heart Failure', isLeaf: false, parentCode: null },
  'I50.1': { code: 'I50.1', description: 'Left ventricular failure, unspecified', category: 'Heart Failure', isLeaf: true, parentCode: 'I50' },
  'I50.2': { code: 'I50.2', description: 'Systolic (congestive) heart failure', category: 'Heart Failure', isLeaf: false, parentCode: 'I50' },
  'I50.20': { code: 'I50.20', description: 'Unspecified systolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.2' },
  'I50.21': { code: 'I50.21', description: 'Acute systolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.2' },
  'I50.22': { code: 'I50.22', description: 'Chronic systolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.2' },
  'I50.23': { code: 'I50.23', description: 'Acute on chronic systolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.2' },
  'I50.3': { code: 'I50.3', description: 'Diastolic (congestive) heart failure', category: 'Heart Failure', isLeaf: false, parentCode: 'I50' },
  'I50.30': { code: 'I50.30', description: 'Unspecified diastolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.3' },
  'I50.31': { code: 'I50.31', description: 'Acute diastolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.3' },
  'I50.32': { code: 'I50.32', description: 'Chronic diastolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.3' },
  'I50.33': { code: 'I50.33', description: 'Acute on chronic diastolic (congestive) heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.3' },
  'I50.4': { code: 'I50.4', description: 'Combined systolic and diastolic heart failure', category: 'Heart Failure', isLeaf: false, parentCode: 'I50' },
  'I50.40': { code: 'I50.40', description: 'Unspecified combined systolic and diastolic HF', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.4' },
  'I50.41': { code: 'I50.41', description: 'Acute combined systolic and diastolic HF', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.4' },
  'I50.42': { code: 'I50.42', description: 'Chronic combined systolic and diastolic HF', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.4' },
  'I50.43': { code: 'I50.43', description: 'Acute on chronic combined systolic and diastolic HF', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.4' },
  'I50.8': { code: 'I50.8', description: 'Other heart failure', category: 'Heart Failure', isLeaf: false, parentCode: 'I50' },
  'I50.81': { code: 'I50.81', description: 'Right heart failure', category: 'Heart Failure', isLeaf: false, parentCode: 'I50.8' },
  'I50.810': { code: 'I50.810', description: 'Right heart failure, unspecified', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.81' },
  'I50.811': { code: 'I50.811', description: 'Acute right heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.81' },
  'I50.812': { code: 'I50.812', description: 'Chronic right heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.81' },
  'I50.813': { code: 'I50.813', description: 'Acute on chronic right heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.81' },
  'I50.814': { code: 'I50.814', description: 'Right heart failure due to left heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.81' },
  'I50.82': { code: 'I50.82', description: 'Biventricular heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.8' },
  'I50.83': { code: 'I50.83', description: 'High output heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.8' },
  'I50.84': { code: 'I50.84', description: 'End stage heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.8' },
  'I50.89': { code: 'I50.89', description: 'Other heart failure', category: 'Heart Failure', isLeaf: true, parentCode: 'I50.8' },
  'I50.9': { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Heart Failure', isLeaf: true, parentCode: 'I50' },

  // Cardiomyopathy
  'I42': { code: 'I42', description: 'Cardiomyopathy', category: 'Cardiomyopathy', isLeaf: false, parentCode: null },
  'I42.0': { code: 'I42.0', description: 'Dilated cardiomyopathy', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.1': { code: 'I42.1', description: 'Obstructive hypertrophic cardiomyopathy', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.2': { code: 'I42.2', description: 'Other hypertrophic cardiomyopathy', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.3': { code: 'I42.3', description: 'Endomyocardial (eosinophilic) disease', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.4': { code: 'I42.4', description: 'Endocardial fibroelastosis', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.5': { code: 'I42.5', description: 'Other restrictive cardiomyopathy', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.6': { code: 'I42.6', description: 'Alcoholic cardiomyopathy', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.7': { code: 'I42.7', description: 'Cardiomyopathy due to drug and external agent', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.8': { code: 'I42.8', description: 'Other cardiomyopathies', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },
  'I42.9': { code: 'I42.9', description: 'Cardiomyopathy, unspecified', category: 'Cardiomyopathy', isLeaf: true, parentCode: 'I42' },

  // Amyloidosis
  'E85': { code: 'E85', description: 'Amyloidosis', category: 'Amyloidosis', isLeaf: false, parentCode: null },
  'E85.1': { code: 'E85.1', description: 'Neuropathic heredofamilial amyloidosis (hATTR)', category: 'Amyloidosis', isLeaf: true, parentCode: 'E85' },
  'E85.4': { code: 'E85.4', description: 'Organ-limited amyloidosis', category: 'Amyloidosis', isLeaf: true, parentCode: 'E85' },
  'E85.81': { code: 'E85.81', description: 'Light chain (AL) amyloidosis', category: 'Amyloidosis', isLeaf: true, parentCode: 'E85' },
  'E85.82': { code: 'E85.82', description: 'Wild-type transthyretin-related (ATTRwt) amyloidosis', category: 'Amyloidosis', isLeaf: true, parentCode: 'E85' },
  'E85.89': { code: 'E85.89', description: 'Other amyloidosis', category: 'Amyloidosis', isLeaf: true, parentCode: 'E85' },

  // =========================================================================
  // ATRIAL FIBRILLATION / ELECTROPHYSIOLOGY  (I48.x, I45.x, I47.x, I49.x)
  // =========================================================================
  'I48': { code: 'I48', description: 'Atrial fibrillation and flutter', category: 'Arrhythmia', isLeaf: false, parentCode: null },
  'I48.0': { code: 'I48.0', description: 'Paroxysmal atrial fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48' },
  'I48.1': { code: 'I48.1', description: 'Persistent atrial fibrillation', category: 'Arrhythmia', isLeaf: false, parentCode: 'I48' },
  'I48.11': { code: 'I48.11', description: 'Longstanding persistent atrial fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48.1' },
  'I48.19': { code: 'I48.19', description: 'Other persistent atrial fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48.1' },
  'I48.2': { code: 'I48.2', description: 'Chronic atrial fibrillation', category: 'Arrhythmia', isLeaf: false, parentCode: 'I48' },
  'I48.20': { code: 'I48.20', description: 'Chronic atrial fibrillation, unspecified', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48.2' },
  'I48.21': { code: 'I48.21', description: 'Permanent atrial fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48.2' },
  'I48.3': { code: 'I48.3', description: 'Typical atrial flutter', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48' },
  'I48.4': { code: 'I48.4', description: 'Atypical atrial flutter', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48' },
  'I48.91': { code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48' },
  'I48.92': { code: 'I48.92', description: 'Unspecified atrial flutter', category: 'Arrhythmia', isLeaf: true, parentCode: 'I48' },

  // Pre-excitation / WPW
  'I45.6': { code: 'I45.6', description: 'Pre-excitation syndrome (WPW)', category: 'Arrhythmia', isLeaf: true, parentCode: null },

  // SVT/VT
  'I47': { code: 'I47', description: 'Paroxysmal tachycardia', category: 'Arrhythmia', isLeaf: false, parentCode: null },
  'I47.0': { code: 'I47.0', description: 'Re-entrant ventricular arrhythmia', category: 'Arrhythmia', isLeaf: true, parentCode: 'I47' },
  'I47.1': { code: 'I47.1', description: 'Supraventricular tachycardia', category: 'Arrhythmia', isLeaf: true, parentCode: 'I47' },
  'I47.2': { code: 'I47.2', description: 'Ventricular tachycardia', category: 'Arrhythmia', isLeaf: true, parentCode: 'I47' },
  'I47.9': { code: 'I47.9', description: 'Paroxysmal tachycardia, unspecified', category: 'Arrhythmia', isLeaf: true, parentCode: 'I47' },

  // Other arrhythmias
  'I49': { code: 'I49', description: 'Other cardiac arrhythmias', category: 'Arrhythmia', isLeaf: false, parentCode: null },
  'I49.01': { code: 'I49.01', description: 'Ventricular fibrillation', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },
  'I49.02': { code: 'I49.02', description: 'Ventricular flutter', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },
  'I49.3': { code: 'I49.3', description: 'Ventricular premature depolarization', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },
  'I49.5': { code: 'I49.5', description: 'Sick sinus syndrome', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },
  'I49.8': { code: 'I49.8', description: 'Other specified cardiac arrhythmias', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },
  'I49.9': { code: 'I49.9', description: 'Cardiac arrhythmia, unspecified', category: 'Arrhythmia', isLeaf: true, parentCode: 'I49' },

  // Conduction disorders
  'I44.0': { code: 'I44.0', description: 'Atrioventricular block, first degree', category: 'Conduction', isLeaf: true, parentCode: null },
  'I44.1': { code: 'I44.1', description: 'Atrioventricular block, second degree', category: 'Conduction', isLeaf: true, parentCode: null },
  'I44.2': { code: 'I44.2', description: 'Atrioventricular block, complete', category: 'Conduction', isLeaf: true, parentCode: null },
  'I45.10': { code: 'I45.10', description: 'Unspecified right bundle-branch block', category: 'Conduction', isLeaf: true, parentCode: null },
  'I44.7': { code: 'I44.7', description: 'Left bundle-branch block, unspecified', category: 'Conduction', isLeaf: true, parentCode: null },

  // =========================================================================
  // CORONARY ARTERY DISEASE  (I25.x, I21.x, I20.x)
  // =========================================================================
  'I25': { code: 'I25', description: 'Chronic ischemic heart disease', category: 'Coronary', isLeaf: false, parentCode: null },
  'I25.1': { code: 'I25.1', description: 'Atherosclerotic heart disease of native coronary artery', category: 'Coronary', isLeaf: false, parentCode: 'I25' },
  'I25.10': { code: 'I25.10', description: 'ASCVD of native coronary artery without angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.1' },
  'I25.110': { code: 'I25.110', description: 'ASCVD native with unstable angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.1' },
  'I25.111': { code: 'I25.111', description: 'ASCVD native with angina with documented spasm', category: 'Coronary', isLeaf: true, parentCode: 'I25.1' },
  'I25.118': { code: 'I25.118', description: 'ASCVD native with other forms of angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.1' },
  'I25.119': { code: 'I25.119', description: 'ASCVD native with unspecified angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.1' },
  'I25.5': { code: 'I25.5', description: 'Ischemic cardiomyopathy', category: 'Coronary', isLeaf: true, parentCode: 'I25' },
  'I25.7': { code: 'I25.7', description: 'Atherosclerosis of coronary artery bypass graft(s)', category: 'Coronary', isLeaf: false, parentCode: 'I25' },
  'I25.700': { code: 'I25.700', description: 'ASCVD of bypass graft, unspecified, without angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.7' },
  'I25.710': { code: 'I25.710', description: 'ASCVD of autologous vein bypass with unstable angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.7' },
  'I25.790': { code: 'I25.790', description: 'ASCVD of other bypass graft with unstable angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.7' },
  'I25.799': { code: 'I25.799', description: 'ASCVD of other bypass graft with unspecified angina', category: 'Coronary', isLeaf: true, parentCode: 'I25.7' },
  'I25.810': { code: 'I25.810', description: 'Atherosclerosis of coronary artery bypass graft without angina', category: 'Coronary', isLeaf: true, parentCode: 'I25' },
  'I25.811': { code: 'I25.811', description: 'Atherosclerosis of native coronary artery of transplanted heart without angina', category: 'Coronary', isLeaf: true, parentCode: 'I25' },
  'I25.812': { code: 'I25.812', description: 'Atherosclerosis of bypass graft of transplanted heart without angina', category: 'Coronary', isLeaf: true, parentCode: 'I25' },

  // Acute MI
  'I21': { code: 'I21', description: 'Acute myocardial infarction', category: 'Coronary', isLeaf: false, parentCode: null },
  'I21.0': { code: 'I21.0', description: 'STEMI of anterior wall', category: 'Coronary', isLeaf: false, parentCode: 'I21' },
  'I21.01': { code: 'I21.01', description: 'STEMI involving left main coronary artery', category: 'Coronary', isLeaf: true, parentCode: 'I21.0' },
  'I21.02': { code: 'I21.02', description: 'STEMI involving LAD', category: 'Coronary', isLeaf: true, parentCode: 'I21.0' },
  'I21.09': { code: 'I21.09', description: 'STEMI involving other coronary artery of anterior wall', category: 'Coronary', isLeaf: true, parentCode: 'I21.0' },
  'I21.1': { code: 'I21.1', description: 'STEMI of inferior wall', category: 'Coronary', isLeaf: false, parentCode: 'I21' },
  'I21.11': { code: 'I21.11', description: 'STEMI involving RCA', category: 'Coronary', isLeaf: true, parentCode: 'I21.1' },
  'I21.19': { code: 'I21.19', description: 'STEMI involving other coronary artery of inferior wall', category: 'Coronary', isLeaf: true, parentCode: 'I21.1' },
  'I21.2': { code: 'I21.2', description: 'STEMI of other sites', category: 'Coronary', isLeaf: false, parentCode: 'I21' },
  'I21.21': { code: 'I21.21', description: 'STEMI involving left circumflex coronary artery', category: 'Coronary', isLeaf: true, parentCode: 'I21.2' },
  'I21.29': { code: 'I21.29', description: 'STEMI involving other sites', category: 'Coronary', isLeaf: true, parentCode: 'I21.2' },
  'I21.3': { code: 'I21.3', description: 'STEMI of unspecified site', category: 'Coronary', isLeaf: true, parentCode: 'I21' },
  'I21.4': { code: 'I21.4', description: 'Non-ST elevation myocardial infarction (NSTEMI)', category: 'Coronary', isLeaf: true, parentCode: 'I21' },
  'I21.9': { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', category: 'Coronary', isLeaf: true, parentCode: 'I21' },
  'I21.A1': { code: 'I21.A1', description: 'Myocardial infarction type 2', category: 'Coronary', isLeaf: true, parentCode: 'I21' },

  // Angina
  'I20': { code: 'I20', description: 'Angina pectoris', category: 'Coronary', isLeaf: false, parentCode: null },
  'I20.0': { code: 'I20.0', description: 'Unstable angina', category: 'Coronary', isLeaf: true, parentCode: 'I20' },
  'I20.1': { code: 'I20.1', description: 'Angina pectoris with documented spasm (Prinzmetal)', category: 'Coronary', isLeaf: true, parentCode: 'I20' },
  'I20.8': { code: 'I20.8', description: 'Other forms of angina pectoris', category: 'Coronary', isLeaf: true, parentCode: 'I20' },
  'I20.9': { code: 'I20.9', description: 'Angina pectoris, unspecified', category: 'Coronary', isLeaf: true, parentCode: 'I20' },

  // =========================================================================
  // STRUCTURAL HEART / VALVULAR  (I35.x, I34.x, I36.x, Q23.x, I05.x, I06.x, T82.x)
  // =========================================================================
  // Aortic valve
  'I35': { code: 'I35', description: 'Nonrheumatic aortic valve disorders', category: 'Valvular', isLeaf: false, parentCode: null },
  'I35.0': { code: 'I35.0', description: 'Nonrheumatic aortic (valve) stenosis', category: 'Valvular', isLeaf: true, parentCode: 'I35' },
  'I35.1': { code: 'I35.1', description: 'Nonrheumatic aortic (valve) insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I35' },
  'I35.2': { code: 'I35.2', description: 'Nonrheumatic aortic (valve) stenosis with insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I35' },
  'I35.8': { code: 'I35.8', description: 'Other nonrheumatic aortic valve disorders', category: 'Valvular', isLeaf: true, parentCode: 'I35' },
  'I35.9': { code: 'I35.9', description: 'Nonrheumatic aortic valve disorder, unspecified', category: 'Valvular', isLeaf: true, parentCode: 'I35' },

  // Mitral valve
  'I34': { code: 'I34', description: 'Nonrheumatic mitral valve disorders', category: 'Valvular', isLeaf: false, parentCode: null },
  'I34.0': { code: 'I34.0', description: 'Nonrheumatic mitral (valve) insufficiency (MR)', category: 'Valvular', isLeaf: true, parentCode: 'I34' },
  'I34.1': { code: 'I34.1', description: 'Nonrheumatic mitral (valve) prolapse', category: 'Valvular', isLeaf: true, parentCode: 'I34' },
  'I34.2': { code: 'I34.2', description: 'Nonrheumatic mitral (valve) stenosis', category: 'Valvular', isLeaf: true, parentCode: 'I34' },
  'I34.8': { code: 'I34.8', description: 'Other nonrheumatic mitral valve disorders', category: 'Valvular', isLeaf: true, parentCode: 'I34' },
  'I34.9': { code: 'I34.9', description: 'Nonrheumatic mitral valve disorder, unspecified', category: 'Valvular', isLeaf: true, parentCode: 'I34' },

  // Tricuspid valve
  'I36': { code: 'I36', description: 'Nonrheumatic tricuspid valve disorders', category: 'Valvular', isLeaf: false, parentCode: null },
  'I36.0': { code: 'I36.0', description: 'Nonrheumatic tricuspid (valve) stenosis', category: 'Valvular', isLeaf: true, parentCode: 'I36' },
  'I36.1': { code: 'I36.1', description: 'Nonrheumatic tricuspid (valve) insufficiency (TR)', category: 'Valvular', isLeaf: true, parentCode: 'I36' },
  'I36.2': { code: 'I36.2', description: 'Nonrheumatic tricuspid (valve) stenosis with insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I36' },
  'I36.8': { code: 'I36.8', description: 'Other nonrheumatic tricuspid valve disorders', category: 'Valvular', isLeaf: true, parentCode: 'I36' },
  'I36.9': { code: 'I36.9', description: 'Nonrheumatic tricuspid valve disorder, unspecified', category: 'Valvular', isLeaf: true, parentCode: 'I36' },

  // Congenital
  'Q23.1': { code: 'Q23.1', description: 'Congenital insufficiency of aortic valve (bicuspid aortic)', category: 'Valvular', isLeaf: true, parentCode: null },
  'Q23.0': { code: 'Q23.0', description: 'Congenital stenosis of aortic valve', category: 'Valvular', isLeaf: true, parentCode: null },

  // Rheumatic valvular
  'I05': { code: 'I05', description: 'Rheumatic mitral valve diseases', category: 'Valvular', isLeaf: false, parentCode: null },
  'I05.0': { code: 'I05.0', description: 'Rheumatic mitral stenosis', category: 'Valvular', isLeaf: true, parentCode: 'I05' },
  'I05.1': { code: 'I05.1', description: 'Rheumatic mitral insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I05' },
  'I05.2': { code: 'I05.2', description: 'Rheumatic mitral stenosis with insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I05' },
  'I05.8': { code: 'I05.8', description: 'Other rheumatic mitral valve diseases', category: 'Valvular', isLeaf: true, parentCode: 'I05' },
  'I05.9': { code: 'I05.9', description: 'Rheumatic mitral valve disease, unspecified', category: 'Valvular', isLeaf: true, parentCode: 'I05' },
  'I06': { code: 'I06', description: 'Rheumatic aortic valve diseases', category: 'Valvular', isLeaf: false, parentCode: null },
  'I06.0': { code: 'I06.0', description: 'Rheumatic aortic stenosis', category: 'Valvular', isLeaf: true, parentCode: 'I06' },
  'I06.1': { code: 'I06.1', description: 'Rheumatic aortic insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I06' },
  'I06.2': { code: 'I06.2', description: 'Rheumatic aortic stenosis with insufficiency', category: 'Valvular', isLeaf: true, parentCode: 'I06' },
  'I06.8': { code: 'I06.8', description: 'Other rheumatic aortic valve diseases', category: 'Valvular', isLeaf: true, parentCode: 'I06' },
  'I06.9': { code: 'I06.9', description: 'Rheumatic aortic valve disease, unspecified', category: 'Valvular', isLeaf: true, parentCode: 'I06' },

  // Prosthetic valve complications
  'T82.01': { code: 'T82.01', description: 'Breakdown (mechanical) of heart valve prosthesis', category: 'Device Complication', isLeaf: false, parentCode: null },
  'T82.01XA': { code: 'T82.01XA', description: 'Breakdown of heart valve prosthesis, initial encounter', category: 'Device Complication', isLeaf: true, parentCode: 'T82.01' },
  'T82.02': { code: 'T82.02', description: 'Displacement of heart valve prosthesis', category: 'Device Complication', isLeaf: false, parentCode: null },
  'T82.02XA': { code: 'T82.02XA', description: 'Displacement of heart valve prosthesis, initial encounter', category: 'Device Complication', isLeaf: true, parentCode: 'T82.02' },
  'T82.09': { code: 'T82.09', description: 'Other mechanical complication of heart valve prosthesis', category: 'Device Complication', isLeaf: false, parentCode: null },
  'T82.09XA': { code: 'T82.09XA', description: 'Other mechanical complication of heart valve prosthesis, initial encounter', category: 'Device Complication', isLeaf: true, parentCode: 'T82.09' },

  // =========================================================================
  // PERIPHERAL VASCULAR  (I70.x, I73.x, I82.x, I26.x)
  // =========================================================================
  'I70': { code: 'I70', description: 'Atherosclerosis', category: 'Peripheral Vascular', isLeaf: false, parentCode: null },
  'I70.2': { code: 'I70.2', description: 'Atherosclerosis of native arteries of extremities', category: 'Peripheral Vascular', isLeaf: false, parentCode: 'I70' },
  'I70.201': { code: 'I70.201', description: 'Unspecified atherosclerosis of native arteries of extremities, right leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.202': { code: 'I70.202', description: 'Unspecified atherosclerosis of native arteries of extremities, left leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.203': { code: 'I70.203', description: 'Unspecified atherosclerosis of native arteries of extremities, bilateral legs', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.209': { code: 'I70.209', description: 'Unspecified atherosclerosis of native arteries of extremities, unspecified extremity', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.211': { code: 'I70.211', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, right leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.212': { code: 'I70.212', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, left leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.213': { code: 'I70.213', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, bilateral', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.219': { code: 'I70.219', description: 'Atherosclerosis of native arteries of extremities with intermittent claudication, unspecified', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.221': { code: 'I70.221', description: 'Atherosclerosis of native arteries of extremities with rest pain, right leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.222': { code: 'I70.222', description: 'Atherosclerosis of native arteries of extremities with rest pain, left leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.229': { code: 'I70.229', description: 'Atherosclerosis of native arteries of extremities with rest pain, unspecified', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.231': { code: 'I70.231', description: 'Atherosclerosis of native arteries of right leg with ulceration of thigh', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.25': { code: 'I70.25', description: 'Atherosclerosis of native arteries of other extremities with ulceration', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.261': { code: 'I70.261', description: 'Atherosclerosis of native arteries of extremities with gangrene, right leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.262': { code: 'I70.262', description: 'Atherosclerosis of native arteries of extremities with gangrene, left leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.269': { code: 'I70.269', description: 'Atherosclerosis of native arteries of extremities with gangrene, unspecified', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.291': { code: 'I70.291', description: 'Other atherosclerosis of native arteries of extremities, right leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.292': { code: 'I70.292', description: 'Other atherosclerosis of native arteries of extremities, left leg', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },
  'I70.299': { code: 'I70.299', description: 'Other atherosclerosis of native arteries of extremities, unspecified extremity', category: 'Peripheral Vascular', isLeaf: true, parentCode: 'I70.2' },

  // PVD unspecified
  'I73.9': { code: 'I73.9', description: 'Peripheral vascular disease, unspecified', category: 'Peripheral Vascular', isLeaf: true, parentCode: null },
  'I73.1': { code: 'I73.1', description: 'Thromboangiitis obliterans (Buerger disease)', category: 'Peripheral Vascular', isLeaf: true, parentCode: null },

  // DVT
  'I82': { code: 'I82', description: 'Other venous embolism and thrombosis', category: 'Venous Thromboembolism', isLeaf: false, parentCode: null },
  'I82.40': { code: 'I82.40', description: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I82' },
  'I82.401': { code: 'I82.401', description: 'Acute embolism and thrombosis of unspecified deep veins of right lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.40' },
  'I82.402': { code: 'I82.402', description: 'Acute embolism and thrombosis of unspecified deep veins of left lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.40' },
  'I82.403': { code: 'I82.403', description: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity, bilateral', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.40' },
  'I82.409': { code: 'I82.409', description: 'Acute embolism and thrombosis of unspecified deep veins of unspecified lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.40' },
  'I82.41': { code: 'I82.41', description: 'Acute embolism and thrombosis of femoral vein', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I82' },
  'I82.411': { code: 'I82.411', description: 'Acute embolism and thrombosis of right femoral vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.41' },
  'I82.412': { code: 'I82.412', description: 'Acute embolism and thrombosis of left femoral vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.41' },
  'I82.419': { code: 'I82.419', description: 'Acute embolism and thrombosis of unspecified femoral vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.41' },
  'I82.42': { code: 'I82.42', description: 'Acute embolism and thrombosis of iliac vein', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I82' },
  'I82.421': { code: 'I82.421', description: 'Acute embolism and thrombosis of right iliac vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.42' },
  'I82.422': { code: 'I82.422', description: 'Acute embolism and thrombosis of left iliac vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.42' },
  'I82.429': { code: 'I82.429', description: 'Acute embolism and thrombosis of unspecified iliac vein', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.42' },
  'I82.49': { code: 'I82.49', description: 'Acute embolism and thrombosis of other specified deep vein of lower extremity', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I82' },
  'I82.491': { code: 'I82.491', description: 'Acute embolism and thrombosis of other specified deep vein of right lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.49' },
  'I82.492': { code: 'I82.492', description: 'Acute embolism and thrombosis of other specified deep vein of left lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.49' },
  'I82.499': { code: 'I82.499', description: 'Acute embolism and thrombosis of other specified deep vein of unspecified lower extremity', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I82.49' },

  // Pulmonary Embolism
  'I26': { code: 'I26', description: 'Pulmonary embolism', category: 'Venous Thromboembolism', isLeaf: false, parentCode: null },
  'I26.0': { code: 'I26.0', description: 'Pulmonary embolism with acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I26' },
  'I26.01': { code: 'I26.01', description: 'Septic pulmonary embolism with acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.0' },
  'I26.02': { code: 'I26.02', description: 'Saddle embolus of pulmonary artery with acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.0' },
  'I26.09': { code: 'I26.09', description: 'Other pulmonary embolism with acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.0' },
  'I26.9': { code: 'I26.9', description: 'Pulmonary embolism without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: false, parentCode: 'I26' },
  'I26.90': { code: 'I26.90', description: 'Septic pulmonary embolism without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.9' },
  'I26.92': { code: 'I26.92', description: 'Saddle embolus of pulmonary artery without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.9' },
  'I26.93': { code: 'I26.93', description: 'Single subsegmental PE without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.9' },
  'I26.94': { code: 'I26.94', description: 'Multiple subsegmental PE without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.9' },
  'I26.99': { code: 'I26.99', description: 'Other pulmonary embolism without acute cor pulmonale', category: 'Venous Thromboembolism', isLeaf: true, parentCode: 'I26.9' },

  // =========================================================================
  // ADDITIONAL CODES (Stroke, CKD, DM, Obesity, Hypertension)
  // =========================================================================
  // Stroke (for cryptogenic stroke gap)
  'I63': { code: 'I63', description: 'Cerebral infarction', category: 'Cerebrovascular', isLeaf: false, parentCode: null },
  'I63.9': { code: 'I63.9', description: 'Cerebral infarction, unspecified', category: 'Cerebrovascular', isLeaf: true, parentCode: 'I63' },
  'I63.81': { code: 'I63.81', description: 'Other cerebral infarction due to occlusion or stenosis of other cerebral artery', category: 'Cerebrovascular', isLeaf: true, parentCode: 'I63' },
  'G45.9': { code: 'G45.9', description: 'Transient cerebral ischemic attack, unspecified (TIA)', category: 'Cerebrovascular', isLeaf: true, parentCode: null },

  // CKD
  'N18.3': { code: 'N18.3', description: 'Chronic kidney disease, stage 3', category: 'Renal', isLeaf: true, parentCode: null },
  'N18.4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4', category: 'Renal', isLeaf: true, parentCode: null },
  'N18.5': { code: 'N18.5', description: 'Chronic kidney disease, stage 5', category: 'Renal', isLeaf: true, parentCode: null },
  'N18.6': { code: 'N18.6', description: 'End stage renal disease', category: 'Renal', isLeaf: true, parentCode: null },

  // Diabetes
  'E11': { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Metabolic', isLeaf: false, parentCode: null },
  'E11.9': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Metabolic', isLeaf: true, parentCode: 'E11' },
  'E11.65': { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Metabolic', isLeaf: true, parentCode: 'E11' },
  'E11.22': { code: 'E11.22', description: 'Type 2 DM with diabetic chronic kidney disease', category: 'Metabolic', isLeaf: true, parentCode: 'E11' },

  // Obesity
  'E66.01': { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories', category: 'Metabolic', isLeaf: true, parentCode: null },

  // Hypertension
  'I10': { code: 'I10', description: 'Essential (primary) hypertension', category: 'Hypertension', isLeaf: true, parentCode: null },
  'I11.0': { code: 'I11.0', description: 'Hypertensive heart disease with heart failure', category: 'Hypertension', isLeaf: true, parentCode: null },

  // Iron deficiency anemia
  'D50.9': { code: 'D50.9', description: 'Iron deficiency anemia, unspecified', category: 'Hematology', isLeaf: true, parentCode: null },
  'D63.1': { code: 'D63.1', description: 'Anemia in chronic kidney disease', category: 'Hematology', isLeaf: true, parentCode: null },

  // IVC filter
  'T82.5': { code: 'T82.5', description: 'Mechanical complication of other cardiac and vascular devices and implants', category: 'Device Complication', isLeaf: false, parentCode: null },
  'Z95.828': { code: 'Z95.828', description: 'Presence of other vascular implants and grafts', category: 'Status', isLeaf: true, parentCode: null },
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Validate an ICD-10-CM code format.
 * Accepts 3-7 character alphanumeric codes with optional dot after position 3.
 */
export function validateICD10(code: string): boolean {
  const normalized = code.replace('.', '');
  return /^[A-Z][0-9]{2}[A-Z0-9]{0,4}$/i.test(normalized);
}

/**
 * Expand a prefix to all matching codes in the registry.
 * Example: expandCodeRange('I50.2') returns I50.20, I50.21, I50.22, I50.23.
 */
export function expandCodeRange(prefix: string): ICD10Code[] {
  const normalizedPrefix = prefix.replace('.', '').toUpperCase();
  return Object.values(ICD10_CODES).filter(c => {
    const normalizedCode = c.code.replace('.', '').toUpperCase();
    return normalizedCode.startsWith(normalizedPrefix) && c.isLeaf;
  });
}

/**
 * Get the description for a code, or 'Unknown' if not found.
 */
export function getDescription(code: string): string {
  return ICD10_CODES[code]?.description ?? 'Unknown';
}

/**
 * Check whether a patient code matches any code in a list.
 * Supports wildcard patterns:
 *   - 'I50.x' matches any code starting with I50
 *   - 'I50.2x' matches I50.20, I50.21, etc.
 *   - Exact match: 'I50.22'
 */
export function matchesAny(code: string, codeList: string[]): boolean {
  const normalizedCode = code.replace('.', '').toUpperCase();
  for (const pattern of codeList) {
    if (pattern.includes('x') || pattern.includes('X')) {
      const prefix = pattern.replace(/[xX]+$/, '').replace('.', '').toUpperCase();
      if (normalizedCode.startsWith(prefix)) {
        return true;
      }
    } else {
      const normalizedPattern = pattern.replace('.', '').toUpperCase();
      if (normalizedCode === normalizedPattern || normalizedCode.startsWith(normalizedPattern)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get all codes in a given category (e.g. 'Heart Failure').
 */
export function getCodesByCategory(category: string): ICD10Code[] {
  return Object.values(ICD10_CODES).filter(c => c.category === category);
}

/**
 * Get a code object by code string.
 */
export function getCode(code: string): ICD10Code | undefined {
  return ICD10_CODES[code];
}
