export interface PHIDetectionResult {
  hasPHI: boolean;
  detections: Array<{ row: number; column: string; pattern: string; confidence: 'HIGH' | 'MEDIUM' }>;
}

const PHI_PATTERNS = [
  { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/, confidence: 'HIGH' as const },
  { name: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i, confidence: 'HIGH' as const },
  { name: 'Phone', pattern: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, confidence: 'MEDIUM' as const },
  { name: 'MRN_Pattern', pattern: /\bMRN[-:]?\s*\d{5,}\b/i, confidence: 'HIGH' as const },
  { name: 'FullName_DOB', pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b.*\b\d{1,2}\/\d{1,2}\/\d{4}\b/, confidence: 'HIGH' as const },
  { name: 'Address', pattern: /\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Ave|Blvd|Dr|Rd|Ln|Way|Ct)\b/i, confidence: 'MEDIUM' as const },
];

// Column names that suggest PHI
const PHI_COLUMN_NAMES = [
  'name', 'first_name', 'last_name', 'full_name', 'patient_name',
  'dob', 'date_of_birth', 'birth_date', 'ssn', 'social_security',
  'mrn', 'medical_record', 'address', 'street', 'phone', 'email',
  'zip_code', 'zipcode',
];

export function detectPHI(headers: string[], rows: string[][]): PHIDetectionResult {
  const detections: PHIDetectionResult['detections'] = [];

  // Check column headers for PHI indicators
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z_]/g, '');
    if (PHI_COLUMN_NAMES.some(p => normalized.includes(p))) {
      detections.push({ row: 0, column: header, pattern: 'PHI_COLUMN_NAME', confidence: 'HIGH' });
    }
  }

  // Scan first 100 rows for PHI patterns
  const scanRows = rows.slice(0, 100);
  for (let i = 0; i < scanRows.length; i++) {
    for (let j = 0; j < scanRows[i].length; j++) {
      const value = scanRows[i][j];
      if (!value) continue;
      for (const { name, pattern, confidence } of PHI_PATTERNS) {
        if (pattern.test(value)) {
          detections.push({
            row: i + 1,
            column: headers[j] || `col_${j}`,
            pattern: name,
            confidence,
          });
        }
      }
    }
  }

  const highConfidenceCount = detections.filter(d => d.confidence === 'HIGH').length;
  return {
    hasPHI: highConfidenceCount >= 2 || detections.length >= 5,
    detections,
  };
}
