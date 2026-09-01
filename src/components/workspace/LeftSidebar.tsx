import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Database, Filter, SortAsc, Wand2, Trash2, PlusCircle,
  ChevronLeft, ChevronRight, RotateCcw, RotateCw, RefreshCw, Eraser, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CleaningMode } from '@/types';
import { runBasicCleaning, runSmartCleaning } from '@/lib/cleaningEngine';
import { detectErrors } from '@/lib/errorDetector';
import { toast } from 'sonner';
import { useState } from 'react';

interface LeftSidebarProps {
  onAddRow: () => void;
  onDeleteSelectedRow: () => void;
}

const CLEANING_MODES: { value: CleaningMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'basic',
    label: 'Basic',
    desc: 'Column names, whitespace, empty rows',
    icon: <Eraser className="w-3.5 h-3.5" />,
  },
  {
    value: 'smart',
    label: 'Smart',
    desc: 'Duplicates, dates, numbers, booleans',
    icon: <Wand2 className="w-3.5 h-3.5" />,
  },
  {
    value: 'ai',
    label: 'AI',
    desc: 'Coming soon — n8n agent automation',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
];

export default function LeftSidebar({ onAddRow, onDeleteSelectedRow }: LeftSidebarProps) {
  const { state, dispatch } = useWorkspace();
  const { dataset, rows, columns, errors, cleaningMode, undoStack, redoStack, leftSidebarOpen, logs } = state;
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCollapse = () => dispatch({ type: 'TOGGLE_LEFT_SIDEBAR' });

  const handleRunCleaning = async () => {
    if (!rows.length) return;
    setIsCleaning(true);
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_DATASET_STATUS', status: 'cleaning' });

    await new Promise((r) => setTimeout(r, 400)); // show progress

    try {
      let result;
      if (cleaningMode === 'basic') {
        result = runBasicCleaning(rows, columns, dataset?.id ?? 'local');
      } else if (cleaningMode === 'smart') {
        result = runSmartCleaning(rows, columns, dataset?.id ?? 'local');
      } else {
        toast.info('AI cleaning coming soon. Applying Smart Cleaning instead.');
        result = runSmartCleaning(rows, columns, dataset?.id ?? 'local');
      }

      // Save undo snapshot
      dispatch({ type: 'SET_ROWS', rows: result.rows, pushUndo: true });
      dispatch({ type: 'SET_COLUMNS', columns: result.columns });

      // Re-detect errors
      const { errors: newErrors } = detectErrors(result.rows, result.columns, dataset?.id ?? 'local');
      dispatch({ type: 'SET_ERRORS', errors: newErrors });

      // Add logs
      const logsWithIds = result.logs.map((l) => ({
        ...l,
        id: Math.random().toString(36).slice(2),
        created_at: new Date().toISOString(),
      }));
      dispatch({ type: 'ADD_LOGS', logs: logsWithIds });
      dispatch({ type: 'SET_DATASET_STATUS', status: 'cleaned' });

      if (result.totalFixed > 0) {
        toast.success(`Cleaned ${result.totalFixed} issue(s) using ${cleaningMode} mode`);
      } else {
        toast.info('No issues found to clean');
      }
    } catch (e) {
      toast.error('Cleaning failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsCleaning(false);
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  if (!leftSidebarOpen) {
    return (
      <div className="flex flex-col items-center py-3 gap-3 w-10 shrink-0 border-r border-border bg-sidebar h-full">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground" onClick={handleCollapse} title="Expand sidebar">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Separator className="bg-sidebar-border" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground" onClick={handleRunCleaning} title="Run cleaning" disabled={!dataset || isCleaning}>
          <Wand2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground" onClick={() => dispatch({ type: 'UNDO' })} disabled={undoStack.length === 0} title="Undo">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground" onClick={() => dispatch({ type: 'REDO' })} disabled={redoStack.length === 0} title="Redo">
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-sidebar-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground">Dataset Tools</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleCollapse}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Dataset info */}
      {dataset && (
        <div className="px-3 py-3 space-y-2 border-b border-sidebar-border">
          <p className="text-xs font-medium text-sidebar-foreground truncate" title={dataset.name}>{dataset.name}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <StatChip label="Rows" value={rows.length.toLocaleString()} />
            <StatChip label="Cols" value={columns.length.toLocaleString()} />
            <StatChip label="Issues" value={errors.filter((e) => !e.is_fixed).length.toLocaleString()} warn={errors.filter((e) => !e.is_fixed).length > 0} />
            <StatChip label="Ops" value={logs.length.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Cleaning modes */}
      <div className="px-3 py-3 border-b border-sidebar-border space-y-2">
        <p className="text-xs font-medium text-sidebar-foreground">Cleaning Mode</p>
        <div className="space-y-1">
          {CLEANING_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => {
                if (mode.value !== 'ai') dispatch({ type: 'SET_CLEANING_MODE', mode: mode.value as CleaningMode });
              }}
              className={cn(
                'w-full flex items-start gap-2 px-2 py-2 rounded text-left transition-colors',
                cleaningMode === mode.value
                  ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/30'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                mode.value === 'ai' && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="mt-0.5 shrink-0">{mode.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">{mode.label}</span>
                  {mode.value === 'ai' && (
                    <Badge variant="outline" className="text-[10px] h-3.5 px-1 border-sidebar-border text-sidebar-foreground/60">Soon</Badge>
                  )}
                </div>
                <p className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">{mode.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Run cleaning */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <Button
          className="w-full h-8 text-xs gap-1.5"
          onClick={handleRunCleaning}
          disabled={!dataset || isCleaning}
        >
          {isCleaning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              Run {cleaningMode === 'basic' ? 'Basic' : cleaningMode === 'smart' ? 'Smart' : 'AI'} Cleaning
            </>
          )}
        </Button>
      </div>

      {/* Row/Column operations */}
      <div className="px-3 py-3 border-b border-sidebar-border space-y-2">
        <p className="text-xs font-medium text-sidebar-foreground">Row Operations</p>
        <div className="space-y-1">
          <SidebarButton icon={<PlusCircle className="w-3.5 h-3.5" />} label="Add Row" onClick={onAddRow} disabled={!dataset} />
          <SidebarButton icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete Selected Row" onClick={onDeleteSelectedRow} disabled={!state.selectedCell} />
        </div>
      </div>

      {/* History */}
      <div className="px-3 py-3 space-y-2">
        <p className="text-xs font-medium text-sidebar-foreground">Edit History</p>
        <div className="space-y-1">
          <SidebarButton
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            label={`Undo${undoStack.length > 0 ? ` (${undoStack.length})` : ''}`}
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={undoStack.length === 0}
          />
          <SidebarButton
            icon={<RotateCw className="w-3.5 h-3.5" />}
            label={`Redo${redoStack.length > 0 ? ` (${redoStack.length})` : ''}`}
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={redoStack.length === 0}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Filter/Sort indicators */}
      {(state.filters.length > 0 || state.sortConfig) && (
        <div className="px-3 py-2 border-t border-sidebar-border space-y-1">
          {state.sortConfig && (
            <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground">
              <SortAsc className="w-3 h-3" />
              <span>Sorted by {state.sortConfig.column}</span>
              <button className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={() => dispatch({ type: 'SET_SORT', config: null })}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          {state.filters.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground">
              <Filter className="w-3 h-3" />
              <span>{state.filters.length} filter{state.filters.length > 1 ? 's' : ''}</span>
              <button className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={() => dispatch({ type: 'SET_FILTERS', filters: [] })}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center px-2 py-1.5 rounded bg-sidebar-accent">
      <span className={cn('text-sm font-semibold tabular-nums', warn ? 'text-warning' : 'text-sidebar-accent-foreground')}>{value}</span>
      <span className="text-[10px] text-sidebar-foreground/60 leading-tight">{label}</span>
    </div>
  );
}

function SidebarButton({
  icon, label, onClick, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
        disabled
          ? 'text-sidebar-foreground/30 cursor-not-allowed'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
