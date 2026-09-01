import type { ColumnSchema, DataError, ErrorType, RowData } from '@/types';

// Generates a unique enough id for client-side errors
function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DATE_FORMATS = [
  /^\d{4}-\d{2}-\d{2}$/,          // ISO: 2023-01-15
  /^\d{2}\/\d{2}\/\d{4}$/,        // US: 01/15/2023
  /^\d{2}-\d{2}-\d{4}$/,          // EU: 15-01-2023
  /^\d{4}\/\d{2}\/\d{2}$/,        // Asian: 2023/01/15
];

function isValidDate(value: string): boolean {
  const trimmed = value.trim();
  return DATE_FORMATS.some((re) => re.test(trimmed)) && !isNaN(Date.parse(trimmed));
}

function isNumeric(value: string): boolean {
  return !isNaN(Number(value.replace(/,/g, ''))) && value.trim() !== '';
}

function hasExtraWhitespace(value: string): boolean {
  return value !== value.trim() || /\s{2,}/.test(value);
}

export interface ErrorDetectionResult {
  errors: DataError[];
  duplicateRowIndices: Set<number>;
  errorCellMap: Map<string, ErrorType[]>;
}

export function detectErrors(
  rows: RowData[],
  columns: ColumnSchema[],
  datasetId = 'local'
): ErrorDetectionResult {
  const errors: DataError[] = [];
  const errorCellMap = new Map<string, ErrorType[]>();
  const duplicateRowIndices = new Set<number>();

  const addError = (
    rowIndex: number | null,
    columnName: string | null,
    type: ErrorType,
    description: string,
    suggestedFix: string | null = null
  ) => {
    errors.push({
      id: genId(),
      dataset_id: datasetId,
      row_index: rowIndex,
      column_name: columnName,
      error_type: type,
      error_description: description,
      suggested_fix: suggestedFix,
      is_fixed: false,
      created_at: new Date().toISOString(),
    });
    if (rowIndex !== null && columnName !== null) {
      const key = `${rowIndex}::${columnName}`;
      const existing = errorCellMap.get(key) ?? [];
      errorCellMap.set(key, [...existing, type]);
    }
  };

  // Check empty columns
  for (const col of columns) {
    if (col.type === 'empty') {
      addError(null, col.name, 'empty_column', `Column "${col.name}" is entirely empty`, 'Consider removing this column');
    }
  }

  // Row-level hash for duplicate detection
  const rowHashes = new Map<string, number>();

  rows.forEach((row, rowIndex) => {
    // Guard against null/undefined rows (some parsers can emit them)
    if (!row || typeof row !== 'object') return;

    const rowHash = JSON.stringify(
      Object.keys(row).sort().reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = String(row[k] ?? '').trim().toLowerCase();
        return acc;
      }, {})
    );

    // Duplicate check
    if (rowHashes.has(rowHash)) {
      const firstIdx = rowHashes.get(rowHash)!;
      if (!duplicateRowIndices.has(firstIdx)) {
        addError(firstIdx, null, 'duplicate_row', `Row ${firstIdx + 1} is a duplicate`, 'Remove duplicate row');
        duplicateRowIndices.add(firstIdx);
      }
      addError(rowIndex, null, 'duplicate_row', `Row ${rowIndex + 1} is a duplicate of row ${firstIdx + 1}`, 'Remove duplicate row');
      duplicateRowIndices.add(rowIndex);
    } else {
      rowHashes.set(rowHash, rowIndex);
    }

    // Column-level checks
    for (const col of columns) {
      const rawValue = row[col.name];
      const value = rawValue === null || rawValue === undefined ? null : String(rawValue);

      // Missing value
      if (value === null || value.trim() === '') {
        addError(rowIndex, col.name, 'missing_value', `Missing value in "${col.name}" at row ${rowIndex + 1}`, 'Fill in the missing value or remove the row');
        continue;
      }

      // Extra whitespace
      if (typeof value === 'string' && hasExtraWhitespace(value)) {
        addError(rowIndex, col.name, 'extra_whitespace', `Extra whitespace in "${col.name}" at row ${rowIndex + 1}`, 'Trim whitespace');
      }

      // Type validation
      if (col.type === 'number' && !isNumeric(value)) {
        addError(rowIndex, col.name, 'invalid_type', `Expected number in "${col.name}" at row ${rowIndex + 1}, got: "${value}"`, `Convert "${value}" to a valid number`);
      } else if (col.type === 'date') {
        if (!isValidDate(value)) {
          addError(rowIndex, col.name, 'wrong_date_format', `Invalid date format in "${col.name}" at row ${rowIndex + 1}: "${value}"`, 'Use format YYYY-MM-DD');
        }
      } else if (col.type === 'mixed') {
        if (!isNumeric(value) && !isNaN(Date.parse(value))) {
          addError(rowIndex, col.name, 'mixed_types', `Mixed data types in "${col.name}" at row ${rowIndex + 1}`, 'Standardize column type');
        }
      }

      // Encoding check: non-printable characters
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
        addError(rowIndex, col.name, 'encoding', `Encoding issue in "${col.name}" at row ${rowIndex + 1}`, 'Remove or replace non-printable characters');
      }
    }
  });

  return { errors, duplicateRowIndices, errorCellMap };
}
