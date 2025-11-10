import { saveAs } from 'file-saver';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}

export class DataExportService {
  private static validateExportData(data: ExportData): void {
    if (!data) {
      throw new Error('Export data is required');
    }
    
    if (!data.filename || typeof data.filename !== 'string' || data.filename.trim() === '') {
      throw new Error('Valid filename is required');
    }
    
    if (!Array.isArray(data.headers) || data.headers.length === 0) {
      throw new Error('Headers array is required and cannot be empty');
    }
    
    if (!Array.isArray(data.rows)) {
      throw new Error('Rows must be an array');
    }
    
    // Validate header types
    data.headers.forEach((header, index) => {
      if (typeof header !== 'string') {
        throw new Error(`Header at index ${index} must be a string`);
      }
    });
    
    // Validate row structure
    data.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        throw new Error(`Row at index ${rowIndex} must be an array`);
      }
      if (row.length !== data.headers.length) {
        console.warn(`Row ${rowIndex} has ${row.length} columns but ${data.headers.length} headers`);
      }
    });
    
    // Sanitize filename
    const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (sanitizedFilename !== data.filename) {
      console.warn(`Filename sanitized from "${data.filename}" to "${sanitizedFilename}"`);
      data.filename = sanitizedFilename;
    }
  }

  static exportToCSV(data: ExportData, options: ExportOptions = { format: 'csv' }) {
    this.validateExportData(data);
    const { headers, rows, filename } = data;
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');

    // Add BOM for proper Excel encoding
    const blob = new Blob(['\uFEFF' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const finalFilename = options.includeTimestamp 
      ? `${filename}_${this.getTimestamp()}.csv`
      : `${filename}.csv`;
    
    saveAs(blob, finalFilename);
  }

  static exportToExcel(data: ExportData, options: ExportOptions = { format: 'excel' }) {
    this.validateExportData(data);
    const { headers, rows, filename, title, metadata } = data;
    
    // Create workbook
    const wb = utils.book_new();
    
    // Create main data worksheet
    const wsData = [headers, ...rows];
    const ws = utils.aoa_to_sheet(wsData);
    
    // Style headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center" }
    };
    
    // Apply header styling
    for (let i = 0; i < headers.length; i++) {
      const cellRef = utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = headerStyle;
    }
    
    // Auto-size columns
    const colWidths = headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map(row => String(row[i] || '').length)
      );
      return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;
    
    utils.book_append_sheet(wb, ws, "Data");
    
    // Add metadata sheet if requested
    if (options.includeMetadata && metadata) {
      const metadataWs = utils.aoa_to_sheet([
        ['Export Metadata'],
        ['Generated At', new Date().toISOString()],
        ['Total Records', rows.length],
        ...Object.entries(metadata).map(([key, value]) => [key, value])
      ]);
      utils.book_append_sheet(wb, metadataWs, "Metadata");
    }
    
    const finalFilename = options.includeTimestamp 
      ? `${filename}_${this.getTimestamp()}.xlsx`
      : `${filename}.xlsx`;
    
    writeFile(wb, finalFilename);
  }

  static exportToPDF(data: ExportData, options: ExportOptions = { format: 'pdf' }) {
    this.validateExportData(data);
    const { headers, rows, filename, title, metadata } = data;
    
    const doc = new jsPDF();
    
    // Add title
    if (title) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);
    }
    
    // Add metadata
    let yPosition = title ? 35 : 20;
    if (options.includeMetadata && metadata) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      Object.entries(metadata).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }
    
    // Add export timestamp
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
    yPosition += 10;
    
    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue-600
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      },
      margin: { top: 10, right: 14, bottom: 10, left: 14 },
    });
    
    const finalFilename = options.includeTimestamp 
      ? `${filename}_${this.getTimestamp()}.pdf`
      : `${filename}.pdf`;
    
    doc.save(finalFilename);
  }

  static export(data: ExportData, options: ExportOptions) {
    try {
      if (!options || !options.format) {
        throw new Error('Export options with format are required');
      }
      
      switch (options.format) {
        case 'csv':
          this.exportToCSV(data, options);
          break;
        case 'excel':
          this.exportToExcel(data, options);
          break;
        case 'pdf':
          this.exportToPDF(data, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private static getTimestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  }
}

// Convenience functions for common export scenarios
export const exportTableData = (
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  format: 'csv' | 'excel' | 'pdf' = 'excel',
  title?: string
) => {
  DataExportService.export(
    { headers, rows, filename, title },
    { format, includeTimestamp: true, includeMetadata: true }
  );
};

export const exportKPIData = (
  kpis: Array<{ label: string; value: string | number; trend?: string }>,
  filename: string,
  format: 'csv' | 'excel' | 'pdf' = 'excel'
) => {
  const headers = ['Metric', 'Value', 'Trend'];
  const rows = kpis.map(kpi => [
    kpi.label,
    kpi.value,
    kpi.trend || 'N/A'
  ]);
  
  exportTableData(headers, rows, filename, format, 'KPI Dashboard Export');
};

export const exportPatientData = (
  patients: Array<{ 
    name: string; 
    mrn: string; 
    condition: string; 
    status: string;
    [key: string]: any;
  }>,
  filename: string,
  format: 'csv' | 'excel' | 'pdf' = 'excel'
) => {
  const headers = ['Patient Name', 'MRN', 'Condition', 'Status'];
  const rows = patients.map(patient => [
    patient.name,
    patient.mrn,
    patient.condition,
    patient.status
  ]);
  
  exportTableData(headers, rows, filename, format, 'Patient List Export');
};