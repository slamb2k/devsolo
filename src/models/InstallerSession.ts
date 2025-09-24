import { InstallationContext } from './InstallationContext';

export interface InstallerSession {
  id: string;
  startedAt: string;
  status: 'in_progress' | 'complete' | 'aborted';
  currentStep: number;
  completedSteps: string[];
  context: InstallationContext;
  data: any;
  error?: string;
}