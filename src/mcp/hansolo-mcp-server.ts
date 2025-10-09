import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { InitCommand } from '../commands/hansolo-init';
import { LaunchCommand } from '../commands/hansolo-launch';
import { SwapCommand } from '../commands/hansolo-swap';
import { AbortCommand } from '../commands/hansolo-abort';
import { CommitCommand } from '../commands/hansolo-commit';
import { ShipCommand } from '../commands/hansolo-ship';
import { StatusLineCommand } from '../commands/hansolo-status-line';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { getBanner } from '../ui/banners';
import { HotfixCommand } from '../commands/hansolo-hotfix';

// Tool parameter schemas
const InitSchema = z.object({
  scope: z.enum(['project', 'user']).optional(),
  force: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const LaunchSchema = z.object({
  description: z.string().optional(),
  branchName: z.string().optional(),
  force: z.boolean().optional(),
  stashRef: z.string().optional(),
  popStash: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const SessionsSchema = z.object({
  all: z.boolean().optional(),
  verbose: z.boolean().optional(),
  cleanup: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const SwapSchema = z.object({
  branchName: z.string().optional(),
  force: z.boolean().optional(),
  stash: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const AbortSchema = z.object({
  branchName: z.string().optional(),
  force: z.boolean().optional(),
  deleteBranch: z.boolean().optional(),
  yes: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const CommitSchema = z.object({
  message: z.string().optional(),
  mcpPrompt: z.boolean().optional(),
});

const ShipSchema = z.object({
  prDescription: z.string().optional(),
  push: z.boolean().optional(),
  createPR: z.boolean().optional(),
  merge: z.boolean().optional(),
  force: z.boolean().optional(),
  yes: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const HotfixSchema = z.object({
  issue: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium']).optional(),
  skipTests: z.boolean().optional(),
  skipReview: z.boolean().optional(),
  autoMerge: z.boolean().optional(),
  force: z.boolean().optional(),
  yes: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
});

const StatusLineSchema = z.object({
  action: z.enum(['enable', 'disable', 'update', 'show']).optional(),
  format: z.string().optional(),
  showSessionInfo: z.boolean().optional(),
  showBranchInfo: z.boolean().optional(),
  showStateInfo: z.boolean().optional(),
  mcpPrompt: z.boolean().optional(),
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
          prompts: {},
          elicitation: {},
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
                description: {
                  type: 'string',
                  description: 'Description of the feature',
                },
                branchName: {
                  type: 'string',
                  description: 'Name for the feature branch',
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
            name: 'hansolo_commit',
            description: 'Commit staged changes with optional message',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Commit message (footer added automatically)',
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
                name: 'description',
                description: 'Description of the feature',
                required: false,
              },
              {
                name: 'branchName',
                description: 'Name for the feature branch',
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
            name: 'hotfix',
            description: '🔥 Create emergency hotfix',
            arguments: [
              {
                name: 'issue',
                description: 'Issue number or description',
                required: false,
              },
              {
                name: 'severity',
                description: 'Severity level: critical, high, or medium',
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
                description: 'Action: enable, disable, update, or show (default: show)',
                required: false,
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
          {
            name: 'doc',
            description: '📚 Manage documentation structure and conventions',
            arguments: [
              {
                name: 'name',
                description: 'Document name (for create mode)',
                required: false,
              },
              {
                name: 'content',
                description: 'Document content (for create mode)',
                required: false,
              },
            ],
          },
          {
            name: 'prime',
            description: '🎯 Prime Claude Code with codebase context',
            arguments: [],
          },
        ],
      };
    });

    /**
     * Smart argument parser that supports both positional and flag-style arguments
     *
     * Examples:
     * - Positional: {branchName: "feature/foo", description: "desc"} → {branchName: "feature/foo", description: "desc"}
     * - Flag-only: {branchName: "--description", description: "My feature"} → {description: "My feature"}
     * - Mixed: {branchName: "feature/foo", description: "--force"} → {branchName: "feature/foo", force: true}
     * - Boolean flags: {branchName: "--force", description: "--yes"} → {force: true, yes: true}
     */
    const parseArguments = (args: Record<string, any>): Record<string, any> => {
      const result: Record<string, any> = {};
      const entries = Object.entries(args).filter(([_, v]) => v !== undefined && v !== null && v !== '');

      let i = 0;
      while (i < entries.length) {
        const entry = entries[i];
        if (!entry) {
          break;
        }

        const [paramName, value] = entry;

        // Check if this value is a flag (starts with --)
        if (typeof value === 'string' && value.startsWith('--')) {
          const flagName = value.replace(/^--/, '');

          // Check if next argument exists and is NOT a flag (it's the flag's value)
          if (i + 1 < entries.length) {
            const nextEntry = entries[i + 1];
            if (nextEntry) {
              const nextValue = nextEntry[1];
              if (typeof nextValue === 'string' && !nextValue.startsWith('--')) {
                result[flagName] = nextValue;
                i += 2; // Skip both flag and its value
                continue;
              }
            }
          }

          // Boolean flag (no value following, or next is also a flag)
          result[flagName] = true;
          i++;
          continue;
        }

        // Regular positional argument - use its parameter name
        result[paramName] = value;
        i++;
      }

      return result;
    };

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Helper function to read command markdown files
      const readCommandMarkdown = async (commandName: string): Promise<string> => {
        const commandPath = path.join(process.cwd(), '.hansolo', 'commands', `${commandName}.md`);
        if (!fs.existsSync(commandPath)) {
          throw new Error(`Command file not found: ${commandPath}`);
        }
        return await fs.promises.readFile(commandPath, 'utf-8');
      };

      // Handle doc and prime commands from markdown files
      if (name === 'doc' || name === 'prime') {
        let markdown = await readCommandMarkdown(name);

        // Substitute $ARGUMENTS with all arguments
        if (args) {
          const allArgs = Object.values(args).filter(v => v !== undefined && v !== '').join(' ');
          markdown = markdown.replace(/\$ARGUMENTS/g, allArgs);

          // Substitute $ARGUMENT1 with first argument
          const firstArg = Object.values(args)[0] || '';
          markdown = markdown.replace(/\$ARGUMENT1/g, String(firstArg));
        } else {
          // No arguments provided - empty string
          markdown = markdown.replace(/\$ARGUMENTS/g, '');
          markdown = markdown.replace(/\$ARGUMENT1/g, '');
        }

        return {
          description: `Execute ${name} command`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: markdown,
              },
            },
          ],
        };
      }

      // Handle standard han-solo commands
      // Build tool call arguments with smart parsing (supports both positional and flag-style)
      const toolArgs = args ? parseArguments(args) : {};

      // Build arguments string for display (exclude internal parameters, but we'll add mcpPrompt explicitly)
      const displayArgs = Object.entries(toolArgs).filter(([k]) => k !== 'mcpPrompt');
      const userArgsStr = displayArgs.length > 0
        ? displayArgs.map(([k, v]) => `${k}=${v}`).join(', ')
        : '';

      // Build complete args string with mcpPrompt=true always included
      const argsStr = userArgsStr
        ? ` with ${userArgsStr} and mcpPrompt=true`
        : ' with mcpPrompt=true';

      // Construct the prompt returned from the mcp server
      const banner = getBanner(name);

      // Generate standard command message for all commands
      const commandMessage = `Display the following text immediately before you do anything else:

${banner}

Once that has been shown to the user, now run the han-solo ${name} command${argsStr}

IMPORTANT: You must include this parameter in your tool call:
<parameter name="mcpPrompt">true</parameter>`;

      return {
        description: `Execute han-solo ${name} command`,
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
          const params = InitSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('init'));
          }
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
          const params = LaunchSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('launch'));
          }

          const description = params.description;
          const branchName = params.branchName;

          // If no parameters provided, ask Claude to analyze changes and generate branch name/description
          if (!branchName && !description) {
            return {
              content: [{
                type: 'text',
                text: `Before launching a new feature, let me analyze your changes to generate an appropriate branch name and description.

1. **Review current changes**: Run 'git status' to see which files have been modified
2. **Examine the changes**: Run 'git diff' to understand what's being worked on (skip if too large or no changes yet)
3. **Generate branch info**: Based on your analysis (or if starting fresh, ask the user), create:

   **Branch Description** (for description parameter):
   - A clear, concise description of the feature/fix (2-8 words)
   - Examples: "Add user authentication", "Fix memory leak in parser", "Update documentation"
   - This will be used to generate a properly formatted branch name

   Alternatively, if you want full control:
   **Branch Name** (for branchName parameter):
   - Use standard format: type/description-in-kebab-case
   - Types: feature, bugfix, hotfix, release, chore, docs, test, refactor
   - Example: "feature/add-user-authentication"

4. **Call launch again** with the generated description (or branchName if you prefer):

IMPORTANT: Include one of these parameter combinations:
- Simple: <parameter name="description">Your description here</parameter>
- Advanced: <parameter name="branchName">type/description-in-kebab-case</parameter>

Also include:
<parameter name="mcpPrompt">true</parameter>`,
              }],
            };
          }

          const launchCommand = new LaunchCommand(this.basePath);
          await launchCommand.execute({...params, description, branchName});
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || `Launched new workflow on branch: ${branchName || description || 'auto-generated'}`,
              },
            ],
          };
        }

        case 'hansolo_sessions': {
          const params = SessionsSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('sessions'));
          }
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
          const params = SwapSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('swap'));
          }

          // If no branchName provided, try elicitation or fail gracefully
          let branchName = params.branchName;
          if (!branchName) {
            const sessionRepo = new SessionRepository(this.basePath);
            const sessions = await sessionRepo.listSessions(false);
            const activeSessions = sessions.filter(s => s.isActive());

            if (activeSessions.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: 'No active sessions available to swap to. Use /hansolo:launch to start a new workflow.',
                }],
              };
            }

            try {
              // Build enum options from active sessions
              const sessionOptions = activeSessions.map(s => s.branchName);
              const defaultBranch = sessionOptions[0];

              const elicitResult = await this.server.elicitInput({
                message: `Select which branch to swap to (${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''} available):`,
                requestedSchema: {
                  type: 'object',
                  properties: {
                    branchName: {
                      type: 'string',
                      title: 'Branch to swap to',
                      description: `Active sessions: ${sessionOptions.join(', ')}`,
                      default: defaultBranch,
                    },
                  },
                  required: ['branchName'],
                },
              });

              if (elicitResult.action !== 'accept' || !elicitResult.content?.['branchName']) {
                return {
                  content: [{
                    type: 'text',
                    text: 'Swap cancelled by user',
                  }],
                };
              }

              branchName = elicitResult.content['branchName'] as string;
            } catch (error) {
              // Elicitation not supported - return error
              console.error('[MCP] Elicitation not supported');
              return {
                content: [{
                  type: 'text',
                  text: `Branch name is required for swap. Available sessions: ${activeSessions.map(s => s.branchName).join(', ')}`,
                }],
              };
            }
          }

          const swapCommand = new SwapCommand(this.basePath);
          await swapCommand.execute({branchName, force: params.force, stash: params.stash});
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || `Swapped to branch: ${branchName}`,
              },
            ],
          };
        }

        case 'hansolo_abort': {
          const params = AbortSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('abort'));
          }

          // If no branchName provided and multiple active sessions, ask which one
          let branchName = params.branchName;
          if (!branchName) {
            const sessionRepo = new SessionRepository(this.basePath);
            const sessions = await sessionRepo.listSessions(false);
            const activeSessions = sessions.filter(s => s.isActive());

            if (activeSessions.length > 1) {
              try {
                const sessionOptions = activeSessions.map(s => s.branchName);
                const gitOps = new GitOperations();
                const currentBranch = await gitOps.getCurrentBranch();
                const defaultBranch = sessionOptions.includes(currentBranch) ? currentBranch : sessionOptions[0];

                const elicitResult = await this.server.elicitInput({
                  message: `Select which session to abort (${activeSessions.length} active sessions):`,
                  requestedSchema: {
                    type: 'object',
                    properties: {
                      branchName: {
                        type: 'string',
                        title: 'Branch to abort',
                        description: `Active sessions: ${sessionOptions.join(', ')}`,
                        default: defaultBranch,
                      },
                    },
                    required: ['branchName'],
                  },
                });

                if (elicitResult.action !== 'accept' || !elicitResult.content?.['branchName']) {
                  return {
                    content: [{
                      type: 'text',
                      text: 'Abort cancelled by user',
                    }],
                  };
                }

                branchName = elicitResult.content['branchName'] as string;
              } catch (error) {
                // Elicitation not supported - just use current branch or error
                console.error('[MCP] Elicitation not supported, defaulting to current branch');
              }
            }
          }

          const abortCommand = new AbortCommand(this.basePath);
          const result = await abortCommand.execute({...params, branchName, yes: true});

          const outputText = capturedOutput.join('\n') || `Aborted workflow on branch: ${result.branchAborted}${result.stashRef ? '\nWork stashed: ' + result.stashRef : ''}`;

          return {
            content: [
              {
                type: 'text',
                text: outputText,
              },
            ],
          };
        }

        case 'hansolo_commit': {
          const params = CommitSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('commit'));
          }

          const commitCommand = new CommitCommand(this.basePath);
          const result = await commitCommand.execute({
            message: params.message,
            mcpPrompt: params.mcpPrompt,
          });

          // Result is either:
          // - A prompt (orchestration instructions for Claude Code)
          // - A success message (changes committed)
          // Errors are thrown and handled by outer try/catch

          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        }

        case 'hansolo_ship': {
          const params = ShipSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('ship'));
          }

          const shipCommand = new ShipCommand(this.basePath);
          const result = await shipCommand.execute({
            prDescription: params.prDescription,
            yes: params.yes,
            force: params.force,
            mcpPrompt: params.mcpPrompt,
          });

          // Result is either:
          // - A prompt (orchestration instructions for Claude Code)
          // - A success message (workflow completed)
          // Errors are thrown and handled by outer try/catch

          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        }

        case 'hansolo_status': {
          if (!processedArgs?.['mcpPrompt']) {
            capturedOutput.push(getBanner('status'));
          }
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
          const params = StatusLineSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('status-line'));
          }

          // Convert params to string array format expected by command
          const args: string[] = [];
          if (params.action) {
            args.push(params.action);
          }
          if (params.format) {
            args.push('--format');
            args.push(params.format);
          }
          if (params.showSessionInfo !== undefined) {
            args.push('--show-session-info');
            args.push(String(params.showSessionInfo));
          }
          if (params.showBranchInfo !== undefined) {
            args.push('--show-branch-info');
            args.push(String(params.showBranchInfo));
          }
          if (params.showStateInfo !== undefined) {
            args.push('--show-state-info');
            args.push(String(params.showStateInfo));
          }

          const statusLineCommand = new StatusLineCommand();
          await statusLineCommand.execute(args);

          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || 'Status line command executed',
              },
            ],
          };
        }

        case 'hansolo_hotfix': {
          const params = HotfixSchema.parse(processedArgs);
          if (!params.mcpPrompt) {
            capturedOutput.push(getBanner('hotfix'));
          }
          const hotfixCommand = new HotfixCommand(this.basePath);
          await hotfixCommand.execute(params);
          return {
            content: [
              {
                type: 'text',
                text: capturedOutput.join('\n') || 'Hotfix workflow started',
              },
            ],
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