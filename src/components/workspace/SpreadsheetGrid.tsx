import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import type { RowData } from '@/types';
import {
  ArrowUp, ArrowDown, Search, X, ChevronDown, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createManualLog } from '@/lib/cleaningEngine';
import { detectErrors } from '@/lib/errorDetector';
import { toast } from 'sonner';

const ROW_HEIGHT = 28;
const COL_MIN_WIDTH = 120;
const COL_MAX_WIDTH = 320;
const ROW_NUM_WIDTH = 52;
const OVERSCAN = 10;

interface EditingCell {
  rowIndex: number;
  columnName: string;
  value: string;
}

export default function SpreadsheetGrid() {
  const { state, dispatch, getFilteredSortedRows, getErrorCellMap, getDuplicateRows } = useWorkspace();
  const { columns, selectedCell, sortConfig, isLoading, dataset } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const displayRows = getFilteredSortedRows();
  const errorCellMap = getErrorCellMap();
  const duplicateRows = getDuplicateRows();

  // Apply search highlight filter
  const filteredRows = searchQuery.trim()
    ? displayRows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : displayRows;

  // Virtual rendering
  const totalHeight = filteredRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(filteredRows.length, startIndex + visibleCount);
  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Column width: auto-calculate from sample values
  const getColWidth = useCallback((colName: string) => {
    const headerLen = colName.length;
    const col = columns.find((c) => c.name === colName);
    const maxSample = Math.max(...(col?.sampleValues ?? []).map((s) => s.length), 0);
    const raw = Math.max(headerLen, maxSample) * 8 + 32;
    return Math.min(COL_MAX_WIDTH, Math.max(COL_MIN_WIDTH, raw));
  }, [columns]);

  const handleCellClick = useCallback((rowIndex: number, columnName: string) => {
    dispatch({ type: 'SELECT_CELL', rowIndex, columnName });
    setEditingCell(null);
  }, [dispatch]);

  const handleCellDoubleClick = useCallback((rowIndex: number, columnName: string, value: string) => {
    dispatch({ type: 'SELECT_CELL', rowIndex, columnName });
    setEditingCell({ rowIndex, columnName, value: value ?? '' });
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [dispatch]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowIndex, columnName, value } = editingCell;
    const actualRow = filteredRows[rowIndex];
    if (!actualRow) return;

    // Find actual index in state.rows
    const actualIndex = state.rows.indexOf(actualRow);
    if (actualIndex === -1) return;

    const newRows = state.rows.map((r, i) =>
      i === actualIndex ? { ...r, [columnName]: value } : r
    );
    dispatch({ type: 'SET_ROWS', rows: newRows, pushUndo: true });

    // Log the edit
    if (dataset) {
      const log = createManualLog(dataset.id, 'Cell Edit', `Edited cell [Row ${rowIndex + 1}, ${columnName}]`, 1, [columnName]);
      dispatch({ type: 'ADD_LOG', log });
    }

    // Re-detect errors
    const { errors: newErrors } = detectErrors(newRows, state.columns, dataset?.id ?? 'local');
    dispatch({ type: 'SET_ERRORS', errors: newErrors });

    setEditingCell(null);
  }, [editingCell, filteredRows, state.rows, state.columns, dispatch, dataset]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
    e.stopPropagation();
  }, [commitEdit, cancelEdit]);

  const handleSort = (colName: string) => {
    if (sortConfig?.column === colName) {
      if (sortConfig.direction === 'asc') {
        dispatch({ type: 'SET_SORT', config: { column: colName, direction: 'desc' } });
      } else {
        dispatch({ type: 'SET_SORT', config: null });
      }
    } else {
      dispatch({ type: 'SET_SORT', config: { column: colName, direction: 'asc' } });
    }
  };

  const handleFilterColumn = (colName: string, op: 'is_empty' | 'is_not_empty') => {
    const existing = state.filters.filter((f) => f.column !== colName);
    dispatch({
      type: 'SET_FILTERS',
      filters: [...existing, { column: colName, value: '', operator: op }],
    });
    toast.info(`Filter applied: ${colName} ${op.replace('_', ' ')}`);
  };

  const handleRenameColumn = (oldName: string) => {
    const newName = window.prompt(`Rename column "${oldName}" to:`, oldName);
    if (!newName || newName === oldName || !newName.trim()) return;

    const newColumns = columns.map((c) => c.name === oldName ? { ...c, name: newName.trim() } : c);
    const newRows = state.rows.map((r) => {
      const nr = { ...r };
      nr[newName.trim()] = r[oldName];
      delete nr[oldName];
      return nr;
    });
    dispatch({ type: 'SET_COLUMNS', columns: newColumns });
    dispatch({ type: 'SET_ROWS', rows: newRows, pushUndo: true });
    if (dataset) {
      const log = createManualLog(dataset.id, 'Rename Column', `Renamed "${oldName}" to "${newName.trim()}"`, 0, [newName.trim()]);
      dispatch({ type: 'ADD_LOG', log });
    }
    toast.success(`Renamed "${oldName}" to "${newName.trim()}"`);
  };

  const handleDeleteColumn = (colName: string) => {
    if (!window.confirm(`Delete column "${colName}"? This cannot be undone.`)) return;
    const newCols = columns.filter((c) => c.name !== colName);
    const newRows = state.rows.map((r) => {
      const nr = { ...r };
      delete nr[colName];
      return nr;
    });
    dispatch({ type: 'SET_COLUMNS', columns: newCols });
    dispatch({ type: 'SET_ROWS', rows: newRows, pushUndo: true });
    if (dataset) {
      const log = createManualLog(dataset.id, 'Delete Column', `Deleted column "${colName}"`, newRows.length, [colName]);
      dispatch({ type: 'ADD_LOG', log });
    }
    toast.success(`Deleted column "${colName}"`);
  };

  const getCellClassName = (rowIndex: number, colName: string, isDuplicate: boolean, value: string | number | boolean | null) => {
    const key = `${rowIndex}::${colName}`;
    const errs = errorCellMap.get(key) ?? [];
    const hasError = errs.length > 0;
    const isEmpty = value === null || value === undefined || String(value).trim() === '';

    return cn(
      'adcp-cell border-r border-b border-border',
      hasError && 'error',
      isDuplicate && !hasError && 'duplicate',
      isEmpty && !hasError && 'null-cell',
      selectedCell?.rowIndex === rowIndex && selectedCell?.columnName === colName && 'selected'
    );
  };

  if (!dataset) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Upload a dataset to get started
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Grid toolbar */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-card shrink-0">
        <span className="text-xs text-muted-foreground">
          {filteredRows.length.toLocaleString()} of {state.rows.length.toLocaleString()} rows
          {searchQuery && ' (filtered)'}
        </span>
        <div className="flex-1" />
        {showSearch && (
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              className="h-6 pl-6 pr-6 text-xs"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6', showSearch && 'text-primary')}
          onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearchQuery(''); }}
          title="Search"
        >
          <Search className="w-3.5 h-3.5" />
        </Button>
        {state.filters.length > 0 && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-warning" onClick={() => dispatch({ type: 'SET_FILTERS', filters: [] })} title="Clear filters">
            <Filter className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="relative overflow-hidden h-0.5 shrink-0">
          <div className="absolute inset-0 bg-muted" />
          <div className="adcp-loading-bar absolute inset-y-0 left-0 right-0" />
        </div>
      )}

      {/* Scrollable grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto min-h-0 min-w-0"
        onScroll={handleScroll}
      >
        <div className="inline-block min-w-full">
          {/* Header row */}
          <div className="flex sticky top-0 z-20">
            {/* Row number header */}
            <div
              className="adcp-header-cell sticky left-0 z-30 bg-muted border-r border-b border-border"
              style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
            >
              #
            </div>
            {/* Column headers */}
            {columns.map((col) => {
              const isSorted = sortConfig?.column === col.name;
              const width = getColWidth(col.name);
              return (
                <div
                  key={col.name}
                  className="adcp-header-cell group relative flex items-center gap-1 cursor-pointer select-none"
                  style={{ width, minWidth: COL_MIN_WIDTH }}
                  onClick={() => handleSort(col.name)}
                >
                  <span className="truncate flex-1 text-xs">{col.name}</span>
                  {isSorted ? (
                    sortConfig?.direction === 'asc'
                      ? <ArrowUp className="w-3 h-3 shrink-0 text-primary" />
                      : <ArrowDown className="w-3 h-3 shrink-0 text-primary" />
                  ) : (
                    <ArrowUp className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-30" />
                  )}
                  {/* Column menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded hover:bg-muted-foreground/20 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-44">
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => handleSort(col.name)}>
                        <ArrowUp className="w-3 h-3" /> Sort Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => { dispatch({ type: 'SET_SORT', config: { column: col.name, direction: 'desc' } }); }}>
                        <ArrowDown className="w-3 h-3" /> Sort Descending
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => handleFilterColumn(col.name, 'is_empty')}>
                        <Filter className="w-3 h-3" /> Filter: Empty only
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => handleFilterColumn(col.name, 'is_not_empty')}>
                        <Filter className="w-3 h-3" /> Filter: Non-empty only
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs" onClick={() => handleRenameColumn(col.name)}>
                        Rename Column
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-destructive" onClick={() => handleDeleteColumn(col.name)}>
                        Delete Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          {/* Virtual rows */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${topPad}px)` }}>
              {visibleRows.map((row, vi) => {
                const rowIndex = startIndex + vi;
                const isDuplicate = duplicateRows.has(rowIndex);

                return (
                  <div key={rowIndex} className={cn('flex', isDuplicate && 'bg-error-highlight-bg/20')}>
                    {/* Row number */}
                    <div
                      className="adcp-row-number sticky left-0 z-10"
                      style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, height: ROW_HEIGHT }}
                    >
                      {rowIndex + 1}
                    </div>

                    {/* Data cells */}
                    {columns.map((col) => {
                      const value = (row as RowData)[col.name];
                      const displayVal = value === null || value === undefined ? '' : String(value);
                      const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnName === col.name;
                      const width = getColWidth(col.name);

                      return (
                        <div
                          key={col.name}
                          className={getCellClassName(rowIndex, col.name, isDuplicate, value ?? null)}
                          style={{ width, minWidth: COL_MIN_WIDTH, height: ROW_HEIGHT }}
                          onClick={() => handleCellClick(rowIndex, col.name)}
                          onDoubleClick={() => handleCellDoubleClick(rowIndex, col.name, displayVal)}
                          title={displayVal || undefined}
                        >
                          {isEditing ? (
                            <input
                              ref={editInputRef}
                              className="w-full h-full px-0 bg-card text-foreground text-xs font-data outline-none border-none"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={handleKeyDown}
                              onBlur={commitEdit}
                            />
                          ) : (
                            <span className={cn(
                              'block truncate text-xs font-data',
                              (!displayVal) ? 'text-muted-foreground/50 italic' : ''
                            )}>
                              {displayVal || '(null)'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {filteredRows.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              {searchQuery ? `No rows match "${searchQuery}"` : 'No data to display'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
