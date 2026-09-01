import { useState, useMemo } from 'react';
import {
  AlertTriangle, X, ChevronDown, ChevronUp, CheckCircle2,
  Filter, ArrowRight, Wrench, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import type { DataError, ErrorType } from '@/types';

const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  missing_value: 'Missing Value',
  invalid_type: 'Invalid Type',
  wrong_date_format: 'Wrong Date Format',
  duplicate_row: 'Duplicate Row',
  mixed_types: 'Mixed Types',
  empty_column: 'Empty Column',
  formatting: 'Formatting',
  encoding: 'Encoding Issue',
  extra_whitespace: 'Extra Whitespace',
  inconsistent_value: 'Inconsistent Value',
};

const ERROR_SEVERITY: Record<ErrorType, 'high' | 'medium' | 'low'> = {
  missing_value: 'high',
  invalid_type: 'high',
  wrong_date_format: 'medium',
  duplicate_row: 'medium',
  mixed_types: 'medium',
  empty_column: 'medium',
  formatting: 'low',
  encoding: 'high',
  extra_whitespace: 'low',
  inconsistent_value: 'low',
};

const SEVERITY_STYLES = {
  high: 'text-destructive bg-destructive/10 border-destructive/30',
  medium: 'text-warning bg-warning/10 border-warning/30',
  low: 'text-info bg-info/10 border-info/30',
};

const SEVERITY_DOT = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-info',
};

export default function ErrorPanel() {
  const { state, dispatch } = useWorkspace();
  const { errors, errorPanelOpen } = state;
  const [filterType, setFilterType] = useState<ErrorType | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState<'compact' | 'medium' | 'full'>('medium');

  const unfixedErrors = errors.filter((e) => !e.is_fixed);
  const fixedErrors = errors.filter((e) => e.is_fixed);

  const filteredErrors = useMemo(() => {
    if (filterType === 'all') return unfixedErrors;
    return unfixedErrors.filter((e) => e.error_type === filterType);
  }, [unfixedErrors, filterType]);

  // Error type summary counts
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<ErrorType, number>> = {};
    for (const e of unfixedErrors) {
      counts[e.error_type] = (counts[e.error_type] ?? 0) + 1;
    }
    return counts;
  }, [unfixedErrors]);

  const sortedTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);

  const handleNavigateToError = (error: DataError) => {
    if (error.row_index !== null && error.column_name) {
      dispatch({ type: 'SELECT_CELL', rowIndex: error.row_index, columnName: error.column_name });
    }
  };

  const heightClass = {
    compact: 'h-9',
    medium: 'h-52',
    full: 'h-80',
  };

  if (!errorPanelOpen) return null;

  // Show a scanning indicator while error detection is running (errors=[] but dataset loaded + isLoading)
  const isScanning = state.isLoading && errors.length === 0 && !!state.dataset;

  return (
    <div className={cn(
      'shrink-0 border-t border-border bg-card flex flex-col transition-all duration-150',
      heightClass[panelHeight]
    )}>
      {/* Panel header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
        <span className="text-xs font-semibold text-foreground">
          Error Detection
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] h-4 px-1.5',
            isScanning ? 'border-info/40 text-info' :
            unfixedErrors.length > 0 ? 'border-warning/40 text-warning' : 'border-success/40 text-success'
          )}
        >
          {isScanning ? 'scanning…' : `${unfixedErrors.length} issue${unfixedErrors.length !== 1 ? 's' : ''}`}
        </Badge>
        {fixedErrors.length > 0 && (
          <span className="text-[10px] text-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {fixedErrors.length} fixed
          </span>
        )}

        <div className="flex-1" />

        {/* Height controls */}
        <div className="flex items-center gap-0.5">
          {(['compact', 'medium', 'full'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setPanelHeight(h)}
              className={cn(
                'w-3 h-5 flex items-end justify-center',
                panelHeight === h ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              title={h}
            >
              <div className={cn(
                'w-2.5 rounded-sm bg-current',
                h === 'compact' ? 'h-1.5' : h === 'medium' ? 'h-3' : 'h-4'
              )} />
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={() => dispatch({ type: 'TOGGLE_ERROR_PANEL' })}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {panelHeight !== 'compact' && (
        <div className="flex flex-1 min-h-0">
          {/* Summary sidebar */}
          <div className="w-44 shrink-0 border-r border-border overflow-y-auto bg-muted/20">
            <div className="px-2 pt-2 pb-1">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors',
                  filterType === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <span>All Issues</span>
                <span className="font-semibold">{unfixedErrors.length}</span>
              </button>
            </div>
            <div className="px-2 pb-2 space-y-0.5">
              {sortedTypes.map(([type, count]) => {
                const errType = type as ErrorType;
                const severity = ERROR_SEVERITY[errType];
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(errType)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left',
                      filterType === errType ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[severity])} />
                    <span className="flex-1 truncate">{ERROR_TYPE_LABELS[errType]}</span>
                    <span className="font-semibold shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error list */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {filteredErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-success" />
                <span className="text-xs">
                  {unfixedErrors.length === 0 ? 'No issues detected' : 'No issues in this category'}
                </span>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-16">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-32">Column</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-36">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-48">Suggested Fix</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.map((error) => {
                    const severity = ERROR_SEVERITY[error.error_type];
                    const isExpanded = expanded === error.id;
                    return (
                      <tr
                        key={error.id}
                        className={cn(
                          'border-b border-border hover:bg-accent/30 cursor-pointer transition-colors',
                          isExpanded && 'bg-accent/20'
                        )}
                        onClick={() => setExpanded(isExpanded ? null : error.id)}
                      >
                        <td className="px-3 py-1.5">
                          <span className="font-data text-muted-foreground">
                            {error.row_index !== null ? error.row_index + 1 : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-data truncate block max-w-28" title={error.column_name ?? ''}>
                            {error.column_name || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', SEVERITY_STYLES[severity])}>
                            {ERROR_TYPE_LABELS[error.error_type]}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="text-foreground truncate block max-w-64" title={error.error_description}>
                            {error.error_description}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {error.suggested_fix && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Wrench className="w-3 h-3 shrink-0" />
                              <span className="truncate">{error.suggested_fix}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            {error.row_index !== null && error.column_name && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-primary hover:text-primary"
                                title="Navigate to cell"
                                onClick={(e) => { e.stopPropagation(); handleNavigateToError(error); }}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// suppress unused import warning
void Filter;
void RefreshCw;
