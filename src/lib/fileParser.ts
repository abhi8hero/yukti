import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnSchema, ColumnType, FileFormat, RowData, UploadedFileInfo } from '@/types';

// Detect file format from extension
export function detectFormat(filename: string): FileFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, FileFormat> = {
    csv: 'csv',
    xlsx: 'xlsx',
    xls: 'xlsx',
    json: 'json',
    txt: 'txt',
  };
  return map[ext ?? ''] ?? null;
}

// Detect column type from sample values
function detectColumnType(values: (string | number | null | boolean)[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== '' && v !== undefined);
  if (nonNull.length === 0) return 'empty';

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  const dateRegex = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}([ T]\d{2}:\d{2}(:\d{2})?)?$/;
  const boolValues = ['true', 'false', 'yes', 'no', '1', '0'];

  for (const v of nonNull) {
    const s = String(v).trim();
    if (!isNaN(Number(s)) && s !== '') numCount++;
    else if (dateRegex.test(s)) dateCount++;
    if (boolValues.includes(s.toLowerCase())) boolCount++;
  }

  const total = nonNull.length;
  if (numCount / total > 0.8) return 'number';
  if (dateCount / total > 0.7) return 'date';
  if (boolCount / total > 0.9) return 'boolean';
  if (numCount / total > 0.3 && numCount / total < 0.8) return 'mixed';
  return 'string';
}

// Build column schema from raw data
function buildColumnSchemas(rows: RowData[], headers: string[]): ColumnSchema[] {
  return headers.map((header) => {
    const values = rows.map((r) => r[header] ?? null);
    const nonNull = values.filter((v) => v !== null && v !== '');
    const nullCount = values.length - nonNull.length;
    const uniqueCount = new Set(nonNull.map(String)).size;
    const sampleValues = nonNull.slice(0, 5).map(String);
    const type = detectColumnType(values);
    return {
      name: header,
      originalName: header,
      type,
      nullCount,
      uniqueCount,
      sampleValues,
    };
  });
}

// Parse CSV
async function parseCSV(file: File): Promise<RowData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        resolve(result.data as RowData[]);
      },
      error: reject,
    });
  });
}

// Parse XLSX
async function parseXLSX(file: File): Promise<RowData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<RowData>(sheet, {
    defval: null,
    raw: false,
  });
  return data;
}

// Parse JSON
async function parseJSON(file: File): Promise<RowData[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as RowData[];
  if (typeof parsed === 'object' && parsed !== null) {
    // Try common patterns: { data: [...] }
    const keys = Object.keys(parsed);
    for (const key of keys) {
      if (Array.isArray(parsed[key])) return parsed[key] as RowData[];
    }
  }
  throw new Error('JSON must contain an array of objects');
}

// Parse TXT (tab-separated or comma-separated)
async function parseTXT(file: File): Promise<RowData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: '', // auto-detect
      complete: (result) => {
        resolve(result.data as RowData[]);
      },
      error: reject,
    });
  });
}

// Main parse function
export async function parseFile(file: File): Promise<UploadedFileInfo> {
  const format = detectFormat(file.name);
  if (!format) throw new Error(`Unsupported file format. Supported: CSV, XLSX, JSON, TXT`);

  let rawData: RowData[] = [];

  switch (format) {
    case 'csv':
      rawData = await parseCSV(file);
      break;
    case 'xlsx':
      rawData = await parseXLSX(file);
      break;
    case 'json':
      rawData = await parseJSON(file);
      break;
    case 'txt':
      rawData = await parseTXT(file);
      break;
  }

  if (rawData.length === 0) throw new Error('File is empty or could not be parsed');

  const headers = Object.keys(rawData[0]);
  const columns = buildColumnSchemas(rawData, headers);

  return {
    file,
    format,
    rawData,
    columns,
    previewRows: rawData.slice(0, 20),
    rowCount: rawData.length,
    columnCount: headers.length,
  };
}
