import { Clock, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

const MODE_BADGE_STYLES: Record<string, string> = {
  manual: 'bg-muted text-muted-foreground',
  basic: 'bg-info/10 text-info border-info/30',
  smart: 'bg-primary/10 text-primary border-primary/30',
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300/30',
};

export default function LogPanel() {
  const { state, dispatch } = useWorkspace();
  const { logs, logPanelOpen } = state;

  if (!logPanelOpen) return null;

  return (
    <div className="shrink-0 border-t border-border bg-card h-52 flex flex-col">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Transformation Log</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{logs.length}</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({ type: 'TOGGLE_LOG_PANEL' })}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No operations performed yet
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Time</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Mode</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Operation</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Rows</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-accent/20">
                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap font-data">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', MODE_BADGE_STYLES[log.operation_mode])}>
                      {log.operation_mode}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{log.operation_type}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {log.affected_columns.length > 0 && (
                        <>
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span className="font-data text-muted-foreground/70 text-[10px]">
                            {log.affected_columns.slice(0, 3).join(', ')}{log.affected_columns.length > 3 ? ` +${log.affected_columns.length - 3}` : ''}
                          </span>
                        </>
                      )}
                      <span>{log.description}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground font-data">{log.affected_rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
