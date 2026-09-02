import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Database, ArrowRight, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { parseFile } from '@/lib/fileParser';
import type { ColumnSchema, ColumnType, FileFormat, RowData, UploadedFileInfo } from '@/types';
import { toast } from 'sonner';

interface UploadPageProps {
  onDatasetReady: (info: UploadedFileInfo) => void;
}

const FORMAT_ICONS: Record<FileFormat, string> = {
  csv: 'CSV',
  xlsx: 'XLSX',
  json: 'JSON',
  txt: 'TXT',
};

const TYPE_COLORS: Record<ColumnType, string> = {
  string: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  number: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  date: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  boolean: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  mixed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  empty: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function UploadPage({ onDatasetReady }: UploadPageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedInfo, setParsedInfo] = useState<UploadedFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setParsedInfo(null);
    setIsProcessing(true);
    setProgress(20);

    try {
      setProgress(50);
      const info = await parseFile(file);
      setProgress(90);
      setParsedInfo(info);
      setProgress(100);
      toast.success(`Dataset loaded: ${info.rowCount.toLocaleString()} rows, ${info.columnCount} columns`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to parse file';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleReset = () => {
    setParsedInfo(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-8 md:py-12">
      <div className="w-full max-w-4xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Ganga Cognitive Intelligence</h1>
          </div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Upload Your Dataset
          </h2>
          <p className="text-sm text-muted-foreground text-pretty max-w-lg mx-auto">
            Drop your data file below. Ganga will automatically detect the schema, validate structure, and scan for quality issues.
          </p>
        </div>

        {/* Upload zone */}
        {!parsedInfo && (
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-100',
              isDragging
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary/60 hover:bg-accent/50 bg-card'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".csv,.xlsx,.xls,.json,.txt"
              onChange={onFileSelect}
            />
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-100',
                isDragging ? 'bg-primary/20' : 'bg-muted'
              )}>
                <Upload className={cn('w-7 h-7 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {isDragging ? 'Drop to upload' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {(['CSV', 'XLSX', 'JSON', 'TXT'] as const).map((fmt) => (
                  <span key={fmt} className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground border border-border">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">Parsing dataset...</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">Detecting schema and analyzing data structure</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Upload Failed</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive hover:text-destructive" onClick={() => setError(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Preview */}
        {parsedInfo && !isProcessing && (
          <DatasetPreview info={parsedInfo} onReset={handleReset} onConfirm={() => onDatasetReady(parsedInfo)} />
        )}
      </div>
    </div>
  );
}

// ─── Dataset Preview ─────────────────────────────────────────────────
function DatasetPreview({
  info,
  onReset,
  onConfirm,
}: {
  info: UploadedFileInfo;
  onReset: () => void;
  onConfirm: () => void;
}) {
  const [tab, setTab] = useState<'schema' | 'preview'>('schema');

  const emptyColumns = info.columns.filter((c) => c.type === 'empty').length;
  const nullyColumns = info.columns.filter((c) => c.nullCount > 0).length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* File info header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{info.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(info.file.size / 1024).toFixed(1)} KB · {FORMAT_ICONS[info.format]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{info.rowCount.toLocaleString()}</span> rows</span>
            <span><span className="font-semibold text-foreground">{info.columnCount}</span> columns</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success">Valid</span>
          </div>
        </div>
      </div>

      {/* Quality info */}
      {(emptyColumns > 0 || nullyColumns > 0) && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-warning/10 border-b border-warning/20">
          <Info className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">
            {emptyColumns > 0 && <span>{emptyColumns} empty column(s) detected. </span>}
            {nullyColumns > 0 && <span>{nullyColumns} column(s) contain missing values.</span>}
            {' '}Ganga will scan and flag all issues automatically.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['schema', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-xs font-medium capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'schema' ? 'Column Schema' : 'Data Preview'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="overflow-auto max-h-64">
        {tab === 'schema' && <SchemaTable columns={info.columns} />}
        {tab === 'preview' && <PreviewTable rows={info.previewRows} columns={info.columns} />}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <Button variant="outline" size="sm" onClick={onReset}>
          <X className="w-3.5 h-3.5 mr-1.5" />
          Change File
        </Button>
        <Button size="sm" onClick={onConfirm}>
          Open in Workspace
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function SchemaTable({ columns }: { columns: ColumnSchema[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted/50 text-left sticky top-0">
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">#</th>
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Column Name</th>
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Type</th>
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Null Count</th>
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Unique</th>
          <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Sample Values</th>
        </tr>
      </thead>
      <tbody>
        {columns.map((col, i) => (
          <tr key={col.name} className="border-t border-border hover:bg-accent/30 transition-colors">
            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
            <td className="px-3 py-2 font-data font-medium text-foreground whitespace-nowrap">{col.originalName}</td>
            <td className="px-3 py-2">
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', TYPE_COLORS[col.type])}>
                {col.type}
              </span>
            </td>
            <td className="px-3 py-2 text-center">
              {col.nullCount > 0 ? (
                <span className="text-warning font-medium">{col.nullCount}</span>
              ) : (
                <span className="text-success">0</span>
              )}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{col.uniqueCount}</td>
            <td className="px-3 py-2 text-muted-foreground font-data truncate max-w-xs">
              {col.sampleValues.slice(0, 3).map((v, vi) => (
                <span key={vi} className="inline-block bg-muted rounded px-1 mr-1 mb-0.5 truncate max-w-[100px]">{v || '(empty)'}</span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PreviewTable({ rows, columns }: { rows: RowData[]; columns: ColumnSchema[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-muted/50 sticky top-0">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground border-r border-border">#</th>
            {columns.map((col) => (
              <th key={col.name} className="px-3 py-2 text-left font-medium text-muted-foreground border-r border-border">
                {col.originalName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border hover:bg-accent/30">
              <td className="px-3 py-1.5 text-muted-foreground border-r border-border">{ri + 1}</td>
              {columns.map((col) => {
                const val = row[col.originalName] ?? row[col.name];
                const isEmpty = val === null || val === undefined || String(val).trim() === '';
                return (
                  <td key={col.name} className={cn(
                    'px-3 py-1.5 border-r border-border font-data',
                    isEmpty ? 'text-muted-foreground italic' : 'text-foreground'
                  )}>
                    {isEmpty ? '(null)' : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// silence unused import warning
void Badge;
