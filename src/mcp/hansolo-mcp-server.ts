import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { InitCommand } from '../commands/hansolo-init';
// Import adapter commands for v2 compatibility
import {
  LaunchCommand,
  SwapCommand,
  AbortCommand,
  ShipCommand,
} from '../commands/adapters';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';

// Tool parameter schemas
const InitSchema = z.object({
  scope: z.enum(['project', 'user']).optional(),
  force: z.boolean().optional(),
});

const LaunchSchema = z.object({
  branchName: z.string().optional(),
  description: z.string().optional(),
  force: z.boolean().optional(),
  stashRef: z.string().optional(),
  popStash: z.boolean().optional(),
});

const SessionsSchema = z.object({
  all: z.boolean().optional(),
  verbose: z.boolean().optional(),
  cleanup: z.boolean().optional(),
});

const SwapSchema = z.object({
  branchName: z.string().optional(),
  force: z.boolean().optional(),
  stash: z.boolean().optional(),
});

const AbortSchema = z.object({
  branchName: z.string().optional(),
  force: z.boolean().optional(),
  deleteBranch: z.boolean().optional(),
  yes: z.boolean().optional(),
});

const ShipSchema = z.object({
  message: z.string().optional(),
  push: z.boolean().optional(),
  createPR: z.boolean().optional(),
  merge: z.boolean().optional(),
  force: z.boolean().optional(),
  yes: z.boolean().optional(),
});

// ASCII Art Banners for each command
const BANNERS: Record<string, string> = {
  hansolo_init: `░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_launch: `░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_ship: `░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_swap: `░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_abort: `░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_sessions: `░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_status: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░`,
  hansolo_status_line: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░░░█░░░▀█▀░█▀█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░░░█░░░░█░░█░█░█▀▀░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
};
export class HanSoloMCPServer {
  private server: Server;
  private basePath: string;

  constructor(basePath: string = '.hansolo') {
    this.basePath = basePath;
    this.server = new Server(
      {
        name: 'hansolo-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
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
                branchName: {
                  type: 'string',
                  description: 'Name for the feature branch',
                },
                description: {
                  type: 'string',
                  description: 'Description of the feature',
                },
                force: {
                  type: 'boolean',
                  description: 'Force launch even with uncommitted changes',
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
            name: 'hansolo_ship',
            description: 'Complete workflow and merge to main',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Commit message',
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
                force: {
                  type: 'boolean',
                  description: 'Force operations',
                },
                yes: {
                  type: 'boolean',
                  description: 'Skip confirmations',
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
                name: 'branchName',
                description: 'Name for the feature branch',
                required: false,
              },
              {
                name: 'description',
                description: 'Description of the feature',
                required: false,
              },
            ],
          },
          {
            name: 'swap',
            description: '🔄 Switch between branches',
            arguments: [
              {
                name: 'branchName',
                description: 'Branch to swap to',
                required: false,
              },
              {
                name: 'stash',
                description: 'Stash changes before swapping',
                required: false,
              },
            ],
          },
          {
            name: 'ship',
            description: '🚢 Ship your changes',
            arguments: [
              {
                name: 'message',
                description: 'Commit message',
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
            name: 'status',
            description: '📊 Show workflow status',
            arguments: [],
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
            name: 'status-line',
            description: '📍 Manage status line display',
            arguments: [
              {
                name: 'action',
                description: 'Action: enable, disable, update, or show',
                required: true,
              },
              {
                name: 'format',
                description: 'Custom format string (e.g., "{icon} {branch} {state}")',
                required: false,
              },
              {
                name: 'showSessionInfo',
                description: 'Show session ID in status line',
                required: false,
              },
              {
                name: 'showBranchInfo',
                description: 'Show branch name in status line',
                required: false,
              },
              {
                name: 'showStateInfo',
                description: 'Show workflow state in status line',
                required: false,
              },
            ],
          },
        ],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Build tool call arguments
      const toolArgs: Record<string, any> = {};
      if (args) {
        Object.entries(args).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            toolArgs[key] = value;
          }
        });
      }

      // Build arguments string for display
      const argsStr = Object.keys(toolArgs).length > 0
        ? ` with ${Object.entries(toolArgs).map(([k, v]) => `${k}=${v}`).join(', ')}`
        : '';

      // Construct the prompt returned from the mcp server
      // Prepend hansolo_ to match BANNERS keys
      const bannerKey = `hansolo_${name}`;
      const banner = BANNERS[bannerKey] || '';

      const commandMessage = `Display the following text immediately before you do anything else:

${banner}

One that has been shown to the user, now run the han-solo ${name} command${argsStr}`

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: commandMessage,
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Save original console methods
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const capturedOutput: string[] = [];

      // NOW override console to capture command output
      console.log = (...args: any[]) => {
        capturedOutput.push(args.map(a => String(a)).join(' '));
      };
      console.error = (...args: any[]) => {
        // Still allow our own MCP server logs through
        if (args[0]?.includes?.('[MCP') || args[0]?.includes?.('han-solo MCP')) {
          originalConsoleError(...args);
        } else {
          capturedOutput.push(args.map(a => String(a)).join(' '));
        }
      };

      try {
        switch (name) {
        case 'hansolo_init': {
          const params = InitSchema.parse(args);
          const initCommand = new InitCommand(this.basePath);
          await initCommand.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || 'han-solo initialized successfully',
              },
            ],
          };
        }

        case 'hansolo_launch': {
          const params = LaunchSchema.parse(args);
          const launchCommand = new LaunchCommand(this.basePath);
          await launchCommand.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || `Launched new workflow on branch: ${params.branchName || 'auto-generated'}`,
              },
            ],
          };
        }

        case 'hansolo_sessions': {
          const params = SessionsSchema.parse(args);
          // SessionsCommand is available but we'll use SessionRepository directly
          const sessionRepo = new SessionRepository(this.basePath);

          // Perform cleanup if requested
          let cleanedCount = 0;
          if (params.cleanup) {
            cleanedCount = await sessionRepo.cleanupCompletedSessions();
          }

          const sessions = await sessionRepo.listSessions(params.all);

          const response: any = {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.isActive()).length,
            sessions: sessions.map(s => ({
              id: s.id,
              branch: s.branchName,
              state: s.currentState,
              type: s.workflowType,
              age: s.getAge(),
            })),
          };

          if (params.cleanup) {
            response.cleaned = cleanedCount;
            response.message = `Cleaned up ${cleanedCount} session(s) (completed/aborted/orphaned)`;
          }

          // Prepend banner to output
          const outputText = capturedOutput.length > 0
            ? capturedOutput.join('\n') + '\n\n' + JSON.stringify(response, null, 2)
            : JSON.stringify(response, null, 2);

          return {
            content: [
              {
                type: 'text',
                text: outputText,
              },
            ],
          };
        }

        case 'hansolo_swap': {
          const params = SwapSchema.parse(args);
          const swapCommand = new SwapCommand(this.basePath);
          await swapCommand.execute(params.branchName, {
            force: params.force,
            stash: params.stash,
          });
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || `Swapped to branch: ${params.branchName}`,
              },
            ],
          };
        }

        case 'hansolo_abort': {
          const params = AbortSchema.parse(args);
          const abortCommand = new AbortCommand(this.basePath);
          const result = await abortCommand.execute(params);

          // Include stashRef in output if present
          let outputText = capturedOutput.join('\n');
          if (!outputText) {
            outputText = `Aborted workflow on branch: ${result.branchAborted}`;
            if (result.stashRef) {
              outputText += `\nWork stashed: ${result.stashRef}`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: outputText,
              },
            ],
          };
        }

        case 'hansolo_ship': {
          const params = ShipSchema.parse(args);
          const shipCommand = new ShipCommand(this.basePath);
          await shipCommand.execute(params);

          const outputText = capturedOutput.join('\n');

          return {
            content: [
              {
                type: 'text',
                text: outputText || 'Workflow shipped successfully',
              },
            ],
          };
        }

        case 'hansolo_status': {
          const gitOps = new GitOperations();
          const sessionRepo = new SessionRepository(this.basePath);
          const currentBranch = await gitOps.getCurrentBranch();
          const session = await sessionRepo.getSessionByBranch(currentBranch);

          let statusOutput = '';
          if (session) {
            statusOutput = JSON.stringify({
              sessionId: session.id,
              branch: session.branchName,
              state: session.currentState,
              type: session.workflowType,
              age: session.getAge(),
              isActive: session.isActive(),
            }, null, 2);
          } else {
            statusOutput = 'No active workflow session on current branch';
          }

          // Prepend banner to output
          const outputText = capturedOutput.length > 0
            ? capturedOutput.join('\n') + '\n\n' + statusOutput
            : statusOutput;

          return {
            content: [
              {
                type: 'text',
                text: outputText,
              },
            ],
          };
        }

        case 'hansolo_status_line': {
          const { ManageStatusLineTool } = await import('../mcp-server/tools/manage-status-line');
          const statusLineTool = new ManageStatusLineTool();
          const result = await statusLineTool.execute(args as any);

          let message = '';
          let isError = false;

          if (result.success) {
            message = result.message || '';
            if (result.enabled && result.currentFormat) {
              message += `\nFormat: ${result.currentFormat}`;
            }
            if (result.preview) {
              message += `\nPreview: ${result.preview}`;
            }
            if (!message) {
              message = 'Status line operation completed';
            }
          } else {
            message = `Error: ${result.error || 'Unknown error'}`;
            isError = true;
          }

          // Prepend banner to output
          const outputText = capturedOutput.length > 0
            ? capturedOutput.join('\n') + '\n\n' + message
            : message;

          return {
            content: [
              {
                type: 'text',
                text: outputText,
              },
            ],
            isError,
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
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCaptured output:\n${capturedOutput.join('\n')}`,
            },
          ],
          isError: true,
        };
      } finally {
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
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
    console.error('han-solo MCP server running');

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