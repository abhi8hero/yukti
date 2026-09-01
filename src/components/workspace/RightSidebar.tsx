import { Bot, Sparkles, Zap, Brain, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const PLANNED_FEATURES = [
  { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Natural Language Queries', desc: 'Ask questions about your data in plain English' },
  { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'AI Cleaning Suggestions', desc: 'Intelligent recommendations for data issues' },
  { icon: <Brain className="w-3.5 h-3.5" />, label: 'Anomaly Detection', desc: 'Auto-detect outliers and inconsistencies' },
  { icon: <Zap className="w-3.5 h-3.5" />, label: 'n8n Workflow Automation', desc: 'Trigger automated multi-step data pipelines' },
];

const EXAMPLE_COMMANDS = [
  '"Remove rows with invalid emails"',
  '"Standardize phone numbers"',
  '"Find duplicate customers"',
  '"Generate dataset insights"',
];

export default function RightSidebar() {
  const { state, dispatch } = useWorkspace();

  if (!state.rightSidebarOpen) {
    return (
      <div className="flex flex-col items-center py-3 w-10 shrink-0 border-l border-border bg-card h-full">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
          title="Open AI panel"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="mt-3 flex flex-col items-center gap-1">
          <Bot className="w-4 h-4 text-muted-foreground/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-56 shrink-0 border-l border-border bg-card h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Assistant</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">Soon</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Coming soon placeholder */}
      <div className="flex flex-col items-center justify-center px-4 py-6 text-center space-y-3 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">AI Agent Coming Soon</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed text-pretty">
            Powered by n8n workflows and LLM intelligence. Your data, automated.
          </p>
        </div>
      </div>

      {/* Planned features */}
      <div className="px-3 py-3 border-b border-border space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Planned Features</p>
        {PLANNED_FEATURES.map((feat, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 opacity-60">
            <span className="text-primary mt-0.5 shrink-0">{feat.icon}</span>
            <div>
              <p className="text-xs font-medium text-foreground">{feat.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Example commands */}
      <div className="px-3 py-3 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Example Commands</p>
        {EXAMPLE_COMMANDS.map((cmd, i) => (
          <div key={i} className="px-2 py-1.5 rounded bg-muted/60 text-[11px] text-muted-foreground font-data opacity-70">
            {cmd}
          </div>
        ))}
      </div>

      {/* n8n branding */}
      <div className="mt-auto px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
          <Zap className="w-3 h-3 text-orange-500 shrink-0" />
          <div>
            <p className="text-[10px] font-medium text-foreground">Powered by n8n</p>
            <p className="text-[9px] text-muted-foreground">Workflow automation engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
