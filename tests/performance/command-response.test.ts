import { performance } from 'perf_hooks';
import { CommandRegistry } from '../../src/commands/command-registry';
import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';

describe('Command Response Performance', () => {
  let commandRegistry: CommandRegistry;
  let mcpServer: MCPServer;
  const MAX_RESPONSE_TIME = 100; // 100ms requirement

  beforeAll(async () => {
    // Initialize components
    commandRegistry = new CommandRegistry();
    mcpServer = new MCPServer();
    await mcpServer.start({ port: 0 }); // Random port
  });

  afterAll(async () => {
    await mcpServer.stop();
  });

  describe('Command Execution Performance', () => {
    it('should execute status command within 100ms', async () => {
      const start = performance.now();

      await commandRegistry.execute('status', {});

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });

    it('should execute sessions command within 100ms', async () => {
      const start = performance.now();

      await commandRegistry.execute('sessions', {});

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });

    it('should execute validate command within 100ms', async () => {
      const start = performance.now();

      await commandRegistry.execute('validate', {});

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });

    it('should handle config command within 100ms', async () => {
      const start = performance.now();

      await commandRegistry.execute('config', { key: 'defaults.autoRebase' });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });
  });

  describe('MCP Tool Performance', () => {
    it('should respond to get_sessions_status within 100ms', async () => {
      const start = performance.now();

      const response = await mcpServer.callTool('get_sessions_status', {});

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
      expect(response).toBeDefined();
    });

    it('should respond to validate_environment within 100ms', async () => {
      const start = performance.now();

      const response = await mcpServer.callTool('validate_environment', {});

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
      expect(response).toBeDefined();
    });

    it('should respond to manage_status_line within 100ms', async () => {
      const start = performance.now();

      const response = await mcpServer.callTool('manage_status_line', {
        action: 'get'
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });
  });

  describe('Workflow State Transitions', () => {
    it('should transition states within 100ms', async () => {
      const sessionId = 'perf-test-session';

      // Start workflow
      await mcpServer.callTool('start_workflow', {
        workflow: 'launch',
        branch: 'feature/perf-test'
      });

      // Measure state transition
      const start = performance.now();

      await mcpServer.callTool('execute_workflow_step', {
        sessionId,
        action: 'CREATE_BRANCH'
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });

    it('should validate state transitions within 100ms', async () => {
      const start = performance.now();

      const isValid = await mcpServer.validateTransition(
        'INIT',
        'BRANCH_READY',
        'launch'
      );

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
      expect(isValid).toBeDefined();
    });
  });

  describe('Concurrent Command Performance', () => {
    it('should handle 10 concurrent status commands', async () => {
      const commands = Array(10).fill(null).map(() =>
        commandRegistry.execute('status', {})
      );

      const start = performance.now();

      await Promise.all(commands);

      const duration = performance.now() - start;

      // Allow more time for concurrent execution, but still reasonable
      expect(duration).toBeLessThan(MAX_RESPONSE_TIME * 3);
    });

    it('should handle mixed concurrent commands', async () => {
      const commands = [
        commandRegistry.execute('status', {}),
        commandRegistry.execute('sessions', {}),
        commandRegistry.execute('validate', {}),
        commandRegistry.execute('config', {}),
      ];

      const start = performance.now();

      await Promise.all(commands);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME * 2);
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached responses faster on second call', async () => {
      // First call - cold cache
      const cold_start = performance.now();
      await commandRegistry.execute('status', {});
      const cold_duration = performance.now() - cold_start;

      // Second call - warm cache
      const warm_start = performance.now();
      await commandRegistry.execute('status', {});
      const warm_duration = performance.now() - warm_start;

      // Warm cache should be at least 50% faster
      expect(warm_duration).toBeLessThan(cold_duration * 0.5);
      expect(warm_duration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly', async () => {
      const start = performance.now();

      try {
        await commandRegistry.execute('invalid-command', {});
      } catch (error) {
        // Expected error
      }

      const duration = performance.now() - start;

      // Error handling should also be fast
      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });

    it('should handle validation errors quickly', async () => {
      const start = performance.now();

      try {
        await mcpServer.callTool('start_workflow', {
          workflow: 'invalid-workflow',
          branch: ''
        });
      } catch (error) {
        // Expected validation error
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
    });
  });

  describe('Performance Regression Tests', () => {
    const performanceBaseline = {
      status: 50,
      sessions: 60,
      validate: 70,
      config: 40,
      state_transition: 30,
    };

    it('should not regress from baseline performance', async () => {
      const results: Record<string, number> = {};

      // Test each command
      for (const [command, baseline] of Object.entries(performanceBaseline)) {
        const start = performance.now();

        if (command === 'state_transition') {
          await mcpServer.validateTransition('INIT', 'BRANCH_READY', 'launch');
        } else {
          await commandRegistry.execute(command, {});
        }

        results[command] = performance.now() - start;

        // Allow 20% variance from baseline
        expect(results[command]).toBeLessThan(baseline * 1.2);
      }

      // Log results for tracking
      console.log('Performance test results:', results);
    });
  });
});