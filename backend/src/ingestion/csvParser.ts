import { CSVColumn, getModuleColumns } from './csvSchema';
import { detectPHI, PHIDetectionResult } from './phiDetector';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string | number | boolean | string[] | null>;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface ParseResult {
  validRows: ParsedRow[];
  errorRows: ParsedRow[];
  totalRows: number;
  phiResult: PHIDetectionResult;
  headerErrors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function validateField(
  value: string,
  col: CSVColumn,
): { parsed: string | number | boolean | string[] | null; error?: string; warning?: string } {
  if (!value || value.trim() === '') {
    if (col.required) return { parsed: null, error: `Required field '${col.name}' is missing` };
    return { parsed: null };
  }
  const trimmed = value.trim();

  switch (col.type) {
    case 'number': {
      const num = parseFloat(trimmed);
      if (isNaN(num)) return { parsed: null, error: `'${col.name}' must be a number, got '${trimmed}'` };
      if (col.validation?.min !== undefined && num < col.validation.min)
        return { parsed: null, error: `'${col.name}' value ${num} below minimum ${col.validation.min}` };
      if (col.validation?.max !== undefined && num > col.validation.max)
        return { parsed: null, error: `'${col.name}' value ${num} above maximum ${col.validation.max}` };
      return { parsed: num };
    }
    case 'date': {
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return { parsed: null, error: `'${col.name}' invalid date: '${trimmed}'` };
      return { parsed: d.toISOString() };
    }
    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(lower)) return { parsed: true };
      if (['false', '0', 'no', 'n'].includes(lower)) return { parsed: false };
      return { parsed: null, error: `'${col.name}' must be boolean, got '${trimmed}'` };
    }
    case 'icd10': {
      if (!/^[A-Z]\d{2}(\.\d{1,4})?$/i.test(trimmed))
        return { parsed: trimmed.toUpperCase(), warning: `'${col.name}' may not be valid ICD-10: '${trimmed}'` };
      return { parsed: trimmed.toUpperCase() };
    }
    case 'pipe_delimited': {
      const items = trimmed
        .split('|')
        .map(s => s.trim())
        .filter(Boolean);
      return { parsed: items };
    }
    default:
      return { parsed: trimmed };
  }
}

export function parseCSV(content: string, moduleId: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0)
    return {
      validRows: [],
      errorRows: [],
      totalRows: 0,
      phiResult: { hasPHI: false, detections: [] },
      headerErrors: ['Empty file'],
    };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const columns = getModuleColumns(moduleId);

  // Check required headers
  const headerErrors: string[] = [];
  for (const col of columns) {
    if (col.required && !headers.includes(col.name)) {
      headerErrors.push(`Required column '${col.name}' not found in header`);
    }
  }

  // Parse data rows
  const rawRows = lines.slice(1).map(l => parseCSVLine(l));

  // PHI detection
  const phiResult = detectPHI(headers, rawRows);

  const validRows: ParsedRow[] = [];
  const errorRows: ParsedRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const parsed: ParsedRow = { rowNumber: i + 2, data: {}, errors: [], warnings: [] };

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const col = columns.find(c => c.name === header);
      if (!col) {
        parsed.data[header] = row[j] || null;
        continue;
      }

      const result = validateField(row[j] || '', col);
      parsed.data[col.name] = result.parsed;
      if (result.error) parsed.errors.push({ field: col.name, message: result.error });
      if (result.warning) parsed.warnings.push({ field: col.name, message: result.warning });
    }

    // Check required fields not in header
    for (const col of columns) {
      if (col.required && parsed.data[col.name] === undefined) {
        parsed.data[col.name] = null;
        parsed.errors.push({ field: col.name, message: `Required field '${col.name}' missing` });
      }
    }

    if (parsed.errors.length > 0) errorRows.push(parsed);
    else validRows.push(parsed);
  }

  return { validRows, errorRows, totalRows: rawRows.length, phiResult, headerErrors };
}
