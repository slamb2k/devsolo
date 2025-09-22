import { MCPServer } from '../../src/mcp-server/server';
import { StatusLineManager } from '../../src/services/status-line-manager';
import { SessionRepository } from '../../src/services/session-repository';

describe('manage_status_line MCP Tool', () => {
  let server: MCPServer;
  let statusManager: StatusLineManager;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    sessionRepo = new SessionRepository();
    statusManager = new StatusLineManager(sessionRepo);
    server = new MCPServer();
  });

  describe('Tool Registration', () => {
    it('should register manage_status_line tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'manage_status_line');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Manage terminal status line');
    });

    it('should define required parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'manage_status_line');
      expect(tool?.inputSchema.required).toContain('action');
    });
  });

  describe('Status Line Operations', () => {
    it('should enable status line', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'enable',
        format: 'default'
      });

      expect(result.success).toBe(true);
      expect(result.statusLine.enabled).toBe(true);
      expect(result.statusLine.format).toBe('default');
    });

    it('should disable status line', async () => {
      await server.handleToolCall('manage_status_line', {
        action: 'enable'
      });

      const result = await server.handleToolCall('manage_status_line', {
        action: 'disable'
      });

      expect(result.success).toBe(true);
      expect(result.statusLine.enabled).toBe(false);
    });

    it('should update status line content', async () => {
      await server.handleToolCall('manage_status_line', {
        action: 'enable'
      });

      const result = await server.handleToolCall('manage_status_line', {
        action: 'update',
        content: {
          workflow: 'launch',
          branch: 'feature-123',
          state: 'CHANGES_COMMITTED'
        }
      });

      expect(result.success).toBe(true);
      expect(result.statusLine.content.workflow).toBe('launch');
      expect(result.statusLine.content.branch).toBe('feature-123');
      expect(result.statusLine.content.state).toBe('CHANGES_COMMITTED');
    });

    it('should support different status line formats', async () => {
      const formats = ['minimal', 'default', 'verbose'];

      for (const format of formats) {
        const result = await server.handleToolCall('manage_status_line', {
          action: 'enable',
          format: format
        });

        expect(result.success).toBe(true);
        expect(result.statusLine.format).toBe(format);
      }
    });

    it('should refresh status line', async () => {
      await server.handleToolCall('manage_status_line', {
        action: 'enable'
      });

      const result = await server.handleToolCall('manage_status_line', {
        action: 'refresh'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('refreshed');
    });
  });

  describe('Status Line Content', () => {
    it('should display session information', async () => {
      const session = {
        id: 'test-session',
        workflowType: 'ship',
        branch: 'main',
        status: 'active',
        currentState: 'PR_CREATED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);
      await sessionRepo.setCurrentSession('test-session');

      const result = await server.handleToolCall('manage_status_line', {
        action: 'update'
      });

      expect(result.statusLine.content.sessionId).toBe('test-session');
      expect(result.statusLine.content.workflow).toBe('ship');
      expect(result.statusLine.content.branch).toBe('main');
      expect(result.statusLine.content.state).toBe('PR_CREATED');
    });

    it('should include timestamps in verbose mode', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'enable',
        format: 'verbose'
      });

      expect(result.statusLine.content.timestamp).toBeDefined();
      expect(result.statusLine.content.elapsed).toBeDefined();
    });

    it('should show minimal info in minimal mode', async () => {
      const session = {
        id: 'test',
        workflowType: 'launch',
        branch: 'feature',
        status: 'active',
        currentState: 'BRANCH_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);
      await sessionRepo.setCurrentSession('test');

      const result = await server.handleToolCall('manage_status_line', {
        action: 'enable',
        format: 'minimal'
      });

      expect(result.statusLine.content.branch).toBeDefined();
      expect(result.statusLine.content.state).toBeDefined();
      expect(result.statusLine.content.sessionId).toBeUndefined();
    });
  });

  describe('Color Schemes', () => {
    it('should support different color schemes', async () => {
      const schemes = ['default', 'dark', 'light', 'none'];

      for (const scheme of schemes) {
        const result = await server.handleToolCall('manage_status_line', {
          action: 'enable',
          colorScheme: scheme
        });

        expect(result.success).toBe(true);
        expect(result.statusLine.colorScheme).toBe(scheme);
      }
    });

    it('should use state-based colors', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'update',
        content: {
          state: 'ERROR'
        }
      });

      expect(result.statusLine.content.stateColor).toBe('red');
    });
  });

  describe('Validation', () => {
    it('should validate action parameter', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action');
    });

    it('should require content for update action', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'update'
      });

      // Should use current session content if no content provided
      expect(result.success).toBe(true);
    });

    it('should handle status line not enabled for update', async () => {
      const result = await server.handleToolCall('manage_status_line', {
        action: 'update',
        content: { state: 'NEW_STATE' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Status line not enabled');
    });
  });

  describe('Persistence', () => {
    it('should persist status line settings', async () => {
      await server.handleToolCall('manage_status_line', {
        action: 'enable',
        format: 'verbose',
        colorScheme: 'dark'
      });

      const settings = await statusManager.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.format).toBe('verbose');
      expect(settings.colorScheme).toBe('dark');
    });

    it('should restore settings on restart', async () => {
      await server.handleToolCall('manage_status_line', {
        action: 'enable',
        format: 'minimal'
      });

      // Simulate restart
      const newManager = new StatusLineManager(sessionRepo);
      const settings = await newManager.getSettings();

      expect(settings.format).toBe('minimal');
    });
  });
});