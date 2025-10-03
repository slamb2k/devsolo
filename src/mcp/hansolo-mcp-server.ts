import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import chalk from 'chalk';
import boxen from 'boxen';
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
  hansolo_init: '🚀 Initializing han-solo [VERSION 2.0 DEBUG BUILD]',
  hansolo_launch: '🚀 Launching New Feature Workflow [VERSION 2.0 DEBUG BUILD]',
  hansolo_ship: '🚢 Shipping Workflow [VERSION 2.0 DEBUG BUILD]',
  hansolo_swap: '🔄 Swapping Workflow [VERSION 2.0 DEBUG BUILD]',
  hansolo_abort: '⛔ Aborting Workflow [VERSION 2.0 DEBUG BUILD]',
  hansolo_sessions: '📋 Workflow Sessions [VERSION 2.0 DEBUG BUILD]',
  hansolo_status: '📊 Workflow Status [VERSION 2.0 DEBUG BUILD]',
};

/**
 * Create an ASCII art banner for a command
 */
function createBanner(title: string): string {
  return '\n' + boxen(chalk.bold.cyan(title), {
    padding: 1,
    margin: 1,
    borderStyle: 'double',
    borderColor: 'cyan',
    textAlignment: 'center',
  }) + '\n';
}


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

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Run the han-solo ${name} command${argsStr}`,
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

      // Display banner FIRST (using original console, before override)
      const banner = BANNERS[name];
      if (banner) {
        originalConsoleLog(createBanner(banner));
      }

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
          const sessions = await sessionRepo.listSessions(params.all);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalSessions: sessions.length,
                  activeSessions: sessions.filter(s => s.isActive()).length,
                  sessions: sessions.map(s => ({
                    id: s.id,
                    branch: s.branchName,
                    state: s.currentState,
                    type: s.workflowType,
                    age: s.getAge(),
                  })),
                }, null, 2),
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
          originalConsoleError('[MCP] hansolo_ship case hit');
          const params = ShipSchema.parse(args);
          originalConsoleError('[MCP] Params parsed:', params);
          const shipCommand = new ShipCommand(this.basePath);
          originalConsoleError('[MCP] ShipCommand created, about to execute');

          // Add debug marker to captured output
          capturedOutput.push('[MCP DEBUG] About to execute ship command');

          await shipCommand.execute(params);

          capturedOutput.push('[MCP DEBUG] Ship command execute completed');
          originalConsoleError('[MCP] ShipCommand execute returned');

          // Always show captured output for debugging
          const outputText = capturedOutput.join('\n');
          originalConsoleError('[MCP DEBUG] Captured output length:', outputText.length);
          originalConsoleError('[MCP DEBUG] Captured output:', outputText);

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

          if (session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    sessionId: session.id,
                    branch: session.branchName,
                    state: session.currentState,
                    type: session.workflowType,
                    age: session.getAge(),
                    isActive: session.isActive(),
                  }, null, 2),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No active workflow session on current branch',
                },
              ],
            };
          }
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