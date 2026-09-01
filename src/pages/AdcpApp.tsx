import { useState } from 'react';
import { toast } from 'sonner';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import UploadPage from '@/components/upload/UploadPage';
import WorkspacePage, { useLoadDataset } from '@/components/workspace/WorkspacePage';
import type { UploadedFileInfo } from '@/types';

interface AdcpAppProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

function Inner({ darkMode, onToggleDark }: AdcpAppProps) {
  const [view, setView] = useState<'upload' | 'workspace'>('upload');
  const loadDataset = useLoadDataset();

  const handleDatasetReady = (info: UploadedFileInfo) => {
    try {
      loadDataset(info);
    } catch (e) {
      console.error('[ADCP] Failed to load dataset:', e);
      toast.error('Failed to open workspace. Please try uploading again.');
      return;
    }
    setView('workspace');
  };

  if (view === 'workspace') {
    return (
      <WorkspacePage
        darkMode={darkMode}
        onToggleDark={onToggleDark}
        onBackToUpload={() => setView('upload')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <UploadPage onDatasetReady={handleDatasetReady} />
    </div>
  );
}

export default function AdcpApp({ darkMode, onToggleDark }: AdcpAppProps) {
  return (
    <WorkspaceProvider>
      <Inner darkMode={darkMode} onToggleDark={onToggleDark} />
    </WorkspaceProvider>
  );
}
