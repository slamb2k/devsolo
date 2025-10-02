"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchCommand = void 0;
const console_output_1 = require("../ui/console-output");
const progress_indicators_1 = require("../ui/progress-indicators");
const configuration_manager_1 = require("../services/configuration-manager");
const session_repository_1 = require("../services/session-repository");
const git_operations_1 = require("../services/git-operations");
const workflow_session_1 = require("../models/workflow-session");
const launch_workflow_1 = require("../state-machines/launch-workflow");
// import { TemplateManager } from '../templates/workflow-templates'; // For future use
class LaunchCommand {
    output = new console_output_1.ConsoleOutput();
    progress = new progress_indicators_1.WorkflowProgress();
    configManager;
    sessionRepo;
    gitOps;
    stateMachine;
    // private templateManager: TemplateManager; // For future template support
    constructor(basePath = '.hansolo') {
        this.configManager = new configuration_manager_1.ConfigurationManager(basePath);
        this.sessionRepo = new session_repository_1.SessionRepository(basePath);
        this.gitOps = new git_operations_1.GitOperations();
        this.stateMachine = new launch_workflow_1.LaunchWorkflowStateMachine();
        // this.templateManager = new TemplateManager(); // For future template support
    }
    async execute(options = {}) {
        this.output.header('🚀 Launching New Feature Workflow');
        try {
            // Check initialization
            if (!await this.configManager.isInitialized()) {
                this.output.errorMessage('han-solo is not initialized');
                this.output.infoMessage('Run "hansolo init" first');
                return;
            }
            // Check for clean working directory
            if (!await this.gitOps.isClean() && !options.force) {
                this.output.errorMessage('Working directory has uncommitted changes');
                this.output.infoMessage('Commit or stash your changes first, or use --force');
                return;
            }
            // Check current branch
            const currentBranch = await this.gitOps.getCurrentBranch();
            if (currentBranch !== 'main' && currentBranch !== 'master') {
                this.output.warningMessage(`Currently on branch '${currentBranch}'`);
                if (!options.force) {
                    this.output.infoMessage('Switch to main branch or use --force');
                    return;
                }
            }
            // Check for existing session on current branch
            const existingSession = await this.sessionRepo.getSessionByBranch(currentBranch);
            if (existingSession && existingSession.isActive()) {
                this.output.errorMessage(`Active session already exists on branch '${currentBranch}'`);
                this.output.infoMessage('Use "hansolo status" to see active sessions');
                return;
            }
            // Generate branch name if not provided
            const branchName = options.branchName || this.generateBranchName(options.description);
            // Validate branch name
            if (!this.isValidBranchName(branchName)) {
                this.output.errorMessage(`Invalid branch name: ${branchName}`);
                this.output.infoMessage('Branch names must follow Git naming conventions');
                return;
            }
            // Check if branch already exists
            const branches = await this.gitOps.listBranches();
            if (branches.includes(branchName)) {
                this.output.errorMessage(`Branch '${branchName}' already exists`);
                this.output.infoMessage('Choose a different branch name');
                return;
            }
            // Execute launch workflow steps
            const steps = [
                {
                    name: 'Creating workflow session',
                    action: async () => await this.createSession(branchName),
                },
                {
                    name: 'Creating feature branch',
                    action: async () => await this.createBranch(branchName),
                },
                {
                    name: 'Setting up workflow environment',
                    action: async () => await this.setupEnvironment(branchName),
                },
                {
                    name: 'Initializing state machine',
                    action: async () => await this.initializeStateMachine(branchName),
                },
            ];
            const results = await this.progress.runSteps(steps);
            const session = results[0];
            this.output.newline();
            this.output.successMessage('Feature workflow launched successfully!');
            // Display session info
            this.output.box(`Session ID: ${session.id.substring(0, 8)}\n` +
                `Branch: ${session.branchName}\n` +
                `State: ${this.output.formatState(session.currentState)}\n` +
                `Type: ${session.workflowType}\n\n` +
                'Next steps:\n' +
                '1. Make your changes\n' +
                '2. Run "hansolo ship" to complete the workflow', '✨ Workflow Ready');
            // Show status
            await this.showStatus(session);
        }
        catch (error) {
            this.output.errorMessage(`Launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    generateBranchName(description) {
        const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const prefix = 'feature';
        if (description) {
            // Convert description to branch-friendly format
            const sanitized = description
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 30);
            return `${prefix}/${timestamp}-${sanitized}`;
        }
        return `${prefix}/${timestamp}-new-feature`;
    }
    isValidBranchName(name) {
        // Cannot be protected branches
        const protectedBranches = ['main', 'master', 'develop'];
        if (protectedBranches.includes(name)) {
            return false;
        }
        // Must follow Git naming rules
        const validBranchRegex = /^[^/][\w\-./]+$/;
        if (!validBranchRegex.test(name)) {
            return false;
        }
        // Cannot have spaces
        if (name.includes(' ')) {
            return false;
        }
        return true;
    }
    async createSession(branchName) {
        const session = new workflow_session_1.WorkflowSession({
            workflowType: 'launch',
            branchName,
            metadata: {
                projectPath: process.cwd(),
                userName: await this.gitOps.getConfig('user.name') || 'unknown',
                userEmail: await this.gitOps.getConfig('user.email') || 'unknown',
            },
        });
        await this.sessionRepo.createSession(session);
        return session;
    }
    async createBranch(branchName) {
        await this.gitOps.createBranch(branchName, 'main');
        this.output.dim(`Created and checked out branch: ${branchName}`);
    }
    async setupEnvironment(_branchName) {
        // Set up any branch-specific configuration
        await this.configManager.load();
        // You could add branch-specific settings here
        this.output.dim('Workflow environment configured');
    }
    async initializeStateMachine(branchName) {
        const session = await this.sessionRepo.getSessionByBranch(branchName);
        if (!session) {
            throw new Error('Session not found after creation');
        }
        // Transition to BRANCH_READY state
        await this.stateMachine.transition('INIT', 'BRANCH_READY');
        session.transitionTo('BRANCH_READY');
        await this.sessionRepo.updateSession(session.id, session);
        this.output.dim('State machine initialized: BRANCH_READY');
    }
    async showStatus(session) {
        this.output.subheader('Current Status');
        const gitStatus = await this.gitOps.getBranchStatus();
        const statusData = [
            ['Session ID', session.id.substring(0, 8)],
            ['Branch', session.branchName],
            ['State', session.currentState],
            ['Clean', gitStatus.isClean ? '✅' : '❌'],
            ['Ahead', gitStatus.ahead.toString()],
            ['Behind', gitStatus.behind.toString()],
        ];
        this.output.table(['Property', 'Value'], statusData);
        // Show next actions
        const nextActions = this.stateMachine.getAllowedActions(session.currentState);
        if (nextActions.length > 0) {
            this.output.subheader('Available Actions');
            this.output.list(nextActions.map(action => `hansolo ${action}`));
        }
    }
    async resume(branchName) {
        this.output.header('📂 Resuming Workflow');
        try {
            // Find session
            let session = null;
            if (branchName) {
                session = await this.sessionRepo.getSessionByBranch(branchName);
            }
            else {
                const currentBranch = await this.gitOps.getCurrentBranch();
                session = await this.sessionRepo.getSessionByBranch(currentBranch);
            }
            if (!session) {
                this.output.errorMessage('No workflow session found');
                this.output.infoMessage('Use "hansolo launch" to start a new workflow');
                return;
            }
            if (!session.canResume()) {
                if (session.isExpired()) {
                    this.output.errorMessage('Session has expired');
                }
                else {
                    this.output.errorMessage('Session is not resumable');
                }
                return;
            }
            // Switch to branch if needed
            const currentBranch = await this.gitOps.getCurrentBranch();
            if (currentBranch !== session.branchName) {
                await this.progress.gitOperation('checkout', async () => {
                    await this.gitOps.checkoutBranch(session.branchName);
                });
            }
            this.output.successMessage(`Resumed workflow on branch: ${session.branchName}`);
            await this.showStatus(session);
        }
        catch (error) {
            this.output.errorMessage(`Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
}
exports.LaunchCommand = LaunchCommand;
//# sourceMappingURL=hansolo-launch.js.map