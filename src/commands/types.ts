export interface CommandHandler {
  name: string;
  description: string;
  execute(args: string[]): Promise<void>;
  validate(args: string[]): boolean;
}

export interface CommandContext {
  sessionId?: string;
  branchName?: string;
  workflowType?: 'launch' | 'ship' | 'hotfix';
  currentState?: string;
}

export interface CommandOptions {
  verbose?: boolean;
  force?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
}