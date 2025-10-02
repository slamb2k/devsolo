import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { HanSoloMCPServer } from '../../src/mcp/hansolo-mcp-server-enhanced';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InitCommand } from '../../src/commands/hansolo-init';
import { LaunchCommand } from '../../src/commands/hansolo-launch';
import { ShipCommand } from '../../src/commands/hansolo-ship';
import { SwapCommand } from '../../src/commands/hansolo-swap';
import { AbortCommand } from '../../src/commands/hansolo-abort';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';

// Mock all command modules
jest.mock('../../src/commands/hansolo-init');
jest.mock('../../src/commands/hansolo-launch');
jest.mock('../../src/commands/hansolo-ship');
jest.mock('../../src/commands/hansolo-swap');
jest.mock('../../src/commands/hansolo-abort');
jest.mock('../../src/services/session-repository');
jest.mock('../../src/services/git-operations');

describe('HanSoloMCPServer', () => {
  let server: HanSoloMCPServer;
  let mockServerInstance: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create server instance
    server = new HanSoloMCPServer('.test-hansolo');
    
    // Access the private server instance for testing
    mockServerInstance = (server as any).server;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize with correct name and version', () => {
      expect(mockServerInstance).toBeDefined();
      expect(mockServerInstance.serverInfo.name).toBe('hansolo-mcp');
      expect(mockServerInstance.serverInfo.version).toBe('2.0.0');
    });

    it('should register all required capabilities', () => {
      const capabilities = mockServerInstance.capabilities;
      expect(capabilities).toHaveProperty('tools');
      expect(capabilities).toHaveProperty('prompts');
      expect(capabilities).toHaveProperty('completion');
    });

    it('should use custom base path when provided', () => {
      const customServer = new HanSoloMCPServer('/custom/path');
      expect((customServer as any).basePath).toBe('/custom/path');
    });
  });

  describe('Tool Registration', () => {
    it('should register all hansolo tools', async () => {
      // Mock the ListToolsRequestSchema handler
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listToolsHandler = handlers?.get('tools/list');
      
      if (listToolsHandler) {
        const result = await listToolsHandler({});
        expect(result.tools).toHaveLength(7);
        
        const toolNames = result.tools.map((t: any) => t.name);
        expect(toolNames).toContain('hansolo_init');
        expect(toolNames).toContain('hansolo_launch');
        expect(toolNames).toContain('hansolo_sessions');
        expect(toolNames).toContain('hansolo_swap');
        expect(toolNames).toContain('hansolo_abort');
        expect(toolNames).toContain('hansolo_ship');
        expect(toolNames).toContain('hansolo_status');
      }
    });

    it('should include detailed descriptions for each tool', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listToolsHandler = handlers?.get('tools/list');
      
      if (listToolsHandler) {
        const result = await listToolsHandler({});
        const initTool = result.tools.find((t: any) => t.name === 'hansolo_init');
        
        expect(initTool.description).toContain('Initialize hansolo');
        expect(initTool.description).toContain('Git workflow management');
        expect(initTool.inputSchema).toBeDefined();
        expect(initTool.inputSchema.properties).toHaveProperty('scope');
        expect(initTool.inputSchema.properties).toHaveProperty('force');
      }
    });

    it('should define proper schemas for tool inputs', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listToolsHandler = handlers?.get('tools/list');
      
      if (listToolsHandler) {
        const result = await listToolsHandler({});
        const launchTool = result.tools.find((t: any) => t.name === 'hansolo_launch');
        
        expect(launchTool.inputSchema.type).toBe('object');
        expect(launchTool.inputSchema.properties.branchName.type).toBe('string');
        expect(launchTool.inputSchema.properties.force.default).toBe(false);
      }
    });
  });

  describe('Prompt Registration', () => {
    it('should register all hansolo prompts', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listPromptsHandler = handlers?.get('prompts/list');
      
      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        expect(result.prompts).toHaveLength(7);
        
        const promptNames = result.prompts.map((p: any) => p.name);
        expect(promptNames).toContain('hansolo/init');
        expect(promptNames).toContain('hansolo/launch');
        expect(promptNames).toContain('hansolo/sessions');
        expect(promptNames).toContain('hansolo/swap');
        expect(promptNames).toContain('hansolo/abort');
        expect(promptNames).toContain('hansolo/ship');
        expect(promptNames).toContain('hansolo/status');
      }
    });

    it('should include emoji icons in prompt descriptions', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listPromptsHandler = handlers?.get('prompts/list');
      
      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        const prompts = result.prompts;
        
        expect(prompts.find((p: any) => p.name === 'hansolo/init').description).toContain('🚀');
        expect(prompts.find((p: any) => p.name === 'hansolo/launch').description).toContain('🌟');
        expect(prompts.find((p: any) => p.name === 'hansolo/sessions').description).toContain('📋');
        expect(prompts.find((p: any) => p.name === 'hansolo/swap').description).toContain('🔄');
        expect(prompts.find((p: any) => p.name === 'hansolo/abort').description).toContain('❌');
        expect(prompts.find((p: any) => p.name === 'hansolo/ship').description).toContain('🚢');
        expect(prompts.find((p: any) => p.name === 'hansolo/status').description).toContain('📊');
      }
    });

    it('should define required and optional arguments correctly', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const listPromptsHandler = handlers?.get('prompts/list');
      
      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        const swapPrompt = result.prompts.find((p: any) => p.name === 'hansolo/swap');
        
        const branchNameArg = swapPrompt.arguments.find((a: any) => a.name === 'branchName');
        expect(branchNameArg.required).toBe(true);
        
        const stashArg = swapPrompt.arguments.find((a: any) => a.name === 'stash');
        expect(stashArg.required).toBe(false);
      }
    });
  });

  describe('GetPrompt Handler', () => {
    it('should return prompt templates with examples', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const getPromptHandler = handlers?.get('prompts/get');
      
      if (getPromptHandler) {
        const result = await getPromptHandler({ 
          params: { 
            name: 'hansolo/launch',
            arguments: {}
          }
        });
        
        expect(result.description).toContain('Execute han-solo launch command');
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
      }
    });

    it('should handle unknown prompt names', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const getPromptHandler = handlers?.get('prompts/get');
      
      if (getPromptHandler) {
        await expect(getPromptHandler({ 
          params: { 
            name: 'unknown/prompt',
            arguments: {}
          }
        })).rejects.toThrow('Unknown prompt');
      }
    });
  });

  describe('Completion Handler', () => {
    it('should provide branch name completions for swap command', async () => {
      // Mock SessionRepository to return test sessions
      const mockSessions = [
        { branchName: 'feature/auth', isActive: () => true },
        { branchName: 'feature/payments', isActive: () => true },
        { branchName: 'fix/bug-123', isActive: () => true }
      ];
      
      (SessionRepository as jest.MockedClass<typeof SessionRepository>).mockImplementation(
        () => ({
          listSessions: jest.fn().mockResolvedValue(mockSessions),
        } as any)
      );

      const handlers = (mockServerInstance as any)._requestHandlers;
      const completeHandler = handlers?.get('completion/complete');
      
      if (completeHandler) {
        const result = await completeHandler({
          params: {
            ref: { name: 'hansolo/swap' },
            argument: { name: 'branchName' }
          }
        });
        
        expect(result.values).toContain('feature/auth');
        expect(result.values).toContain('feature/payments');
        expect(result.values).toContain('fix/bug-123');
        expect(result.total).toBe(3);
      }
    });

    it('should return empty completions for unknown contexts', async () => {
      const handlers = (mockServerInstance as any)._requestHandlers;
      const completeHandler = handlers?.get('completion/complete');
      
      if (completeHandler) {
        const result = await completeHandler({
          params: {
            ref: { name: 'hansolo/unknown' },
            argument: { name: 'unknown' }
          }
        });
        
        expect(result.values).toEqual([]);
        expect(result.total).toBe(0);
      }
    });
  });

  describe('Tool Execution', () => {
    describe('hansolo_init', () => {
      it('should execute init command with default parameters', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (InitCommand as jest.MockedClass<typeof InitCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_init', {});
        
        expect(mockExecute).toHaveBeenCalledWith({});
        expect(result.content[0].text).toContain('han-solo initialized successfully');
        expect(result.content[0].text).toContain('hansolo/launch');
      });

      it('should pass scope and force parameters correctly', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (InitCommand as jest.MockedClass<typeof InitCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        await (server as any).executeCommand('hansolo_init', {
          scope: 'user',
          force: true
        });
        
        expect(mockExecute).toHaveBeenCalledWith({
          scope: 'user',
          force: true
        });
      });
    });

    describe('hansolo_launch', () => {
      it('should execute launch command and return branch info', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (LaunchCommand as jest.MockedClass<typeof LaunchCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_launch', {
          branchName: 'feature/test'
        });
        
        expect(mockExecute).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Launched new workflow on branch: feature/test');
        expect(result.content[0].text).toContain('hansolo/ship');
      });

      it('should auto-generate branch name if not provided', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (LaunchCommand as jest.MockedClass<typeof LaunchCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_launch', {});
        
        expect(result.content[0].text).toMatch(/Launched new workflow on branch: feature\/\d+/);
      });
    });

    describe('hansolo_sessions', () => {
      it('should list active sessions with formatting', async () => {
        const mockSessions = [
          {
            branchName: 'feature/auth',
            workflowType: 'launch',
            currentState: 'BRANCH_READY',
            getAge: () => '2 hours',
            isActive: () => true
          },
          {
            branchName: 'fix/bug-123',
            workflowType: 'hotfix',
            currentState: 'PUSHED',
            getAge: () => '1 day',
            isActive: () => true
          }
        ];

        (SessionRepository as jest.MockedClass<typeof SessionRepository>).mockImplementation(
          () => ({
            listSessions: jest.fn().mockResolvedValue(mockSessions),
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_sessions', {});
        
        expect(result.content[0].text).toContain('Workflow Sessions (2)');
        expect(result.content[0].text).toContain('feature/auth (launch)');
        expect(result.content[0].text).toContain('fix/bug-123 (hotfix)');
        expect(result.content[0].text).toContain('hansolo/swap');
      });

      it('should handle empty session list', async () => {
        (SessionRepository as jest.MockedClass<typeof SessionRepository>).mockImplementation(
          () => ({
            listSessions: jest.fn().mockResolvedValue([]),
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_sessions', {});
        
        expect(result.content[0].text).toContain('No active sessions found');
        expect(result.content[0].text).toContain('hansolo/launch');
      });
    });

    describe('hansolo_swap', () => {
      it('should execute swap command with branch name', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (SwapCommand as jest.MockedClass<typeof SwapCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_swap', {
          branchName: 'main',
          stash: true
        });
        
        expect(mockExecute).toHaveBeenCalledWith('main', {
          force: undefined,
          stash: true
        });
        expect(result.content[0].text).toContain('Swapped to branch: main');
        expect(result.content[0].text).toContain('Changes were stashed');
      });

      it('should require branch name parameter', async () => {
        const result = await (server as any).executeCommand('hansolo_swap', {});
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Branch name is required');
      });
    });

    describe('hansolo_ship', () => {
      it('should execute ship command with multiple flags', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (ShipCommand as jest.MockedClass<typeof ShipCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_ship', {
          message: 'feat: new feature',
          push: true,
          createPR: true,
          merge: false
        });
        
        expect(mockExecute).toHaveBeenCalledWith({
          message: 'feat: new feature',
          push: true,
          createPR: true,
          merge: false,
          force: undefined,
          yes: undefined
        });
        expect(result.content[0].text).toContain('Workflow shipped successfully');
        expect(result.content[0].text).toContain('Pushed to remote');
        expect(result.content[0].text).toContain('Pull request created');
        expect(result.content[0].text).not.toContain('Merged to main');
      });
    });

    describe('hansolo_abort', () => {
      it('should execute abort command with options', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        (AbortCommand as jest.MockedClass<typeof AbortCommand>).mockImplementation(
          () => ({
            execute: mockExecute,
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_abort', {
          branchName: 'feature/test',
          deleteBranch: true,
          yes: true
        });
        
        expect(mockExecute).toHaveBeenCalledWith({
          branchName: 'feature/test',
          deleteBranch: true,
          yes: true,
          force: undefined
        });
        expect(result.content[0].text).toContain('Aborted workflow on branch: feature/test');
        expect(result.content[0].text).toContain('Branch was deleted');
      });
    });

    describe('hansolo_status', () => {
      it('should show current session status', async () => {
        const mockSession = {
          branchName: 'feature/current',
          workflowType: 'launch',
          currentState: 'CHANGES_COMMITTED',
          id: 'session-123',
          getAge: () => '3 hours',
          isActive: () => true
        };

        (GitOperations as jest.MockedClass<typeof GitOperations>).mockImplementation(
          () => ({
            getCurrentBranch: jest.fn().mockResolvedValue('feature/current'),
          } as any)
        );

        (SessionRepository as jest.MockedClass<typeof SessionRepository>).mockImplementation(
          () => ({
            getSessionByBranch: jest.fn().mockResolvedValue(mockSession),
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_status', {});
        
        expect(result.content[0].text).toContain('Current Workflow Status');
        expect(result.content[0].text).toContain('Branch: feature/current');
        expect(result.content[0].text).toContain('Type: launch');
        expect(result.content[0].text).toContain('State: CHANGES_COMMITTED');
        expect(result.content[0].text).toContain('Active: Yes ✓');
      });

      it('should handle no active session', async () => {
        (GitOperations as jest.MockedClass<typeof GitOperations>).mockImplementation(
          () => ({
            getCurrentBranch: jest.fn().mockResolvedValue('main'),
          } as any)
        );

        (SessionRepository as jest.MockedClass<typeof SessionRepository>).mockImplementation(
          () => ({
            getSessionByBranch: jest.fn().mockResolvedValue(null),
          } as any)
        );

        const result = await (server as any).executeCommand('hansolo_status', {});
        
        expect(result.content[0].text).toContain('No active workflow session');
        expect(result.content[0].text).toContain('hansolo/launch');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors gracefully', async () => {
      (InitCommand as jest.MockedClass<typeof InitCommand>).mockImplementation(
        () => ({
          execute: jest.fn().mockRejectedValue(new Error('Init failed')),
        } as any)
      );

      const result = await (server as any).executeCommand('hansolo_init', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Init failed');
      expect(result.content[0].text).toContain('hansolo/status');
    });

    it('should handle unknown commands', async () => {
      const result = await (server as any).executeCommand('unknown_command', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown command: unknown_command');
    });

    it('should validate input parameters', async () => {
      const result = await (server as any).executeCommand('hansolo_init', {
        scope: 'invalid_scope'
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('Command Name Normalization', () => {
    it('should handle both tool and prompt naming conventions', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      (InitCommand as jest.MockedClass<typeof InitCommand>).mockImplementation(
        () => ({
          execute: mockExecute,
        } as any)
      );

      // Test with underscore (tool naming)
      await (server as any).executeCommand('hansolo_init', {});
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Test with slash (prompt naming)
      await (server as any).executeCommand('hansolo/init', {});
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });
});