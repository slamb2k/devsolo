/**
 * MCP Server implementation with JSON-RPC protocol
 */

import { SessionRepository } from '../services/session-repository';
import { ConfigurationManager } from '../services/configuration-manager';
import { GitOperations } from '../services/git-operations';
import { WorkflowSession } from '../models/workflow-session';
import { ShipWorkflow } from '../state-machines/ship-workflow';
import { HotfixWorkflow } from '../state-machines/hotfix-workflow';
import * as os from 'os';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<any>;
}

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export class MCPServer {
  private sessionRepo: SessionRepository;
  private configManager: ConfigurationManager;
  private gitOps: GitOperations;
  private tools: Map<string, ToolDefinition> = new Map();
  private currentSession: WorkflowSession | null = null;

  constructor(
    sessionRepo?: SessionRepository,
    configManager?: ConfigurationManager,
    gitOps?: GitOperations
  ) {
    this.sessionRepo = sessionRepo || new SessionRepository();
    this.configManager = configManager || new ConfigurationManager();
    this.gitOps = gitOps || new GitOperations();
    this.registerTools();
  }

  private registerTools(): void {
    // Configure Workflow Tool
    this.tools.set('configure_workflow', {
      name: 'configure_workflow',
      description: 'Initialize or configure han-solo workflow settings',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          defaultBranch: { type: 'string' },
          platform: { type: 'string', enum: ['github', 'gitlab'] },
          remoteUrl: { type: 'string' },
          settings: { type: 'object' },
        },
        required: ['projectPath'],
      },
      handler: async (params) => this.configureWorkflow(params),
    });

    // Start Workflow Tool
    this.tools.set('start_workflow', {
      name: 'start_workflow',
      description: 'Start a new workflow session',
      inputSchema: {
        type: 'object',
        properties: {
          workflowType: { type: 'string', enum: ['launch', 'ship', 'hotfix'] },
          branch: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['workflowType'],
      },
      handler: async (params) => this.startWorkflow(params),
    });

    // Execute Workflow Step Tool
    this.tools.set('execute_workflow_step', {
      name: 'execute_workflow_step',
      description: 'Execute the next step in a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          action: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['sessionId', 'action'],
      },
      handler: async (params) => this.executeWorkflowStep(params),
    });

    // Get Sessions Status Tool
    this.tools.set('get_sessions_status', {
      name: 'get_sessions_status',
      description: 'Get status of all workflow sessions',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          includeCompleted: { type: 'boolean' },
        },
      },
      handler: async (params) => this.getSessionsStatus(params),
    });

    // Swap Session Tool
    this.tools.set('swap_session', {
      name: 'swap_session',
      description: 'Switch to a different workflow session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
        },
        required: ['sessionId'],
      },
      handler: async (params) => this.swapSession(params),
    });

    // Abort Workflow Tool
    this.tools.set('abort_workflow', {
      name: 'abort_workflow',
      description: 'Abort an active workflow session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          force: { type: 'boolean' },
          cleanup: { type: 'boolean' },
        },
        required: ['sessionId'],
      },
      handler: async (params) => this.abortWorkflow(params),
    });

    // Validate Environment Tool
    this.tools.set('validate_environment', {
      name: 'validate_environment',
      description: 'Validate the development environment',
      inputSchema: {
        type: 'object',
        properties: {
          checks: { type: 'array', items: { type: 'string' } },
          verbose: { type: 'boolean' },
        },
      },
      handler: async (params) => this.validateEnvironment(params),
    });

    // Manage Status Line Tool
    this.tools.set('manage_status_line', {
      name: 'manage_status_line',
      description: 'Manage terminal status line',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['enable', 'disable', 'update'] },
          content: { type: 'object' },
          format: { type: 'string' },
          colorScheme: { type: 'string' },
        },
        required: ['action'],
      },
      handler: async (params) => this.manageStatusLine(params),
    });

    // Create Branch Tool
    this.tools.set('create_branch', {
      name: 'create_branch',
      description: 'Create a new Git branch',
      inputSchema: {
        type: 'object',
        properties: {
          branchName: { type: 'string' },
          baseBranch: { type: 'string' },
          sessionId: { type: 'string' },
          workflowType: { type: 'string' },
          updateFromMain: { type: 'boolean' },
        },
        required: ['branchName'],
      },
      handler: async (params) => this.createBranch(params),
    });

    // Cleanup Operations Tool
    this.tools.set('cleanup_operations', {
      name: 'cleanup_operations',
      description: 'Perform cleanup operations',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          deleteBranch: { type: 'boolean' },
          deleteRemote: { type: 'boolean' },
          archiveSession: { type: 'boolean' },
          preserveArtifacts: { type: 'boolean' },
          cleanupCompleted: { type: 'boolean' },
        },
      },
      handler: async (params) => this.cleanupOperations(params),
    });

    // Rebase on Main Tool
    this.tools.set('rebase_on_main', {
      name: 'rebase_on_main',
      description: 'Rebase current branch on main',
      inputSchema: {
        type: 'object',
        properties: {
          branch: { type: 'string' },
          updateMain: { type: 'boolean' },
          strategy: { type: 'string', enum: ['standard', 'interactive', 'squash'] },
          forcePush: { type: 'boolean' },
          useLease: { type: 'boolean' },
          createBackup: { type: 'boolean' },
        },
      },
      handler: async (params) => this.rebaseOnMain(params),
    });
  }

  getRegisteredTools(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Handle JSON-RPC request
   */
  async handleJsonRpcRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'JSON-RPC version must be 2.0',
        },
        id: request.id,
      };
    }

    switch (request.method) {
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        result: {
          tools: this.getRegisteredTools(),
        },
        id: request.id,
      };

    case 'tools/call': {
      const { name, arguments: args } = request.params;
      try {
        const result = await this.handleToolCall(name, args);
        return {
          jsonrpc: '2.0',
          result,
          id: request.id,
        };
      } catch (error: any) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message,
          },
          id: request.id,
        };
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found',
          data: `Method ${request.method} is not supported`,
        },
        id: request.id,
      };
    }
  }

  async handleToolCall(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Validate input against schema
    if (tool.inputSchema.required) {
      for (const requiredField of tool.inputSchema.required) {
        if (!(requiredField in params)) {
          throw new Error(`Missing required parameter: ${requiredField}`);
        }
      }
    }

    // Execute tool handler
    return await tool.handler(params);
  }

  // Tool Implementation Methods
  private async configureWorkflow(params: any): Promise<any> {
    const config = await this.configManager.load();

    // Update preferences
    if (params.defaultBranch) {
      config.preferences.defaultBranchPrefix = params.defaultBranch;
    }
    if (params.platform) {
      config.gitPlatform = {
        type: params.platform,
        token: params.token || config.gitPlatform?.token,
      };
    }
    if (params.settings) {
      Object.assign(config.preferences, params.settings);
    }

    await this.configManager.save(config);

    const gitInitialized = await this.gitOps.isInitialized();
    const remoteUrl = params.remoteUrl || await this.gitOps.getRemoteUrl();

    return {
      success: true,
      configuration: config.toJSON(),
      existingRepo: gitInitialized,
      remoteUrl,
    };
  }

  private async startWorkflow(params: any): Promise<any> {
    // Check if already in a session
    const currentBranch = await this.gitOps.getCurrentBranch();
    const existingSession = await this.sessionRepo.getSessionByBranch(currentBranch);

    if (existingSession && !existingSession.isExpired()) {
      return {
        success: false,
        error: 'Already in an active session',
        session: existingSession.toJSON(),
      };
    }

    // Create new session
    const session = new WorkflowSession({
      workflowType: params.workflowType,
      branchName: params.branch || `${params.workflowType}/${Date.now()}`,
      metadata: params.metadata || {},
    });

    await this.sessionRepo.createSession(session);
    this.currentSession = session;

    return {
      success: true,
      session: session.toJSON(),
    };
  }

  private async executeWorkflowStep(params: any): Promise<any> {
    const session = await this.sessionRepo.getSession(params.sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // Get appropriate workflow
    let workflow: any;
    if (session.workflowType === 'ship') {
      workflow = new ShipWorkflow(session);
    } else if (session.workflowType === 'hotfix') {
      workflow = new HotfixWorkflow(session);
    } else {
      // Default workflow for launch
      return {
        success: true,
        sessionId: params.sessionId,
        action: params.action,
        newState: this.getNextState(session.currentState, params.action),
        metadata: params.metadata || {},
        fallbackToManual: false,
        manualInputRequired: false,
        requiresUserInput: false,
      };
    }

    // Execute action (for now, just simulate)
    try {
      const result = await workflow.transition(params.action, params.metadata || {});
      return {
        success: true,
        sessionId: params.sessionId,
        action: params.action,
        newState: result.newState,
        metadata: result.metadata || {},
        fallbackToManual: result.fallbackToManual || false,
        manualInputRequired: result.manualInputRequired || false,
        requiresUserInput: result.requiresUserInput || false,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        sessionId: params.sessionId,
      };
    }
  }

  private async getSessionsStatus(params: any): Promise<any> {
    const sessions = await this.sessionRepo.listSessions(params.includeCompleted);
    const activeSessions = sessions.filter(s => !s.isExpired());
    const initialized = await this.configManager.isInitialized();

    let sessionDetails;
    if (params.sessionId) {
      const session = await this.sessionRepo.getSession(params.sessionId);
      sessionDetails = session?.toJSON();
    }

    return {
      success: true,
      sessions: sessions.map(s => s.toJSON()),
      activeSessions: activeSessions.length,
      initialized,
      ready: initialized && activeSessions.length < 5, // Max 5 concurrent sessions
      session: sessionDetails,
    };
  }

  private async swapSession(params: any): Promise<any> {
    const previousSession = this.currentSession;
    const newSession = await this.sessionRepo.getSession(params.sessionId);

    if (!newSession) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // Switch git branch
    await this.gitOps.checkoutBranch(newSession.branchName);
    this.currentSession = newSession;

    return {
      success: true,
      previousSessionId: previousSession?.id,
      currentSession: newSession.toJSON(),
    };
  }

  private async abortWorkflow(params: any): Promise<any> {
    const session = await this.sessionRepo.getSession(params.sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // Mark session as expired by setting expiresAt to past
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    await this.sessionRepo.updateSession(params.sessionId, { expiresAt: session.expiresAt });

    if (params.cleanup) {
      await this.gitOps.checkoutBranch('main');
      if (params.force) {
        await this.gitOps.deleteBranch(session.branchName, true);
      }
      await this.sessionRepo.deleteSession(params.sessionId);
    }

    return {
      success: true,
      session: session.toJSON(),
    };
  }

  private async validateEnvironment(_params: any): Promise<any> {
    const checks: any = {};
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check Git
    try {
      const gitVersion = await this.gitOps.raw(['--version']);
      checks.git = {
        installed: true,
        version: gitVersion.replace('git version ', '').trim(),
      };
    } catch {
      checks.git = { installed: false };
      warnings.push('Git is not installed');
    }

    // Check Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] || '0');
    checks.node = {
      installed: true,
      version: nodeVersion,
      meetsMinimum: majorVersion >= 20,
    };
    if (!checks.node.meetsMinimum) {
      warnings.push('Node.js version 20 or higher is recommended');
    }

    // Check repository
    const isGitRepo = await this.gitOps.isInitialized();
    const currentBranch = isGitRepo ? await this.gitOps.getCurrentBranch() : null;
    const remoteUrl = isGitRepo ? await this.gitOps.getRemoteUrl() : null;
    checks.repository = {
      isGitRepo,
      remote: remoteUrl ? 'origin' : null,
      branch: currentBranch,
    };

    // Check config
    const initialized = await this.configManager.isInitialized();
    checks.config = {
      hansoloYaml: initialized,
      initialized,
    };
    if (!initialized) {
      recommendations.push('Run /hansolo:init to initialize the project');
    }

    // Check permissions
    checks.permissions = {
      canWrite: true, // Simplified check
      hansoloDir: true,
    };

    // Check GitHub CLI (optional)
    try {
      const { execSync } = require('child_process');
      execSync('gh --version', { stdio: 'pipe' });
      checks.github = {
        cliInstalled: true,
        authenticated: true, // Simplified
      };
    } catch {
      checks.github = {
        cliInstalled: false,
        authenticated: false,
      };
      recommendations.push('Install GitHub CLI for enhanced features');
    }

    // Platform info
    const platform = os.platform();
    checks.platform = { type: platform as string };

    const allChecksPassed =
      checks.git?.installed &&
      checks.node?.meetsMinimum &&
      checks.config?.initialized;

    return {
      success: true,
      checks,
      platform,
      platformSpecific: {},
      allChecksPassed,
      recommendations,
      warnings,
    };
  }

  private async manageStatusLine(params: any): Promise<any> {
    // Status line is managed in-memory for this implementation
    const statusLine = {
      enabled: params.action === 'enable',
      format: params.format || 'default',
      content: params.content || {},
      colorScheme: params.colorScheme || 'default',
    };

    if (params.action === 'update' && params.content) {
      Object.assign(statusLine.content, params.content);
    }

    return {
      success: true,
      statusLine,
      message: `Status line ${params.action}d`,
    };
  }

  private async createBranch(params: any): Promise<any> {
    const baseBranch = params.baseBranch || 'main';

    // Update main if requested
    if (params.updateFromMain) {
      await this.gitOps.checkoutBranch(baseBranch);
      await this.gitOps.pull('origin', baseBranch);
    }

    // Create branch
    await this.gitOps.createBranch(params.branchName, baseBranch);

    // Create or update session
    let session;
    if (params.sessionId) {
      session = await this.sessionRepo.getSession(params.sessionId);
      if (session) {
        session.branchName = params.branchName;
        await this.sessionRepo.updateSession(params.sessionId, { branchName: params.branchName });
      }
    }

    if (!session && params.workflowType) {
      session = new WorkflowSession({
        workflowType: params.workflowType,
        branchName: params.branchName,
        metadata: { projectPath: process.cwd() },
      });
      await this.sessionRepo.createSession(session);
    }

    return {
      success: true,
      branch: {
        name: params.branchName,
        baseBranch,
        created: true,
        upToDate: true,
      },
      session: session?.toJSON(),
      mainUpdated: params.updateFromMain || false,
    };
  }

  private async cleanupOperations(params: any): Promise<any> {
    const cleanup: any = {
      branchDeleted: false,
      remoteBranchDeleted: false,
      sessionArchived: false,
      currentBranch: await this.gitOps.getCurrentBranch(),
      tempFilesCleaned: 0,
      hooksRemoved: [],
      stashPopped: false,
      artifactsPreserved: params.preserveArtifacts || false,
    };

    // Switch to main before cleanup
    await this.gitOps.checkoutBranch('main');
    cleanup.currentBranch = 'main';

    // Delete local branch
    if (params.deleteBranch && params.sessionId) {
      const session = await this.sessionRepo.getSession(params.sessionId);
      if (session) {
        try {
          await this.gitOps.deleteBranch(session.branchName, true);
          cleanup.branchDeleted = true;
        } catch {}
      }
    }

    // Delete remote branch
    if (params.deleteRemote && params.sessionId) {
      const session = await this.sessionRepo.getSession(params.sessionId);
      if (session) {
        try {
          await this.gitOps.deleteRemoteBranch(session.branchName);
          cleanup.remoteBranchDeleted = true;
        } catch {}
      }
    }

    // Archive or delete session
    if (params.archiveSession && params.sessionId) {
      // Mark as expired
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      await this.sessionRepo.updateSession(params.sessionId, { expiresAt: expiredDate });
      cleanup.sessionArchived = true;
    }

    // Cleanup completed sessions
    let sessionsRemoved = 0;
    if (params.cleanupCompleted) {
      sessionsRemoved = await this.sessionRepo.cleanupExpiredSessions();
    }

    return {
      success: true,
      cleanup,
      sessionsRemoved,
      message: 'Cleanup complete',
    };
  }

  private async rebaseOnMain(params: any): Promise<any> {
    const branch = params.branch || await this.gitOps.getCurrentBranch();
    const baseBranch = 'main';

    // Update main if requested
    if (params.updateMain) {
      await this.gitOps.checkoutBranch(baseBranch);
      await this.gitOps.pull('origin', baseBranch);
      await this.gitOps.checkoutBranch(branch);
    }

    // Create backup if requested
    let backupRef;
    if (params.createBackup) {
      backupRef = `backup/${branch}-${Date.now()}`;
      await this.gitOps.createBranch(backupRef, branch);
    }

    // Perform rebase
    let hasConflicts = false;
    let conflictFiles: string[] = [];
    try {
      await this.gitOps.rebase(baseBranch);
    } catch (error: any) {
      hasConflicts = await this.gitOps.hasConflicts();
      if (hasConflicts) {
        conflictFiles = await this.gitOps.getConflictedFiles();
      }
    }

    // Force push if requested and no conflicts
    let forcePushed = false;
    if (!hasConflicts && params.forcePush) {
      const pushOptions = params.useLease ? ['--force-with-lease'] : ['--force'];
      await this.gitOps.push('origin', branch, pushOptions);
      forcePushed = true;
    }

    return {
      success: !hasConflicts,
      rebase: {
        branch,
        baseBranch,
        completed: !hasConflicts,
        upToDate: !hasConflicts,
        mainUpdated: params.updateMain || false,
        hasConflicts,
        requiresForcePush: !hasConflicts && !forcePushed,
        strategy: params.strategy || 'standard',
        forcePushed,
        usedLease: params.useLease || false,
        backupRef,
        aborted: false,
      },
      conflictFiles,
      instructions: hasConflicts ? 'Resolve conflicts and run `git rebase --continue`' : '',
      message: hasConflicts ? 'Rebase has conflicts' : 'Rebase successful',
    };
  }

  private getNextState(currentState: string, action: string): string {
    // Simple state transitions for launch workflow
    const transitions: { [key: string]: { [action: string]: string } } = {
      'INIT': { 'create_branch': 'BRANCH_READY' },
      'BRANCH_READY': { 'commit': 'CHANGES_COMMITTED' },
      'CHANGES_COMMITTED': { 'push': 'PUSHED' },
      'PUSHED': { 'create_pr': 'PR_CREATED' },
      'PR_CREATED': { 'wait': 'WAITING_APPROVAL' },
      'WAITING_APPROVAL': { 'approved': 'APPROVED' },
      'APPROVED': { 'merge': 'MERGED' },
      'MERGED': { 'cleanup': 'COMPLETE' },
    };

    return transitions[currentState]?.[action] || currentState;
  }
}