/**
 * Validates incoming FHIR codes against the terminology infrastructure.
 * Logs unknown codes for review rather than silently dropping data.
 */

interface UnknownCode {
  codeSystem: string;
  code: string;
  display?: string;
  resourceType: string;
  patientId: string;
  receivedAt: Date;
}

const unknownCodes: UnknownCode[] = [];

export function validateIncomingCode(
  code: string,
  system: string,
  resourceType: string,
  patientId: string
): { valid: boolean; display?: string } {
  switch (system) {
    case 'http://hl7.org/fhir/sid/icd-10-cm':
      // In production, validate against ICD-10 terminology service
      // For now, basic format validation
      const icd10Valid = /^[A-Z]\d{2}(\.\d{1,4})?$/.test(code);
      if (!icd10Valid) {
        logUnknownCode({ codeSystem: system, code, resourceType, patientId, receivedAt: new Date() });
      }
      return { valid: icd10Valid };

    case 'http://www.nlm.nih.gov/research/umls/rxnorm':
      const rxnormValid = /^\d+$/.test(code);
      if (!rxnormValid) {
        logUnknownCode({ codeSystem: system, code, resourceType, patientId, receivedAt: new Date() });
      }
      return { valid: rxnormValid };

    case 'http://loinc.org':
      const loincValid = /^\d{1,5}-\d$/.test(code);
      if (!loincValid) {
        logUnknownCode({ codeSystem: system, code, resourceType, patientId, receivedAt: new Date() });
      }
      return { valid: loincValid };

    case 'http://www.ama-assn.org/go/cpt':
      const cptValid = /^\d{5}$/.test(code) || /^\d{4}[A-Z]$/.test(code);
      if (!cptValid) {
        logUnknownCode({ codeSystem: system, code, resourceType, patientId, receivedAt: new Date() });
      }
      return { valid: cptValid };

    default:
      // Unknown code system -- log but don't reject
      logUnknownCode({ codeSystem: system, code, resourceType, patientId, receivedAt: new Date() });
      return { valid: true }; // Accept unknown systems, just log them
  }
}

function logUnknownCode(entry: UnknownCode): void {
  unknownCodes.push(entry);
  // In production, write to database TermUnknownCode table
  if (unknownCodes.length % 100 === 0) {
    console.warn(`[TermValidator] ${unknownCodes.length} unknown codes logged for review`);
  }
}

export function getUnknownCodes(): UnknownCode[] {
  return [...unknownCodes];
}

export function clearUnknownCodes(): void {
  unknownCodes.length = 0;
}
