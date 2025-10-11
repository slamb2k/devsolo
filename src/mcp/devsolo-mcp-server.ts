import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

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

const StatusSchema = z.object({
});

export class DevSoloMCPServer {
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

  constructor(basePath: string = '.devsolo') {
    // Detect plugin context
    const isPluginMode = !!process.env['CLAUDE_PLUGIN_ROOT'];
    const pluginRoot = process.env['CLAUDE_PLUGIN_ROOT'] || '';

    if (isPluginMode) {
      console.error(`devsolo running in plugin mode: ${pluginRoot}`);
    }

    this.server = new Server(
      {
        name: 'devsolo',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services (basePath is always relative to project root, not plugin root)
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
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'devsolo_init',
            description: '🚀 Initialize devsolo in your project',
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
            name: 'devsolo_launch',
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
            name: 'devsolo_sessions',
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
            name: 'devsolo_swap',
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
            name: 'devsolo_abort',
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
            name: 'devsolo_commit',
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
            name: 'devsolo_ship',
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
            name: 'devsolo_hotfix',
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
            name: 'devsolo_status',
            description: 'Show current workflow status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'devsolo_cleanup',
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
            name: 'devsolo_status_line',
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
        case 'devsolo_init': {
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

        case 'devsolo_launch': {
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

        case 'devsolo_sessions': {
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

        case 'devsolo_swap': {
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

        case 'devsolo_abort': {
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

        case 'devsolo_commit': {
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

        case 'devsolo_ship': {
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

        case 'devsolo_status': {
          const params = StatusSchema.parse(processedArgs);
          const result = await this.statusTool.execute(params);

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

        case 'devsolo_cleanup': {
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

        case 'devsolo_status_line': {
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

        case 'devsolo_hotfix': {
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
    const mode = process.env['CLAUDE_PLUGIN_ROOT'] ? 'Plugin Mode' : 'Standalone Mode';
    console.error(`devsolo MCP server v2.0.0 running (${mode})`);

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
// Server is started by bin/devsolo-mcp when run as a command
