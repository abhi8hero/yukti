import { useState } from 'react';
import {
  Database, Sun, Moon, Download, Save, RotateCcw, Menu, X,
  ChevronLeft, AlertTriangle, CheckCircle2, FileText, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportDataset, getExportFilename } from '@/lib/exportEngine';
import { toast } from 'sonner';

interface TopNavProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onBackToUpload: () => void;
}

export default function TopNav({ darkMode, onToggleDark, onBackToUpload }: TopNavProps) {
  const { state, dispatch } = useWorkspace();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { dataset, rows, columns, errors, isDirty, isLoading } = state;

  const unfixedErrors = errors.filter((e) => !e.is_fixed).length;
  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  const handleExport = (format: 'csv' | 'xlsx' | 'json') => {
    if (!dataset || rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      const filename = getExportFilename(dataset.original_filename);
      exportDataset(rows, columns, filename, format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <header className="flex items-center h-11 px-3 border-b border-border bg-card shrink-0 gap-2">
      {/* Logo + Name */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onBackToUpload}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Back to upload"
        >
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground hidden md:block">YUKTI</span>
        </button>

        {dataset && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground hidden md:block rotate-180" />
            <span className="text-xs text-muted-foreground hidden md:block truncate max-w-40">
              {dataset.name}
            </span>
          </>
        )}
      </div>

      {/* Center status */}
      {dataset && (
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Processing...</span>
            </div>
          )}
          {!isLoading && unfixedErrors > 0 && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_ERROR_PANEL' })}
              className="flex items-center gap-1.5 text-xs text-warning hover:text-warning/80 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unfixedErrors} issue{unfixedErrors > 1 ? 's' : ''}</span>
            </button>
          )}
          {!isLoading && unfixedErrors === 0 && dataset && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">No issues detected</span>
            </div>
          )}
          {isDirty && (
            <Badge variant="outline" className="text-xs border-warning/40 text-warning h-5 px-1.5">
              Unsaved
            </Badge>
          )}
        </div>
      )}

      {!dataset && <div className="flex-1" />}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {dataset && (
          <>
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hidden md:flex"
              disabled={!canUndo}
              onClick={() => dispatch({ type: 'UNDO' })}
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>

            {/* Save state indicator */}
            <button
              className={cn(
                'h-7 w-7 hidden md:flex items-center justify-center rounded-sm hover:bg-accent transition-colors',
                isDirty ? 'text-warning' : 'text-muted-foreground'
              )}
              title={isDirty ? 'Changes not exported yet' : 'Up to date'}
              onClick={() => {}}
            >
              <Save className="w-3.5 h-3.5" />
            </button>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-7 text-xs px-2.5 gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Export as</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')} className="gap-2 text-xs">
                  <Layers className="w-3.5 h-3.5" />
                  XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Dark mode */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleDark}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>

        {/* Mobile menu */}
        {dataset && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setMobileSidebarOpen((v) => !v)}
          >
            {mobileSidebarOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </header>
  );
}
