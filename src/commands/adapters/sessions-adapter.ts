import { SessionsCommandV2 } from '../hansolo-sessions-v2';
import { WorkflowSession } from '../../models/workflow-session';

/**
 * Adapter that wraps SessionsCommandV2 to provide v1 API compatibility
 */
export class SessionsCommand {
  private v2Command: SessionsCommandV2;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new SessionsCommandV2(basePath);
  }

  /**
   * Main execute method - passes through to v2
   */
  async execute(options: {
    all?: boolean;
    verbose?: boolean;
    cleanup?: boolean;
  } = {}): Promise<void> {
    return this.v2Command.execute(options);
  }

  /**
   * Helper methods for compatibility
   */
  async getActiveCount(): Promise<number> {
    if ('getActiveCount' in this.v2Command) {
      return (this.v2Command as any).getActiveCount();
    }
    return 0;
  }

  async getCurrentSession(): Promise<WorkflowSession | null> {
    if ('getCurrentSession' in this.v2Command) {
      return (this.v2Command as any).getCurrentSession();
    }
    return null;
  }

  async listBranchesWithSessions(): Promise<string[]> {
    if ('listBranchesWithSessions' in this.v2Command) {
      return (this.v2Command as any).listBranchesWithSessions();
    }
    return [];
  }
}
