import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { InitCommand } from '../commands/hansolo-init';
import { LaunchCommand } from '../commands/hansolo-launch';
// SessionsCommand available but not directly used
// import { SessionsCommand } from '../commands/hansolo-sessions';
import { SwapCommand } from '../commands/hansolo-swap';
import { AbortCommand } from '../commands/hansolo-abort';
import { ShipCommand } from '../commands/hansolo-ship';
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
            description: 'Initialize han-solo in your project',
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

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
                text: 'han-solo initialized successfully',
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
                text: `Launched new workflow on branch: ${params.branchName || 'auto-generated'}`,
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
                text: `Swapped to branch: ${params.branchName}`,
              },
            ],
          };
        }

        case 'hansolo_abort': {
          const params = AbortSchema.parse(args);
          const abortCommand = new AbortCommand(this.basePath);
          await abortCommand.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: `Aborted workflow on branch: ${params.branchName || 'current'}`,
              },
            ],
          };
        }

        case 'hansolo_ship': {
          const params = ShipSchema.parse(args);
          const shipCommand = new ShipCommand(this.basePath);
          await shipCommand.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: 'Workflow shipped successfully',
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
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('han-solo MCP server running');
  }
}

// Main entry point
if (require.main === module) {
  const server = new HanSoloMCPServer();
  server.run().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}