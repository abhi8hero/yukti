import { useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { detectErrors } from '@/lib/errorDetector';
import { createManualLog } from '@/lib/cleaningEngine';
import type { Dataset, UploadedFileInfo } from '@/types';
import TopNav from './TopNav';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import SpreadsheetGrid from './SpreadsheetGrid';
import ErrorPanel from './ErrorPanel';
import LogPanel from './LogPanel';
import BottomStatusBar from './BottomStatusBar';
import { toast } from 'sonner';

interface WorkspacePageProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onBackToUpload: () => void;
}

export default function WorkspacePage({ darkMode, onToggleDark, onBackToUpload }: WorkspacePageProps) {
  const { state, dispatch } = useWorkspace();

  const handleAddRow = useCallback(() => {
    const { columns, rows, dataset } = state;
    const emptyRow = columns.reduce<Record<string, string>>((acc, col) => {
      acc[col.name] = '';
      return acc;
    }, {});

    dispatch({ type: 'SET_ROWS', rows: [...rows, emptyRow], pushUndo: true });

    if (dataset) {
      const log = createManualLog(dataset.id, 'Add Row', `Added empty row at position ${rows.length + 1}`, 1, []);
      dispatch({ type: 'ADD_LOG', log });
    }
    toast.success('Added new row');
  }, [state, dispatch]);

  const handleDeleteSelectedRow = useCallback(() => {
    const { selectedCell, rows, dataset, columns } = state;
    if (!selectedCell) return;

    const { rowIndex } = selectedCell;
    if (rowIndex < 0 || rowIndex >= rows.length) return;

    const newRows = rows.filter((_, i) => i !== rowIndex);
    dispatch({ type: 'SET_ROWS', rows: newRows, pushUndo: true });

    // Re-detect errors
    const { errors: newErrors } = detectErrors(newRows, columns, dataset?.id ?? 'local');
    dispatch({ type: 'SET_ERRORS', errors: newErrors });

    if (dataset) {
      const log = createManualLog(dataset.id, 'Delete Row', `Deleted row ${rowIndex + 1}`, 1, []);
      dispatch({ type: 'ADD_LOG', log });
    }
    dispatch({ type: 'CLEAR_SELECTION' });
    toast.success(`Deleted row ${rowIndex + 1}`);
  }, [state, dispatch]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav darkMode={darkMode} onToggleDark={onToggleDark} onBackToUpload={onBackToUpload} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <LeftSidebar onAddRow={handleAddRow} onDeleteSelectedRow={handleDeleteSelectedRow} />
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <SpreadsheetGrid />
          <ErrorPanel />
          <LogPanel />
          <BottomStatusBar />
        </div>

        {/* Right sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

// ─── Load Dataset Helper (exported for use in root) ──────────────────
export function useLoadDataset() {
  const { dispatch } = useWorkspace();

  return useCallback((info: UploadedFileInfo) => {
    const dataset: Dataset = {
      id: 'local-' + Date.now(),
      name: info.file.name.replace(/\.[^.]+$/, ''),
      original_filename: info.file.name,
      file_format: info.format,
      row_count: info.rowCount,
      column_count: info.columnCount,
      schema_info: info.columns,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Load data immediately with no errors so the view can switch right away
    dispatch({
      type: 'LOAD_DATASET',
      dataset,
      rows: info.rawData,
      columns: info.columns,
      errors: [],
    });

    // 2. Run error detection asynchronously after the workspace has rendered
    //    so it never blocks the view transition
    setTimeout(() => {
      try {
        dispatch({ type: 'SET_LOADING', loading: true });
        const { errors } = detectErrors(info.rawData, info.columns, dataset.id);
        dispatch({ type: 'SET_ERRORS', errors });
      } catch (e) {
        console.error('[ADCP] Error detection failed:', e);
        toast.error('Could not scan for data errors. The dataset is still loaded.');
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }, 80);
  }, [dispatch]);
}
