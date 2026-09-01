export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// ADCP Core Types

export type FileFormat = 'csv' | 'xlsx' | 'json' | 'txt';
export type DatasetStatus = 'uploaded' | 'analyzing' | 'ready' | 'cleaning' | 'cleaned' | 'exported';
export type CleaningMode = 'basic' | 'smart' | 'ai';
export type ErrorType =
  | 'missing_value'
  | 'invalid_type'
  | 'wrong_date_format'
  | 'duplicate_row'
  | 'mixed_types'
  | 'empty_column'
  | 'formatting'
  | 'encoding'
  | 'extra_whitespace'
  | 'inconsistent_value';

export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'mixed' | 'empty';

export interface ColumnSchema {
  name: string;
  originalName: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface Dataset {
  id: string;
  name: string;
  original_filename: string;
  file_format: FileFormat;
  row_count: number;
  column_count: number;
  schema_info: ColumnSchema[];
  status: DatasetStatus;
  created_at: string;
  updated_at: string;
}

export type RowData = Record<string, string | number | null | boolean>;

export interface DatasetRow {
  id: string;
  dataset_id: string;
  row_index: number;
  row_data: RowData;
}

export interface DataError {
  id: string;
  dataset_id: string;
  row_index: number | null;
  column_name: string | null;
  error_type: ErrorType;
  error_description: string;
  suggested_fix: string | null;
  is_fixed: boolean;
  created_at: string;
}

export interface CleaningLog {
  id: string;
  dataset_id: string;
  operation_type: string;
  operation_mode: 'manual' | 'basic' | 'smart' | 'ai';
  description: string;
  affected_rows: number;
  affected_columns: string[];
  before_snapshot: RowData[] | null;
  created_at: string;
}

export interface CleaningSummary {
  totalFixed: number;
  operationsApplied: string[];
  affectedColumns: string[];
  duration: number;
}

export interface UploadedFileInfo {
  file: File;
  format: FileFormat;
  rawData: RowData[];
  columns: ColumnSchema[];
  previewRows: RowData[];
  rowCount: number;
  columnCount: number;
}

export interface CellPosition {
  rowIndex: number;
  columnName: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  column: string;
  value: string;
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
}

export interface WorkspaceState {
  dataset: Dataset | null;
  rows: RowData[];
  columns: ColumnSchema[];
  errors: DataError[];
  logs: CleaningLog[];
  selectedCell: CellPosition | null;
  sortConfig: SortConfig | null;
  filters: FilterConfig[];
  undoStack: RowData[][];
  redoStack: RowData[][];
  isDirty: boolean;
  isLoading: boolean;
  cleaningMode: CleaningMode;
}
