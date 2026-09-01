import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ColumnSchema, RowData } from '@/types';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export function exportDataset(
  rows: RowData[],
  columns: ColumnSchema[],
  filename: string,
  format: ExportFormat
): void {
  const headers = columns.map((c) => c.name);
  const orderedRows = rows.map((row) => {
    const ordered: RowData = {};
    for (const h of headers) {
      ordered[h] = row[h] ?? '';
    }
    return ordered;
  });

  switch (format) {
    case 'csv': {
      const csv = Papa.unparse(orderedRows, { header: true });
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
      break;
    }
    case 'xlsx': {
      const ws = XLSX.utils.json_to_sheet(orderedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      break;
    }
    case 'json': {
      const json = JSON.stringify(orderedRows, null, 2);
      downloadBlob(new Blob([json], { type: 'application/json' }), `${filename}.json`);
      break;
    }
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getExportFilename(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  const ts = new Date().toISOString().slice(0, 10);
  return `${base}_cleaned_${ts}`;
}
