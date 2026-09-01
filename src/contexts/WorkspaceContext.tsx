import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from 'react';
import type {
  CleaningLog,
  CleaningMode,
  ColumnSchema,
  DataError,
  Dataset,
  FilterConfig,
  RowData,
  SortConfig,
} from '@/types';

// ─── State ───────────────────────────────────────────────────────────
interface State {
  dataset: Dataset | null;
  rows: RowData[];
  originalRows: RowData[];
  columns: ColumnSchema[];
  errors: DataError[];
  logs: CleaningLog[];
  selectedCell: { rowIndex: number; columnName: string } | null;
  sortConfig: SortConfig | null;
  filters: FilterConfig[];
  undoStack: RowData[][];
  redoStack: RowData[][];
  isDirty: boolean;
  isLoading: boolean;
  cleaningMode: CleaningMode;
  errorPanelOpen: boolean;
  logPanelOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarOpen: boolean;
}

const initialState: State = {
  dataset: null,
  rows: [],
  originalRows: [],
  columns: [],
  errors: [],
  logs: [],
  selectedCell: null,
  sortConfig: null,
  filters: [],
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isLoading: false,
  cleaningMode: 'basic',
  errorPanelOpen: true,
  logPanelOpen: false,
  rightSidebarOpen: true,
  leftSidebarOpen: true,
};

// ─── Actions ─────────────────────────────────────────────────────────
type Action =
  | { type: 'LOAD_DATASET'; dataset: Dataset; rows: RowData[]; columns: ColumnSchema[]; errors: DataError[] }
  | { type: 'SET_ROWS'; rows: RowData[]; pushUndo?: boolean }
  | { type: 'SET_COLUMNS'; columns: ColumnSchema[] }
  | { type: 'SET_ERRORS'; errors: DataError[] }
  | { type: 'SET_DATASET_STATUS'; status: Dataset['status'] }
  | { type: 'ADD_LOG'; log: CleaningLog }
  | { type: 'ADD_LOGS'; logs: CleaningLog[] }
  | { type: 'SELECT_CELL'; rowIndex: number; columnName: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SORT'; config: SortConfig | null }
  | { type: 'SET_FILTERS'; filters: FilterConfig[] }
  | { type: 'SET_CLEANING_MODE'; mode: CleaningMode }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'MARK_DIRTY'; dirty: boolean }
  | { type: 'TOGGLE_ERROR_PANEL' }
  | { type: 'TOGGLE_LOG_PANEL' }
  | { type: 'TOGGLE_RIGHT_SIDEBAR' }
  | { type: 'TOGGLE_LEFT_SIDEBAR' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_DATASET':
      return {
        ...initialState,
        dataset: action.dataset,
        rows: action.rows,
        originalRows: action.rows,
        columns: action.columns,
        errors: action.errors,
        errorPanelOpen: action.errors.length > 0,
        leftSidebarOpen: true,
        rightSidebarOpen: true,
      };

    case 'SET_ROWS': {
      const newUndo = action.pushUndo
        ? [...state.undoStack.slice(-49), state.rows]
        : state.undoStack;
      return {
        ...state,
        rows: action.rows,
        undoStack: newUndo,
        redoStack: action.pushUndo ? [] : state.redoStack,
        isDirty: true,
      };
    }

    case 'SET_COLUMNS':
      return { ...state, columns: action.columns };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors,
        errorPanelOpen: action.errors.length > 0 ? true : state.errorPanelOpen,
      };

    case 'SET_DATASET_STATUS':
      return {
        ...state,
        dataset: state.dataset ? { ...state.dataset, status: action.status } : null,
      };

    case 'ADD_LOG':
      return { ...state, logs: [action.log, ...state.logs] };

    case 'ADD_LOGS':
      return { ...state, logs: [...action.logs, ...state.logs] };

    case 'SELECT_CELL':
      return { ...state, selectedCell: { rowIndex: action.rowIndex, columnName: action.columnName } };

    case 'CLEAR_SELECTION':
      return { ...state, selectedCell: null };

    case 'SET_SORT':
      return { ...state, sortConfig: action.config };

    case 'SET_FILTERS':
      return { ...state, filters: action.filters };

    case 'SET_CLEANING_MODE':
      return { ...state, cleaningMode: action.mode };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        rows: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [state.rows, ...state.redoStack.slice(0, 49)],
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[0];
      return {
        ...state,
        rows: next,
        undoStack: [...state.undoStack.slice(-49), state.rows],
        redoStack: state.redoStack.slice(1),
        isDirty: true,
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };

    case 'MARK_DIRTY':
      return { ...state, isDirty: action.dirty };

    case 'TOGGLE_ERROR_PANEL':
      return { ...state, errorPanelOpen: !state.errorPanelOpen };

    case 'TOGGLE_LOG_PANEL':
      return { ...state, logPanelOpen: !state.logPanelOpen };

    case 'TOGGLE_RIGHT_SIDEBAR':
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen };

    case 'TOGGLE_LEFT_SIDEBAR':
      return { ...state, leftSidebarOpen: !state.leftSidebarOpen };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────
interface WorkspaceContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  // Derived helpers
  getFilteredSortedRows: () => RowData[];
  getErrorCellMap: () => Map<string, string[]>;
  getDuplicateRows: () => Set<number>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const errorCellMapRef = useRef<Map<string, string[]>>(new Map());
  const duplicateRowsRef = useRef<Set<number>>(new Set());

  // Build error cell map from errors array
  const getErrorCellMap = useCallback(() => {
    const map = new Map<string, string[]>();
    for (const err of state.errors) {
      if (err.row_index !== null && err.column_name) {
        const key = `${err.row_index}::${err.column_name}`;
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, err.error_type]);
      }
    }
    errorCellMapRef.current = map;
    return map;
  }, [state.errors]);

  const getDuplicateRows = useCallback(() => {
    const dupes = new Set<number>();
    for (const err of state.errors) {
      if (err.error_type === 'duplicate_row' && err.row_index !== null) {
        dupes.add(err.row_index);
      }
    }
    duplicateRowsRef.current = dupes;
    return dupes;
  }, [state.errors]);

  const getFilteredSortedRows = useCallback(() => {
    let rows = [...state.rows];

    // Apply filters
    for (const filter of state.filters) {
      rows = rows.filter((row) => {
        const val = String(row[filter.column] ?? '').toLowerCase();
        const fval = filter.value.toLowerCase();
        switch (filter.operator) {
          case 'contains': return val.includes(fval);
          case 'equals': return val === fval;
          case 'starts_with': return val.startsWith(fval);
          case 'ends_with': return val.endsWith(fval);
          case 'is_empty': return val.trim() === '';
          case 'is_not_empty': return val.trim() !== '';
          default: return true;
        }
      });
    }

    // Apply sort
    if (state.sortConfig) {
      const { column, direction } = state.sortConfig;
      rows.sort((a, b) => {
        const av = String(a[column] ?? '');
        const bv = String(b[column] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [state.rows, state.filters, state.sortConfig]);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch, getFilteredSortedRows, getErrorCellMap, getDuplicateRows }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
