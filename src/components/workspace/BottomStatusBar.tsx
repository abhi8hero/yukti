import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AlertTriangle, CheckCircle2, Clock, Database, Activity, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function BottomStatusBar() {
  const { state, dispatch } = useWorkspace();
  const { dataset, rows, columns, errors, selectedCell, isLoading, errorPanelOpen, logPanelOpen, logs } = state;

  const unfixedErrors = errors.filter((e) => !e.is_fixed).length;

  if (!dataset) return null;

  return (
    <div className="flex items-center h-7 px-3 border-t border-border bg-card shrink-0 gap-4 text-xs text-muted-foreground select-none overflow-x-auto">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isLoading ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Processing...</span>
          </>
        ) : dataset.status === 'cleaned' ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span className="text-success">Cleaned</span>
          </>
        ) : (
          <>
            <Activity className="w-3 h-3" />
            <span className="capitalize">{dataset.status}</span>
          </>
        )}
      </div>

      <span className="text-border">|</span>

      {/* Dimensions */}
      <div className="flex items-center gap-1 shrink-0">
        <Database className="w-3 h-3" />
        <span>{rows.length.toLocaleString()} × {columns.length}</span>
      </div>

      {/* Selected cell */}
      {selectedCell && (
        <>
          <span className="text-border">|</span>
          <span className="font-data shrink-0">
            R{selectedCell.rowIndex + 1} C:{selectedCell.columnName}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Error toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-5 px-2 text-xs gap-1',
          unfixedErrors > 0 ? 'text-warning' : 'text-success',
          errorPanelOpen && 'bg-accent'
        )}
        onClick={() => dispatch({ type: 'TOGGLE_ERROR_PANEL' })}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>{unfixedErrors} issue{unfixedErrors !== 1 ? 's' : ''}</span>
      </Button>

      {/* Log toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-5 px-2 text-xs gap-1', logPanelOpen && 'bg-accent')}
        onClick={() => dispatch({ type: 'TOGGLE_LOG_PANEL' })}
      >
        <List className="w-3 h-3" />
        <span>{logs.length} op{logs.length !== 1 ? 's' : ''}</span>
      </Button>

      {/* Timestamp */}
      <div className="flex items-center gap-1 shrink-0 hidden md:flex">
        <Clock className="w-3 h-3" />
        <span>{new Date(dataset.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
