"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const console_output_1 = require("../ui/console-output");
const progress_indicators_1 = require("../ui/progress-indicators");
const configuration_manager_1 = require("../services/configuration-manager");
const session_repository_1 = require("../services/session-repository");
const git_operations_1 = require("../services/git-operations");
const mcp_config_service_1 = require("../services/mcp-config-service");
const installation_strategy_1 = require("../services/installation-strategy");
const hooks_strategy_1 = require("../services/hooks-strategy");
const inquirer_1 = __importDefault(require("inquirer"));
class InitCommand {
    output = new console_output_1.ConsoleOutput();
    progress = new progress_indicators_1.WorkflowProgress();
    configManager;
    sessionRepo;
    gitOps;
    mcpConfigService;
    installationStrategy;
    hooksStrategy;
    constructor(basePath = '.hansolo') {
        this.configManager = new configuration_manager_1.ConfigurationManager(basePath);
        this.sessionRepo = new session_repository_1.SessionRepository(basePath);
        this.gitOps = new git_operations_1.GitOperations();
        this.mcpConfigService = new mcp_config_service_1.MCPConfigService();
        this.installationStrategy = new installation_strategy_1.InstallationStrategyService();
        this.hooksStrategy = new hooks_strategy_1.HooksStrategyService();
    }
    async execute(options = {}) {
        this.output.printLogo();
        this.output.header('Initializing han-solo');
        try {
            // Check if already initialized
            if (!options.force && await this.configManager.isInitialized()) {
                this.output.warningMessage('han-solo is already initialized in this project');
                this.output.infoMessage('Use --force to reinitialize');
                return;
            }
            const steps = [
                {
                    name: 'Checking Git repository',
                    action: async () => await this.checkGitRepository(),
                },
                {
                    name: 'Creating configuration',
                    action: async () => await this.createConfiguration(),
                },
                {
                    name: 'Setting up directories',
                    action: async () => await this.setupDirectories(),
                },
                {
                    name: 'Installing Git hooks',
                    action: async () => await this.installHooks(),
                },
                {
                    name: 'Creating CLAUDE.md guidance',
                    action: async () => await this.createClaudeGuidance(),
                },
                {
                    name: 'Configuring MCP server',
                    action: async () => await this.configureMCPServer(),
                },
                {
                    name: 'Creating templates',
                    action: async () => await this.createTemplates(),
                },
            ];
            if (options.createRemote) {
                steps.push({
                    name: 'Setting up remote repository',
                    action: async () => await this.setupRemote(options.gitPlatform || 'github'),
                });
            }
            await this.progress.runSteps(steps);
            this.output.newline();
            this.output.box('han-solo has been successfully initialized!\n\n' +
                'Available commands:\n' +
                '  /hansolo:launch  - Start a new feature\n' +
                '  /hansolo:ship    - Ship your changes\n' +
                '  /hansolo:status  - Check workflow status\n' +
                '  /hansolo:help    - Show all commands', '✨ Setup Complete');
            this.output.successMessage('Ready to enforce linear history!');
        }
        catch (error) {
            this.output.errorMessage(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async checkGitRepository() {
        const isGitRepo = await this.gitOps.isInitialized();
        if (!isGitRepo) {
            await this.gitOps.init();
            this.output.dim('Git repository initialized');
        }
        else {
            this.output.dim('Git repository found');
        }
        // Check current branch
        const currentBranch = await this.gitOps.getCurrentBranch();
        if (currentBranch !== 'main' && currentBranch !== 'master') {
            this.output.warningMessage(`Currently on branch '${currentBranch}'. Consider switching to main branch.`);
        }
    }
    async createConfiguration() {
        const config = await this.configManager.initialize();
        this.output.dim(`Configuration created: v${config.version}`);
    }
    async setupDirectories() {
        await this.sessionRepo.initialize();
        this.output.dim('Directory structure created');
    }
    async installHooks() {
        const installType = this.installationStrategy.detectInstallationType();
        const isGlobal = installType === 'global';
        // Prompt for hooks configuration
        const hooksConfig = await this.hooksStrategy.promptForHookConfiguration(isGlobal);
        // Install hooks based on configuration
        await this.hooksStrategy.installHooks(hooksConfig);
        this.output.dim(`Git hooks installed (${hooksConfig.scope} scope)`);
    }
    async createClaudeGuidance() {
        await this.configManager.installClaudeGuidance();
        this.output.dim('CLAUDE.md guidance created');
    }
    async configureMCPServer() {
        const installType = this.installationStrategy.detectInstallationType();
        if (installType === 'npx') {
            this.output.dim('MCP configuration skipped (npx execution)');
            return;
        }
        const hasClaudeCode = await this.installationStrategy.hasClaudeCode();
        if (!hasClaudeCode) {
            this.output.dim('Claude Code not detected - skipping MCP configuration');
            return;
        }
        // Check if already configured
        const configured = await this.mcpConfigService.isMCPConfigured();
        if (configured.user || configured.project) {
            this.output.dim('MCP server already configured');
            return;
        }
        // Prompt for MCP configuration
        const { configureMCP } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'configureMCP',
                message: 'Configure han-solo MCP server for Claude Code?',
                default: true,
            },
        ]);
        if (!configureMCP) {
            this.output.dim('MCP configuration skipped');
            return;
        }
        // Determine scope based on installation type
        let scope = 'project';
        if (installType === 'global') {
            scope = 'user';
        }
        else {
            const { mcpScope } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'mcpScope',
                    message: 'Configure MCP server for:',
                    choices: [
                        { name: 'Team (project .mcp.json)', value: 'project' },
                        { name: 'Just me (user config)', value: 'user' },
                        { name: 'Both', value: 'both' },
                    ],
                    default: 'project',
                },
            ]);
            scope = mcpScope;
        }
        // Configure MCP
        await this.mcpConfigService.configureMCP({
            installationType: installType,
            scope,
        });
        this.output.dim(`MCP server configured (${scope} scope)`);
    }
    async createTemplates() {
        await this.configManager.installTemplates();
        this.output.dim('Templates created');
    }
    async setupRemote(platform) {
        const remoteUrl = await this.gitOps.getRemoteUrl();
        if (remoteUrl) {
            this.output.dim(`Remote repository already configured: ${remoteUrl}`);
            return;
        }
        // This would integrate with GitHub/GitLab API to create the repo
        // For now, just show a message
        this.output.warningMessage(`Manual step required: Create repository on ${platform}`);
        this.output.dim('Run: git remote add origin <repository-url>');
    }
    async validate() {
        try {
            await this.configManager.validate();
            this.output.successMessage('Configuration is valid');
            return true;
        }
        catch (error) {
            this.output.errorMessage(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    async showStatus() {
        const isInitialized = await this.configManager.isInitialized();
        if (!isInitialized) {
            this.output.errorMessage('han-solo is not initialized in this project');
            this.output.dim('Run "/hansolo:init" to get started');
            return;
        }
        const config = await this.configManager.load();
        this.output.header('han-solo Status');
        const statusData = [
            ['Version', config.version],
            ['Scope', config.scope],
            ['Install Path', config.getInstallPath()],
            ['Initialized', config.initialized ? '✅' : '❌'],
        ];
        this.output.table(['Property', 'Value'], statusData);
        this.output.subheader('Components');
        const componentData = Object.entries(config.components).map(([name, enabled]) => [
            name,
            enabled ? '✅ Enabled' : '❌ Disabled',
        ]);
        this.output.table(['Component', 'Status'], componentData);
        const sessions = await this.sessionRepo.listSessions();
        if (sessions.length > 0) {
            this.output.subheader('Active Sessions');
            sessions.forEach(session => {
                console.log(this.output.formatSession({
                    id: session.id,
                    branchName: session.branchName,
                    workflowType: session.workflowType,
                    currentState: session.currentState,
                    age: session.getAge(),
                }));
            });
        }
        else {
            this.output.dim('No active sessions');
        }
    }
}
exports.InitCommand = InitCommand;
//# sourceMappingURL=hansolo-init.js.map