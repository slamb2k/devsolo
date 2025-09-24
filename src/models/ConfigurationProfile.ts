export interface ConfigurationProfile {
  version: string;
  createdAt: string;
  updatedAt: string;
  installationType: 'global' | 'local' | 'npx';

  workflow: WorkflowSettings;
  integrations: IntegrationSettings;
  ui: UISettings;
  metadata: ConfigMetadata;
}

export interface WorkflowSettings {
  autoRebase: boolean;
  squashMerge: boolean;
  deleteAfterMerge: boolean;
  requireApproval: boolean;
  protectedBranches: string[];
  branchNamingPattern: string;
}

export interface IntegrationSettings {
  github: {
    enabled: boolean;
    autoCreatePR: boolean;
    assignReviewers: boolean;
    addLabels: boolean;
  };
  gitlab: {
    enabled: boolean;
    autoCreateMR: boolean;
    assignReviewers: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    notifyOnPR: boolean;
    notifyOnMerge: boolean;
  };
}

export interface UISettings {
  colors: boolean;
  emoji: boolean;
  timestamps: boolean;
  verbose: boolean;
  progressBars: boolean;
  notifications: boolean;
}

export interface ConfigMetadata {
  lastModified: string;
  modifiedBy: string;
  installerVersion: string;
  migratedFrom?: string;
}