import type { CleaningLog, ColumnSchema, RowData } from '@/types';

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface CleaningResult {
  rows: RowData[];
  columns: ColumnSchema[];
  logs: Omit<CleaningLog, 'id' | 'created_at'>[];
  totalFixed: number;
}

// Normalize column name: "first name" → "First_Name", "DATE" → "Date"
export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_');
}

// Trim whitespace from all string values
function trimWhitespace(rows: RowData[]): { rows: RowData[]; count: number } {
  let count = 0;
  const result = rows.map((row) => {
    const newRow: RowData = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v !== v.trim()) {
        newRow[k] = v.trim();
        count++;
      } else if (typeof v === 'string' && /\s{2,}/.test(v)) {
        newRow[k] = v.replace(/\s+/g, ' ');
        count++;
      } else {
        newRow[k] = v;
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Remove completely empty rows
function removeEmptyRows(rows: RowData[]): { rows: RowData[]; count: number } {
  const before = rows.length;
  const result = rows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== '' && v !== undefined)
  );
  return { rows: result, count: before - result.length };
}

// Remove duplicate rows
function removeDuplicateRows(rows: RowData[]): { rows: RowData[]; count: number } {
  const seen = new Set<string>();
  const result: RowData[] = [];
  let count = 0;
  for (const row of rows) {
    const hash = JSON.stringify(
      Object.keys(row).sort().reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = String(row[k] ?? '').trim().toLowerCase();
        return acc;
      }, {})
    );
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(row);
    } else {
      count++;
    }
  }
  return { rows: result, count };
}

// Standardize text: trim + title case for obvious name/label columns
function standardizeText(rows: RowData[], columns: ColumnSchema[]): { rows: RowData[]; count: number } {
  let count = 0;
  const nameColumns = columns
    .filter((c) => c.type === 'string' && /name|label|category|type|status|city|country/i.test(c.name))
    .map((c) => c.name);

  const result = rows.map((row) => {
    const newRow: RowData = { ...row };
    for (const col of nameColumns) {
      const v = row[col];
      if (typeof v === 'string' && v.trim()) {
        const standardized = v.trim().replace(/\s+/g, ' ');
        if (standardized !== v) {
          newRow[col] = standardized;
          count++;
        }
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Convert date formats to ISO YYYY-MM-DD
function standardizeDates(rows: RowData[], columns: ColumnSchema[]): { rows: RowData[]; count: number } {
  let count = 0;
  const dateColumns = columns.filter((c) => c.type === 'date').map((c) => c.name);

  const result = rows.map((row) => {
    const newRow: RowData = { ...row };
    for (const col of dateColumns) {
      const v = row[col];
      if (typeof v === 'string' && v.trim()) {
        const parsed = Date.parse(v);
        if (!isNaN(parsed)) {
          const iso = new Date(parsed).toISOString().split('T')[0];
          if (iso !== v) {
            newRow[col] = iso;
            count++;
          }
        }
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Normalize numeric columns (remove commas, fix formatting)
function normalizeNumbers(rows: RowData[], columns: ColumnSchema[]): { rows: RowData[]; count: number } {
  let count = 0;
  const numColumns = columns.filter((c) => c.type === 'number').map((c) => c.name);

  const result = rows.map((row) => {
    const newRow: RowData = { ...row };
    for (const col of numColumns) {
      const v = row[col];
      if (typeof v === 'string' && v.trim()) {
        const cleaned = v.replace(/,/g, '').trim();
        if (!isNaN(Number(cleaned)) && cleaned !== v) {
          newRow[col] = cleaned;
          count++;
        }
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Fix inconsistent boolean-like values
function normalizeBooleans(rows: RowData[], columns: ColumnSchema[]): { rows: RowData[]; count: number } {
  let count = 0;
  const boolColumns = columns.filter((c) => c.type === 'boolean').map((c) => c.name);

  const trueValues = new Set(['true', 'yes', '1', 'y', 'on', 'active']);
  const falseValues = new Set(['false', 'no', '0', 'n', 'off', 'inactive']);

  const result = rows.map((row) => {
    const newRow: RowData = { ...row };
    for (const col of boolColumns) {
      const v = row[col];
      if (typeof v === 'string') {
        const lower = v.toLowerCase().trim();
        if (trueValues.has(lower) && v !== 'True') {
          newRow[col] = 'True';
          count++;
        } else if (falseValues.has(lower) && v !== 'False') {
          newRow[col] = 'False';
          count++;
        }
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Fill null values with a placeholder for string columns
function fillNullValues(rows: RowData[], columns: ColumnSchema[]): { rows: RowData[]; count: number } {
  let count = 0;
  const result = rows.map((row) => {
    const newRow: RowData = { ...row };
    for (const col of columns) {
      const v = row[col.name];
      if (v === null || v === undefined) {
        newRow[col.name] = '';
        count++;
      }
    }
    return newRow;
  });
  return { rows: result, count };
}

// Normalize column names
function normalizeColumns(columns: ColumnSchema[]): { columns: ColumnSchema[]; renames: Record<string, string> } {
  const renames: Record<string, string> = {};
  const normalized = columns.map((col) => {
    const newName = normalizeColumnName(col.name);
    if (newName !== col.name) {
      renames[col.name] = newName;
    }
    return { ...col, name: newName, originalName: col.originalName || col.name };
  });
  return { columns: normalized, renames };
}

function applyColumnRenames(rows: RowData[], renames: Record<string, string>): RowData[] {
  if (Object.keys(renames).length === 0) return rows;
  return rows.map((row) => {
    const newRow: RowData = {};
    for (const [k, v] of Object.entries(row)) {
      newRow[renames[k] ?? k] = v;
    }
    return newRow;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function runBasicCleaning(
  rows: RowData[],
  columns: ColumnSchema[],
  datasetId = 'local'
): CleaningResult {
  const logs: Omit<CleaningLog, 'id' | 'created_at'>[] = [];
  let currentRows = rows;
  let totalFixed = 0;

  // 1. Normalize column names
  const { columns: newColumns, renames } = normalizeColumns(columns);
  if (Object.keys(renames).length > 0) {
    currentRows = applyColumnRenames(currentRows, renames);
    const renamed = Object.entries(renames).map(([o, n]) => `${o} → ${n}`).join(', ');
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Normalize Column Names',
      operation_mode: 'basic',
      description: `Renamed ${Object.keys(renames).length} column(s): ${renamed}`,
      affected_rows: 0,
      affected_columns: Object.values(renames),
      before_snapshot: null,
    });
  }

  // 2. Trim whitespace
  const trimResult = trimWhitespace(currentRows);
  currentRows = trimResult.rows;
  if (trimResult.count > 0) {
    totalFixed += trimResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Trim Whitespace',
      operation_mode: 'basic',
      description: `Trimmed extra whitespace in ${trimResult.count} cell(s)`,
      affected_rows: trimResult.count,
      affected_columns: [],
      before_snapshot: null,
    });
  }

  // 3. Remove empty rows
  const emptyResult = removeEmptyRows(currentRows);
  currentRows = emptyResult.rows;
  if (emptyResult.count > 0) {
    totalFixed += emptyResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Remove Empty Rows',
      operation_mode: 'basic',
      description: `Removed ${emptyResult.count} empty row(s)`,
      affected_rows: emptyResult.count,
      affected_columns: [],
      before_snapshot: null,
    });
  }

  return { rows: currentRows, columns: newColumns, logs, totalFixed };
}

export function runSmartCleaning(
  rows: RowData[],
  columns: ColumnSchema[],
  datasetId = 'local'
): CleaningResult {
  // Start with basic cleaning
  const basicResult = runBasicCleaning(rows, columns, datasetId);
  let currentRows = basicResult.rows;
  let currentColumns = basicResult.columns;
  const logs = [...basicResult.logs];
  let totalFixed = basicResult.totalFixed;

  // 4. Remove duplicates
  const dupResult = removeDuplicateRows(currentRows);
  currentRows = dupResult.rows;
  if (dupResult.count > 0) {
    totalFixed += dupResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Remove Duplicate Rows',
      operation_mode: 'smart',
      description: `Removed ${dupResult.count} duplicate row(s)`,
      affected_rows: dupResult.count,
      affected_columns: [],
      before_snapshot: null,
    });
  }

  // 5. Standardize dates
  const dateResult = standardizeDates(currentRows, currentColumns);
  currentRows = dateResult.rows;
  if (dateResult.count > 0) {
    totalFixed += dateResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Standardize Dates',
      operation_mode: 'smart',
      description: `Converted ${dateResult.count} date(s) to ISO format (YYYY-MM-DD)`,
      affected_rows: dateResult.count,
      affected_columns: currentColumns.filter((c) => c.type === 'date').map((c) => c.name),
      before_snapshot: null,
    });
  }

  // 6. Normalize numbers
  const numResult = normalizeNumbers(currentRows, currentColumns);
  currentRows = numResult.rows;
  if (numResult.count > 0) {
    totalFixed += numResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Normalize Numbers',
      operation_mode: 'smart',
      description: `Cleaned ${numResult.count} numeric value(s) (removed commas, fixed formatting)`,
      affected_rows: numResult.count,
      affected_columns: currentColumns.filter((c) => c.type === 'number').map((c) => c.name),
      before_snapshot: null,
    });
  }

  // 7. Normalize booleans
  const boolResult = normalizeBooleans(currentRows, currentColumns);
  currentRows = boolResult.rows;
  if (boolResult.count > 0) {
    totalFixed += boolResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Normalize Booleans',
      operation_mode: 'smart',
      description: `Standardized ${boolResult.count} boolean value(s)`,
      affected_rows: boolResult.count,
      affected_columns: currentColumns.filter((c) => c.type === 'boolean').map((c) => c.name),
      before_snapshot: null,
    });
  }

  // 8. Standardize text
  const textResult = standardizeText(currentRows, currentColumns);
  currentRows = textResult.rows;
  if (textResult.count > 0) {
    totalFixed += textResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Standardize Text',
      operation_mode: 'smart',
      description: `Standardized ${textResult.count} text value(s) in label/name columns`,
      affected_rows: textResult.count,
      affected_columns: [],
      before_snapshot: null,
    });
  }

  // 9. Fill nulls
  const nullResult = fillNullValues(currentRows, currentColumns);
  currentRows = nullResult.rows;
  if (nullResult.count > 0) {
    totalFixed += nullResult.count;
    logs.push({
      dataset_id: datasetId,
      operation_type: 'Fill Null Values',
      operation_mode: 'smart',
      description: `Replaced ${nullResult.count} null value(s) with empty string`,
      affected_rows: nullResult.count,
      affected_columns: [],
      before_snapshot: null,
    });
  }

  return { rows: currentRows, columns: currentColumns, logs, totalFixed };
}

// Add a manual cleaning log entry
export function createManualLog(
  datasetId: string,
  operation: string,
  description: string,
  affectedRows: number,
  affectedCols: string[]
): CleaningLog {
  return {
    id: genId(),
    dataset_id: datasetId,
    operation_type: operation,
    operation_mode: 'manual',
    description,
    affected_rows: affectedRows,
    affected_columns: affectedCols,
    before_snapshot: null,
    created_at: new Date().toISOString(),
  };
}
