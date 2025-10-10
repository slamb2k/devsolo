import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getBanner } from '../ui/banners';

// Import MCP tools (no CLI/UI dependencies!)
import {
  InitTool,
  LaunchTool,
  ShipTool,
  CommitTool,
  StatusTool,
  SessionsTool,
  AbortTool,
  SwapTool,
  CleanupTool,
  HotfixTool,
  StatusLineTool,
} from './tools';

// Import services
import { GitOperations } from '../services/git-operations';
import { SessionRepository } from '../services/session-repository';
import { ConfigurationManager } from '../services/configuration-manager';
import { BranchNamingService } from '../services/branch-naming';
import { BranchValidator } from '../services/validation/branch-validator';
import { GitHubIntegration } from '../services/github-integration';
import { StashManager } from '../services/stash-manager';

// Tool parameter schemas
const InitSchema = z.object({
  scope: z.enum(['project', 'user']).optional(),
  auto: z.boolean().optional(),
});

const LaunchSchema = z.object({
  description: z.string().optional(),
  branchName: z.string().optional(),
  auto: z.boolean().optional(),
  stashRef: z.string().optional(),
  popStash: z.boolean().optional(),
});

const SessionsSchema = z.object({
  all: z.boolean().optional(),
  verbose: z.boolean().optional(),
  cleanup: z.boolean().optional(),
  auto: z.boolean().optional(),
});

const SwapSchema = z.object({
  branchName: z.string(),
  auto: z.boolean().optional(),
  stash: z.boolean().optional(),
});

const AbortSchema = z.object({
  branchName: z.string().optional(),
  auto: z.boolean().optional(),
  deleteBranch: z.boolean().optional(),
});

const CommitSchema = z.object({
  message: z.string().optional(),
  auto: z.boolean().optional(),
  stagedOnly: z.boolean().optional(),
});

const ShipSchema = z.object({
  prDescription: z.string().optional(),
  push: z.boolean().optional(),
  createPR: z.boolean().optional(),
  merge: z.boolean().optional(),
  auto: z.boolean().optional(),
  stagedOnly: z.boolean().optional(),
});

const HotfixSchema = z.object({
  issue: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium']).optional(),
  skipTests: z.boolean().optional(),
  skipReview: z.boolean().optional(),
  autoMerge: z.boolean().optional(),
  auto: z.boolean().optional(),
});

const StatusLineSchema = z.object({
  action: z.enum(['enable', 'disable', 'update', 'show']),
  format: z.string().optional(),
  showSessionInfo: z.boolean().optional(),
  showBranchInfo: z.boolean().optional(),
  showStateInfo: z.boolean().optional(),
  auto: z.boolean().optional(),
});

const CleanupSchema = z.object({
  deleteBranches: z.boolean().optional(),
  auto: z.boolean().optional(),
});

export class HanSoloMCPServer {
  private server: Server;

  // MCP Tools
  private initTool: InitTool;
  private launchTool: LaunchTool;
  private shipTool: ShipTool;
  private commitTool: CommitTool;
  private statusTool: StatusTool;
  private sessionsTool: SessionsTool;
  private abortTool: AbortTool;
  private swapTool: SwapTool;
  private cleanupTool: CleanupTool;
  private hotfixTool: HotfixTool;
  private statusLineTool: StatusLineTool;

  // ANSI color codes for banner display
  private static readonly RESET = '\x1b[0m';
  private static readonly COLOR_PALETTE = [
    '\x1b[33m',  // Yellow
    '\x1b[36m',  // Cyan
    '\x1b[35m',  // Magenta
    '\x1b[32m',  // Green
    '\x1b[91m',  // Bright Red
    '\x1b[92m',  // Bright Green
    '\x1b[93m',  // Bright Yellow
    '\x1b[94m',  // Bright Blue
    '\x1b[95m',  // Bright Magenta
    '\x1b[96m',  // Bright Cyan
  ];

  constructor(basePath: string = '.hansolo') {
    this.server = new Server(
      {
        name: 'hansolo-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    // Initialize services
    const gitOps = new GitOperations();
    const sessionRepo = new SessionRepository(basePath);
    const configManager = new ConfigurationManager(basePath);
    const branchNaming = new BranchNamingService();
    const branchValidator = new BranchValidator(basePath);
    const githubIntegration = new GitHubIntegration(basePath);
    const stashManager = new StashManager(basePath);

    // Initialize MCP tools with dependencies
    this.initTool = new InitTool(configManager, gitOps, this.server);
    this.launchTool = new LaunchTool(
      gitOps,
      sessionRepo,
      branchNaming,
      branchValidator,
      githubIntegration,
      stashManager,
      configManager,
      basePath,
      this.server
    );
    this.shipTool = new ShipTool(
      gitOps,
      sessionRepo,
      githubIntegration,
      branchValidator,
      configManager,
      basePath,
      this.server
    );
    this.commitTool = new CommitTool(gitOps, sessionRepo, configManager, this.server);
    this.statusTool = new StatusTool(sessionRepo, gitOps, configManager, this.server);
    this.sessionsTool = new SessionsTool(sessionRepo, configManager, this.server);
    this.abortTool = new AbortTool(sessionRepo, gitOps, configManager, this.server);
    this.swapTool = new SwapTool(sessionRepo, gitOps, stashManager, configManager, this.server);
    this.cleanupTool = new CleanupTool(sessionRepo, gitOps, configManager, this.server);
    this.hotfixTool = new HotfixTool(gitOps, sessionRepo, configManager, githubIntegration, this.server);
    this.statusLineTool = new StatusLineTool(configManager, this.server);

    this.setupHandlers();
    this.setupPromptHandlers();
  }

  /**
   * Send banner notification immediately for a tool
   * @param toolName - Tool name (e.g., 'hansolo_launch')
   * @param progressToken - Optional progress token from request for progress notifications
   */
  private async sendBannerNotification(
    toolName: string,
    progressToken?: string | number
  ): Promise<void> {
    const banner = getBanner(toolName);
    if (!banner) {
      return;
    }

    // Wrap with random color
    const randomColor = HanSoloMCPServer.COLOR_PALETTE[
      Math.floor(Math.random() * HanSoloMCPServer.COLOR_PALETTE.length)
    ];
    const coloredBanner = `${randomColor}${banner}${HanSoloMCPServer.RESET}\n`;

    // If progress token available, use progress notification (may display more immediately)
    if (progressToken !== undefined) {
      try {
        await this.server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress: 0,
            total: 1,
            message: coloredBanner,
          },
        });
        return;
      } catch (err) {
        // Fall through to logging notification if progress fails
        console.error('Failed to send progress notification, falling back to logging:', err);
      }
    }

    // Fallback: Send logging notification (don't await - fire and forget for speed)
    this.server.sendLoggingMessage({
      level: 'info',
      logger: 'han-solo',
      data: coloredBanner,
    }).catch(err => {
      // Silently ignore notification errors - don't block tool execution
      console.error('Failed to send banner notification:', err);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'hansolo_init',
            description: '🚀 Initialize han-solo in your project',
            inputSchema: {
              type: 'object',
              properties: {
                scope: {
                  type: 'string',
                  enum: ['project', 'user'],
                  description: 'Installation scope (project or user)',
                },
                force: {
                  type: 'boolean',
                  description: 'Force reinitialization',
                },
              },
            },
          },
          {
            name: 'hansolo_launch',
            description: 'Start a new feature workflow',
            inputSchema: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Description of the feature',
                },
                branchName: {
                  type: 'string',
                  description: 'Name for the feature branch',
                },
                auto: {
                  type: 'boolean',
                  description: 'Automatically choose recommended options for prompts',
                },
                stashRef: {
                  type: 'string',
                  description: 'Git stash reference to restore after branch creation (e.g., stash@{0})',
                },
                popStash: {
                  type: 'boolean',
                  description: 'Whether to pop the stash (default: true if stashRef provided)',
                },
              },
            },
          },
          {
            name: 'hansolo_sessions',
            description: 'List workflow sessions',
            inputSchema: {
              type: 'object',
              properties: {
                all: {
                  type: 'boolean',
                  description: 'Show all sessions including completed',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Show detailed session information',
                },
                cleanup: {
                  type: 'boolean',
                  description: 'Clean up expired sessions',
                },
              },
            },
          },
          {
            name: 'hansolo_swap',
            description: 'Switch between workflow sessions',
            inputSchema: {
              type: 'object',
              properties: {
                branchName: {
                  type: 'string',
                  description: 'Branch to swap to',
                },
                force: {
                  type: 'boolean',
                  description: 'Force swap even with changes',
                },
                stash: {
                  type: 'boolean',
                  description: 'Stash changes before swapping',
                },
              },
              required: ['branchName'],
            },
          },
          {
            name: 'hansolo_abort',
            description: 'Abort a workflow session',
            inputSchema: {
              type: 'object',
              properties: {
                branchName: {
                  type: 'string',
                  description: 'Branch to abort (current if not specified)',
                },
                force: {
                  type: 'boolean',
                  description: 'Force abort',
                },
                deleteBranch: {
                  type: 'boolean',
                  description: 'Delete the branch after aborting',
                },
                yes: {
                  type: 'boolean',
                  description: 'Skip confirmation prompts',
                },
              },
            },
          },
          {
            name: 'hansolo_commit',
            description: 'Commit changes with optional message. Use stagedOnly to commit only staged files.',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Commit message (footer added automatically)',
                },
                auto: {
                  type: 'boolean',
                  description: 'Automatically choose recommended options for prompts',
                },
                stagedOnly: {
                  type: 'boolean',
                  description: 'If true, only commit staged files (use "git add" first). If false, stages and commits all changes.',
                  default: false,
                },
              },
            },
          },
          {
            name: 'hansolo_ship',
            description: 'Push, create PR, merge, and cleanup (requires all changes committed)',
            inputSchema: {
              type: 'object',
              properties: {
                prDescription: {
                  type: 'string',
                  description: 'Pull request description (footer added automatically)',
                },
                push: {
                  type: 'boolean',
                  description: 'Push to remote',
                },
                createPR: {
                  type: 'boolean',
                  description: 'Create pull request',
                },
                merge: {
                  type: 'boolean',
                  description: 'Merge to main',
                },
                auto: {
                  type: 'boolean',
                  description: 'Automatically choose recommended options for prompts',
                },
                stagedOnly: {
                  type: 'boolean',
                  description: 'If true, only commit staged files when committing changes. If false, stages and commits all changes.',
                  default: false,
                },
              },
            },
          },
          {
            name: 'hansolo_hotfix',
            description: 'Create emergency hotfix workflow',
            inputSchema: {
              type: 'object',
              properties: {
                issue: {
                  type: 'string',
                  description: 'Issue number or description',
                },
                severity: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium'],
                  description: 'Severity level of the hotfix',
                },
                skipTests: {
                  type: 'boolean',
                  description: 'Skip running tests',
                },
                skipReview: {
                  type: 'boolean',
                  description: 'Skip code review',
                },
                autoMerge: {
                  type: 'boolean',
                  description: 'Automatically merge when checks pass',
                },
                auto: {
                  type: 'boolean',
                  description: 'Automatically choose recommended options for prompts',
                },
              },
            },
          },
          {
            name: 'hansolo_status',
            description: 'Show current workflow status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'hansolo_cleanup',
            description: 'Clean up expired sessions and stale branches',
            inputSchema: {
              type: 'object',
              properties: {
                deleteBranches: {
                  type: 'boolean',
                  description: 'Delete stale branches',
                },
                force: {
                  type: 'boolean',
                  description: 'Force cleanup',
                },
              },
            },
          },
          {
            name: 'hansolo_status_line',
            description: 'Manage Claude Code status line display',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['enable', 'disable', 'update', 'show'],
                  description: 'Action to perform on status line',
                },
                format: {
                  type: 'string',
                  description: 'Custom format string (e.g., "{icon} {branch} {state}")',
                },
                showSessionInfo: {
                  type: 'boolean',
                  description: 'Show session ID in status line',
                },
                showBranchInfo: {
                  type: 'boolean',
                  description: 'Show branch name in status line',
                },
                showStateInfo: {
                  type: 'boolean',
                  description: 'Show workflow state in status line',
                },
              },
              required: ['action'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const progressToken = request.params._meta?.progressToken;

      // Preprocess args to convert string booleans to actual booleans
      const processedArgs: any = {};
      if (args) {
        Object.entries(args).forEach(([key, value]) => {
          if (value === 'true') {
            processedArgs[key] = true;
          } else if (value === 'false') {
            processedArgs[key] = false;
          } else {
            processedArgs[key] = value;
          }
        });
      }

      try {
        switch (name) {
        case 'hansolo_init': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = InitSchema.parse(processedArgs);
          const result = await this.initTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_launch': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = LaunchSchema.parse(processedArgs);
          const result = await this.launchTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_sessions': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = SessionsSchema.parse(processedArgs);
          const result = await this.sessionsTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_swap': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = SwapSchema.parse(processedArgs);
          const result = await this.swapTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_abort': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = AbortSchema.parse(processedArgs);
          const result = await this.abortTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_commit': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = CommitSchema.parse(processedArgs);
          const result = await this.commitTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_ship': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = ShipSchema.parse(processedArgs);
          const result = await this.shipTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_status': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const result = await this.statusTool.execute({});
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_cleanup': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = CleanupSchema.parse(processedArgs);
          const result = await this.cleanupTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_status_line': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = StatusLineSchema.parse(processedArgs);
          const result = await this.statusLineTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        case 'hansolo_hotfix': {
          // Send banner immediately before any processing
          await this.sendBannerNotification(name, progressToken);
          const params = HotfixSchema.parse(processedArgs);
          const result = await this.hotfixTool.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: this.formatToolResult(result),
              },
            ],
            isError: !result.success,
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Format tool result for display to user
   */
  private formatToolResult(result: any): string {
    const lines: string[] = [];

    // Extract banner from warnings (if present) and display FIRST
    let banner: string | null = null;
    const remainingWarnings: string[] = [];

    if (result.warnings && result.warnings.length > 0) {
      // Banner is the first warning (contains ASCII art box-drawing characters)
      const firstWarning = result.warnings[0];
      if (firstWarning && (firstWarning.includes('░') || firstWarning.includes('▀') || firstWarning.includes('█'))) {
        banner = firstWarning;
        // Keep remaining warnings (skip the banner)
        for (let i = 1; i < result.warnings.length; i++) {
          remainingWarnings.push(result.warnings[i]);
        }
      } else {
        // No banner, keep all warnings
        remainingWarnings.push(...result.warnings);
      }
    }

    // Display banner FIRST if present
    if (banner) {
      lines.push(banner);
      lines.push(''); // Add blank line after banner
    }

    // Success/failure header
    if (result.success) {
      lines.push('✅ Success');
    } else {
      lines.push('❌ Failed');
    }

    // Session info (for session tools)
    if (result.sessionId) {
      lines.push(`\nSession: ${result.sessionId}`);
    }
    if (result.branchName) {
      lines.push(`Branch: ${result.branchName}`);
    }
    if (result.state) {
      lines.push(`State: ${result.state}`);
    }

    // GitHub info (for ship tool)
    if (result.prNumber) {
      lines.push(`\nPR: #${result.prNumber}`);
    }
    if (result.prUrl) {
      lines.push(`URL: ${result.prUrl}`);
    }
    if (result.merged) {
      lines.push('Status: Merged ✓');
    }

    // Query data (for status/sessions tools)
    if (result.data) {
      lines.push('\nData:');
      lines.push(JSON.stringify(result.data, null, 2));
    }
    if (result.message) {
      lines.push(`\n${result.message}`);
    }

    // Pre-flight checks
    if (result.preFlightChecks && result.preFlightChecks.length > 0) {
      lines.push('\n🔍 Pre-flight Checks:');
      result.preFlightChecks.forEach((check: any) => {
        const icon = check.passed ? '✓' : check.level === 'warning' ? '⚠' : '✗';
        lines.push(`  ${icon} ${check.name}${check.message ? ': ' + check.message : ''}`);
        if (check.suggestions && check.suggestions.length > 0) {
          check.suggestions.forEach((s: string) => lines.push(`    💡 ${s}`));
        }
      });
    }

    // Post-flight verifications
    if (result.postFlightVerifications && result.postFlightVerifications.length > 0) {
      lines.push('\n✅ Post-flight Verifications:');
      result.postFlightVerifications.forEach((check: any) => {
        const icon = check.passed ? '✓' : '✗';
        lines.push(`  ${icon} ${check.name}${check.message ? ': ' + check.message : ''}`);
      });
    }

    // Errors
    if (result.errors && result.errors.length > 0) {
      lines.push('\n❌ Errors:');
      result.errors.forEach((err: string) => lines.push(`  - ${err}`));
    }

    // Warnings (excluding banner which was already displayed)
    if (remainingWarnings.length > 0) {
      lines.push('\n⚠️ Warnings:');
      remainingWarnings.forEach((warn: string) => lines.push(`  - ${warn}`));
    }

    // Next steps
    if (result.nextSteps && result.nextSteps.length > 0) {
      lines.push('\n📋 Next Steps:');
      result.nextSteps.forEach((step: string) => lines.push(`  - ${step}`));
    }

    return lines.join('\n');
  }

  private setupPromptHandlers(): void {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'init',
            description: '🚀 Initialize han-solo in your project',
            arguments: [
              {
                name: 'scope',
                description: 'Installation scope (project or user)',
                required: false,
              },
              {
                name: 'force',
                description: 'Force reinitialization',
                required: false,
              },
            ],
          },
          {
            name: 'launch',
            description: '🌟 Start a new feature workflow',
            arguments: [
              {
                name: 'description',
                description: 'Description of the feature',
                required: false,
              },
              {
                name: 'branchName',
                description: 'Name for the feature branch',
                required: false,
              },
              {
                name: 'auto',
                description: 'Automatically choose recommended options for prompts',
                required: false,
              },
            ],
          },
          {
            name: 'commit',
            description: '💾 Commit changes with a message',
            arguments: [
              {
                name: 'message',
                description: 'Commit message',
                required: true,
              },
              {
                name: 'stagedOnly',
                description: 'Only commit staged files',
                required: false,
              },
            ],
          },
          {
            name: 'ship',
            description: '🚢 Ship your changes (commit, push, PR, merge)',
            arguments: [
              {
                name: 'prDescription',
                description: 'Pull request description',
                required: false,
              },
              {
                name: 'push',
                description: 'Push to remote',
                required: false,
              },
              {
                name: 'createPR',
                description: 'Create pull request',
                required: false,
              },
              {
                name: 'merge',
                description: 'Merge pull request',
                required: false,
              },
              {
                name: 'stagedOnly',
                description: 'Only commit staged files',
                required: false,
              },
            ],
          },
          {
            name: 'swap',
            description: '🔄 Switch between workflow sessions',
            arguments: [
              {
                name: 'branchName',
                description: 'Branch to swap to',
                required: true,
              },
              {
                name: 'stash',
                description: 'Stash changes before swapping',
                required: false,
              },
            ],
          },
          {
            name: 'abort',
            description: '❌ Abort workflow session',
            arguments: [
              {
                name: 'branchName',
                description: 'Branch to abort (current if not specified)',
                required: false,
              },
              {
                name: 'deleteBranch',
                description: 'Delete the branch after aborting',
                required: false,
              },
            ],
          },
          {
            name: 'sessions',
            description: '📋 List workflow sessions',
            arguments: [
              {
                name: 'all',
                description: 'Show all sessions including completed',
                required: false,
              },
              {
                name: 'verbose',
                description: 'Show detailed session information',
                required: false,
              },
            ],
          },
          {
            name: 'status',
            description: '📊 Show current workflow status',
            arguments: [],
          },
          {
            name: 'cleanup',
            description: '🧹 Clean up expired sessions',
            arguments: [
              {
                name: 'deleteBranches',
                description: 'Delete stale branches',
                required: false,
              },
            ],
          },
          {
            name: 'hotfix',
            description: '🔥 Create emergency hotfix workflow',
            arguments: [
              {
                name: 'issue',
                description: 'Issue number or description',
                required: true,
              },
              {
                name: 'severity',
                description: 'Severity level (critical, high, medium)',
                required: false,
              },
            ],
          },
          {
            name: 'status-line',
            description: '📍 Manage Claude Code status line display',
            arguments: [
              {
                name: 'action',
                description: 'Action to perform (enable, disable, update, show)',
                required: true,
              },
            ],
          },
        ],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Map prompt names to tool names and their argument hints
      const toolMap: Record<string, { toolName: string; argumentHint?: string }> = {
        'init': {
          toolName: 'hansolo_init',
          argumentHint: '[scope] [force]',
        },
        'launch': {
          toolName: 'hansolo_launch',
          argumentHint: '[description] [branchName] [auto]',
        },
        'commit': {
          toolName: 'hansolo_commit',
          argumentHint: '[message] [stagedOnly]',
        },
        'ship': {
          toolName: 'hansolo_ship',
          argumentHint: '[prDescription] [push] [createPR] [merge] [stagedOnly]',
        },
        'swap': {
          toolName: 'hansolo_swap',
          argumentHint: '[branchName] [stash]',
        },
        'abort': {
          toolName: 'hansolo_abort',
          argumentHint: '[branchName] [deleteBranch]',
        },
        'sessions': {
          toolName: 'hansolo_sessions',
          argumentHint: '[all] [verbose]',
        },
        'status': {
          toolName: 'hansolo_status',
        },
        'cleanup': {
          toolName: 'hansolo_cleanup',
          argumentHint: '[deleteBranches]',
        },
        'hotfix': {
          toolName: 'hansolo_hotfix',
          argumentHint: '[issue] [severity]',
        },
        'status-line': {
          toolName: 'hansolo_status_line',
          argumentHint: '[action]',
        },
      };

      const toolConfig = toolMap[name];
      if (!toolConfig) {
        throw new Error(`Unknown prompt: ${name}`);
      }

      // Build tool call parameters string
      const params = args || {};
      const paramsStr = Object.keys(params).length > 0
        ? ` with parameters: ${JSON.stringify(params, null, 2)}`
        : '';

      // Generate prompt message with argument hint frontmatter
      let message = '';
      if (toolConfig.argumentHint) {
        message = `---
argument-hint: ${toolConfig.argumentHint}
---

Execute the han-solo ${name} command${paramsStr}

Use the MCP tool: ${toolConfig.toolName}`;
      } else {
        message = `Execute the han-solo ${name} command${paramsStr}

Use the MCP tool: ${toolConfig.toolName}`;
      }

      return {
        description: `Execute han-solo ${name} command`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: message,
            },
          },
        ],
      };
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Keep stdin reading to prevent premature exit
    process.stdin.resume();

    // Prevent stdin 'end' from closing the process prematurely
    process.stdin.on('end', () => {
      console.error('stdin ended, but keeping server alive');
    });

    // Log to stderr (stdout is used for MCP protocol)
    console.error('han-solo MCP server v2.0.0 running (Pure MCP Architecture)');

    // Keep the async function from returning by waiting on a promise
    // that resolves when the transport closes
    return new Promise<void>((resolve) => {
      const originalOnClose = transport.onclose;
      transport.onclose = () => {
        if (originalOnClose) {
          originalOnClose.call(transport);
        }
        resolve();
      };

      // Handle signals gracefully
      const shutdown = () => {
        transport.close().then(() => resolve());
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });
  }
}

// Export for use as a library
// Server is started by bin/hansolo-mcp when run as a command
