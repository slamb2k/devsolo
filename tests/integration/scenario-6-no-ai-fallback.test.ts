import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: No-AI Fallback Scenario', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join('/tmp', 'hansolo-no-ai-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    sessionRepo = new SessionRepository();
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    server = new MCPServer(sessionRepo);

    await gitOps.init();
    await gitOps.setConfig('user.name', 'Manual User');
    await gitOps.setConfig('user.email', 'manual@example.com');

    await fs.writeFile(path.join(testProjectPath, 'README.md'), '# No-AI Test\n');
    await gitOps.add('.');
    await gitOps.commit('Initial commit');

    await server.handleToolCall('configure_workflow', {
      projectPath: testProjectPath,
      defaultBranch: 'main',
      settings: {
        aiEnabled: false,  // Disable AI assistance
        manualMode: true
      }
    });
  });

  afterEach(async () => {
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Manual Workflow Execution', () => {
    it('should complete launch workflow without AI assistance', async () => {
      // Start workflow manually
      const startResult = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/manual-feature',
        metadata: {
          aiAssisted: false
        }
      });
      expect(startResult.success).toBe(true);
      const sessionId = startResult.session.id;

      // Create branch manually
      await server.handleToolCall('create_branch', {
        branchName: 'feature/manual-feature',
        sessionId: sessionId
      });

      // Make changes manually
      await fs.writeFile(
        path.join(testProjectPath, 'manual.js'),
        '// Manually written code\nexport function manual() { return true; }'
      );
      await gitOps.add('.');

      // Provide manual commit message
      const manualCommitMessage = 'feat: add manual feature implementation';
      await gitOps.commit(manualCommitMessage);

      // Update workflow state
      const commitResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'commit',
        metadata: {
          commitMessage: manualCommitMessage,
          manuallyProvided: true
        }
      });

      expect(commitResult.success).toBe(true);
      expect(commitResult.metadata.manuallyProvided).toBe(true);

      // Push manually
      const pushResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'push',
        metadata: {
          manual: true
        }
      });

      expect(pushResult.success).toBe(true);
      expect(pushResult.newState).toBe('PUSHED');
    });

    it('should create PR with manual description', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/manual-pr'
      });

      // Progress to PR creation
      session.currentState = 'PUSHED';

      // Provide manual PR details
      const prResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'create_pr',
        metadata: {
          title: 'Manual PR: Implement new feature',
          description: `## Description
          This PR implements the new feature as discussed.

          ## Changes
          - Added new functionality
          - Updated tests
          - Fixed related bugs

          ## Testing
          - Unit tests pass
          - Manual testing completed`,
          manuallyWritten: true,
          aiGenerated: false
        }
      });

      expect(prResult.success).toBe(true);
      expect(prResult.metadata.manuallyWritten).toBe(true);
      expect(prResult.metadata.aiGenerated).toBe(false);
    });
  });

  describe('AI Degradation Handling', () => {
    it('should fall back to manual mode on AI failure', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/ai-fallback'
      });

      // Simulate AI service failure
      const mockAiService = {
        generateCommitMessage: jest.fn().mockRejectedValue(new Error('AI service unavailable')),
        generatePRDescription: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      };

      // Attempt to use AI for commit message
      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'generate_commit_message',
        metadata: {
          useAI: true,
          filesChanged: ['feature.js', 'test.js']
        }
      });

      expect(result.success).toBe(true);
      expect(result.fallbackToManual).toBe(true);
      expect(result.prompt).toContain('Please provide commit message manually');
    });

    it('should provide manual input prompts when AI unavailable', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/manual-prompts'
      });

      session.metadata.aiAvailable = false;

      // Request PR description
      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'prepare_pr',
        metadata: {
          requestAI: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.manualInputRequired).toBe(true);
      expect(result.prompts).toEqual({
        title: 'Enter PR title',
        description: 'Enter PR description',
        testPlan: 'Describe testing approach'
      });
    });

    it('should cache manual inputs for reuse', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/cache-inputs'
      });

      // Provide manual input
      const firstInput = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'provide_input',
        metadata: {
          inputType: 'commit_message',
          value: 'feat: cached commit message',
          cacheForReuse: true
        }
      });

      expect(firstInput.success).toBe(true);
      expect(firstInput.cached).toBe(true);

      // Reuse cached input
      const reuseInput = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'get_cached_input',
        metadata: {
          inputType: 'commit_message'
        }
      });

      expect(reuseInput.success).toBe(true);
      expect(reuseInput.value).toBe('feat: cached commit message');
    });
  });

  describe('Template-based Workflows', () => {
    it('should use commit message templates', async () => {
      // Configure templates
      await configManager.setWorkflowConfig('launch', {
        templates: {
          commit: {
            feat: 'feat: {{description}}',
            fix: 'fix: {{description}}',
            chore: 'chore: {{description}}'
          }
        }
      });

      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/template-commit'
      });

      // Use template for commit
      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'commit_with_template',
        metadata: {
          template: 'feat',
          values: {
            description: 'implement user authentication'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.commitMessage).toBe('feat: implement user authentication');
    });

    it('should use PR description templates', async () => {
      // Configure PR template
      const prTemplate = `## Summary
{{summary}}

## Changes
{{changes}}

## Test Plan
{{testPlan}}

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes`;

      await configManager.setWorkflowConfig('ship', {
        templates: {
          pr: prTemplate
        }
      });

      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/template-pr'
      });

      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'create_pr_from_template',
        metadata: {
          values: {
            summary: 'Implements new feature X',
            changes: '- Added feature X\n- Updated related tests',
            testPlan: 'Unit tests cover all new functionality'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.prDescription).toContain('Implements new feature X');
      expect(result.prDescription).toContain('- Added feature X');
      expect(result.prDescription).toContain('Unit tests cover all new functionality');
    });
  });

  describe('Interactive Mode', () => {
    it('should prompt for decisions at key points', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/interactive',
        metadata: {
          interactive: true
        }
      });

      // Simulate decision point
      session.currentState = 'APPROVED';

      const decisionResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'request_decision',
        metadata: {
          question: 'Ready to merge?',
          options: ['Yes, merge now', 'No, wait for more approvals', 'Cancel']
        }
      });

      expect(decisionResult.success).toBe(true);
      expect(decisionResult.requiresUserInput).toBe(true);
      expect(decisionResult.options).toHaveLength(3);
    });

    it('should validate manual input', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/validate-input'
      });

      // Provide invalid branch name
      let result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'provide_branch_name',
        metadata: {
          value: 'invalid branch name', // Contains spaces
          manual: true
        }
      });

      expect(result.success).toBe(false);
      expect(result.validation.errors).toContain('Invalid branch name format');

      // Provide valid branch name
      result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'provide_branch_name',
        metadata: {
          value: 'feature/valid-name',
          manual: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
    });
  });

  describe('Manual State Recovery', () => {
    it('should provide manual recovery options on errors', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/manual-recovery'
      });

      // Simulate deployment failure
      session.currentState = 'DEPLOYING_TO_PRODUCTION';

      const errorResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'deployment_failed',
        error: {
          message: 'Deployment failed',
          code: 'DEPLOY_ERROR'
        }
      });

      expect(errorResult.success).toBe(true);
      expect(errorResult.manualRecoveryOptions).toBeDefined();
      expect(errorResult.manualRecoveryOptions).toEqual([
        { action: 'retry', description: 'Retry deployment' },
        { action: 'rollback', description: 'Rollback to previous version' },
        { action: 'investigate', description: 'Investigate and fix manually' },
        { action: 'abort', description: 'Abort hotfix workflow' }
      ]);
    });

    it('should execute manual recovery actions', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/recovery-test'
      });

      session.currentState = 'ERROR';
      session.metadata.errorType = 'merge_conflict';

      // Choose manual resolution
      const recoveryResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'manual_recovery',
        metadata: {
          recoveryAction: 'resolve_manually',
          steps: [
            'Checkout branch',
            'Resolve conflicts in editor',
            'Stage resolved files',
            'Continue rebase'
          ]
        }
      });

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.recoverySteps).toHaveLength(4);
      expect(recoveryResult.nextAction).toBe('verify_resolution');
    });
  });

  describe('Deterministic Workflow Completion', () => {
    it('should complete workflow deterministically without AI', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/deterministic',
        metadata: {
          aiEnabled: false,
          deterministicMode: true
        }
      });

      // Define all steps manually
      const steps = [
        { action: 'create_branch', state: 'BRANCH_READY' },
        { action: 'make_changes', state: 'CHANGES_MADE' },
        { action: 'commit', state: 'CHANGES_COMMITTED' },
        { action: 'push', state: 'PUSHED' },
        { action: 'complete', state: 'COMPLETE' }
      ];

      // Execute each step deterministically
      for (const step of steps) {
        const result = await server.handleToolCall('execute_workflow_step', {
          sessionId: session.id,
          action: step.action,
          metadata: {
            deterministic: true,
            expectedState: step.state
          }
        });

        expect(result.success).toBe(true);
        expect(result.newState).toBe(step.state);
      }

      // Verify workflow completed
      const finalStatus = await server.handleToolCall('get_sessions_status', {
        sessionId: session.id
      });

      expect(finalStatus.session.currentState).toBe('COMPLETE');
      expect(finalStatus.session.metadata.completedWithoutAI).toBe(true);
    });

    it('should validate state transitions without AI', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/validate-transitions'
      });

      // Try invalid transition
      session.currentState = 'INIT';

      const invalidResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'merge', // Cannot merge from INIT
        metadata: {
          force: false
        }
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Invalid transition');
      expect(invalidResult.allowedTransitions).toBeDefined();

      // Execute valid transition
      const validResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'validate',
        metadata: {
          manualValidation: true
        }
      });

      expect(validResult.success).toBe(true);
      expect(validResult.newState).toBe('VALIDATING');
    });
  });
});