"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbortCommand = void 0;
const console_output_1 = require("../ui/console-output");
const progress_indicators_1 = require("../ui/progress-indicators");
const session_repository_1 = require("../services/session-repository");
const git_operations_1 = require("../services/git-operations");
const configuration_manager_1 = require("../services/configuration-manager");
const readline_1 = __importDefault(require("readline"));
class AbortCommand {
    output = new console_output_1.ConsoleOutput();
    progress = new progress_indicators_1.WorkflowProgress();
    sessionRepo;
    gitOps;
    configManager;
    constructor(basePath = '.hansolo') {
        this.sessionRepo = new session_repository_1.SessionRepository(basePath);
        this.gitOps = new git_operations_1.GitOperations();
        this.configManager = new configuration_manager_1.ConfigurationManager(basePath);
    }
    async execute(options = {}) {
        this.output.header('❌ Aborting Workflow');
        try {
            // Check initialization
            if (!await this.configManager.isInitialized()) {
                this.output.errorMessage('han-solo is not initialized');
                this.output.infoMessage('Run "hansolo init" first');
                return;
            }
            // Find session to abort
            let session = null;
            let branchName;
            if (options.branchName) {
                branchName = options.branchName;
                session = await this.sessionRepo.getSessionByBranch(branchName);
            }
            else {
                branchName = await this.gitOps.getCurrentBranch();
                session = await this.sessionRepo.getSessionByBranch(branchName);
            }
            if (!session) {
                this.output.errorMessage(`No session found for branch '${branchName}'`);
                return;
            }
            // Check if session can be aborted
            if (!session.isActive() && !options.force) {
                this.output.errorMessage(`Session is not active (state: ${session.currentState})`);
                this.output.infoMessage('Use --force to abort anyway');
                return;
            }
            // Check for uncommitted changes
            const currentBranch = await this.gitOps.getCurrentBranch();
            const isCurrentBranch = currentBranch === branchName;
            if (isCurrentBranch) {
                const hasChanges = await this.gitOps.hasUncommittedChanges();
                if (hasChanges && !options.force) {
                    this.output.warningMessage('Uncommitted changes detected');
                    const shouldStash = await this.confirmAction('Stash changes before aborting?', !options.yes);
                    if (shouldStash) {
                        await this.stashChanges(branchName);
                    }
                    else if (!await this.confirmAction('Discard uncommitted changes?', !options.yes)) {
                        this.output.infoMessage('Abort cancelled');
                        return;
                    }
                }
            }
            // Confirm abort action
            if (!options.yes) {
                this.output.warningMessage('This will abort the workflow and mark the session as cancelled');
                if (options.deleteBranch) {
                    this.output.warningMessage(`This will also DELETE the branch '${branchName}'`);
                }
                const confirmed = await this.confirmAction(`Are you sure you want to abort the workflow on '${branchName}'?`, true);
                if (!confirmed) {
                    this.output.infoMessage('Abort cancelled');
                    return;
                }
            }
            // Perform abort
            await this.performAbort(session, branchName, isCurrentBranch, options.deleteBranch);
            this.output.successMessage('Workflow aborted successfully');
            // Show summary
            this.showAbortSummary(session, options.deleteBranch);
        }
        catch (error) {
            this.output.errorMessage(`Abort failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async confirmAction(message, ask = true) {
        if (!ask) {
            return true;
        }
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => {
            rl.question(`${message} (y/n): `, answer => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }
    async stashChanges(branchName) {
        const stashResult = await this.gitOps.stashChanges(`han-solo abort stash for ${branchName}`);
        this.output.successMessage(`Changes stashed: ${stashResult.stashRef}`);
    }
    async performAbort(session, branchName, isCurrentBranch, deleteBranch) {
        const steps = [];
        // Mark session as aborted
        steps.push({
            name: 'Marking session as aborted',
            action: async () => {
                session.transitionTo('ABORTED', 'abort_command', {
                    reason: 'User requested abort',
                    timestamp: new Date().toISOString(),
                });
                await this.sessionRepo.updateSession(session.id, session);
            },
        });
        // Switch to main if on the branch being aborted
        if (isCurrentBranch) {
            steps.push({
                name: 'Switching to main branch',
                action: async () => {
                    await this.gitOps.checkoutBranch('main');
                },
            });
        }
        // Delete branch if requested
        if (deleteBranch) {
            steps.push({
                name: `Deleting branch '${branchName}'`,
                action: async () => {
                    try {
                        await this.gitOps.deleteBranch(branchName, true);
                        this.output.dim(`Branch '${branchName}' deleted`);
                    }
                    catch (error) {
                        this.output.warningMessage(`Could not delete branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                },
            });
        }
        // Release session lock
        steps.push({
            name: 'Releasing session lock',
            action: async () => {
                await this.sessionRepo.releaseLock(session.id);
            },
        });
        await this.progress.runSteps(steps);
    }
    showAbortSummary(session, branchDeleted) {
        this.output.subheader('Abort Summary');
        const summaryData = [
            ['Session ID', session.id.substring(0, 8)],
            ['Branch', session.branchName],
            ['Previous State', session.stateHistory[session.stateHistory.length - 1]?.from || 'N/A'],
            ['Final State', 'ABORTED'],
            ['Session Age', session.getAge()],
            ['Branch Deleted', branchDeleted ? '✅' : '❌'],
        ];
        this.output.table(['Property', 'Value'], summaryData);
        this.output.newline();
        this.output.dim('Tips:');
        this.output.dim('• Use "hansolo sessions --all" to see aborted sessions');
        this.output.dim('• Use "hansolo launch" to start a new workflow');
        if (!branchDeleted) {
            this.output.dim(`• Branch '${session.branchName}' still exists locally`);
            this.output.dim(`• Use "git branch -D ${session.branchName}" to delete it`);
        }
    }
    async abortAll(options = {}) {
        this.output.header('❌ Aborting All Workflows');
        const sessions = await this.sessionRepo.listSessions(false);
        const activeSessions = sessions.filter(s => s.isActive());
        if (activeSessions.length === 0) {
            this.output.dim('No active sessions to abort');
            return;
        }
        this.output.warningMessage(`This will abort ${activeSessions.length} active workflow(s)`);
        if (!options.yes) {
            const confirmed = await this.confirmAction('Are you sure you want to abort ALL workflows?', true);
            if (!confirmed) {
                this.output.infoMessage('Abort cancelled');
                return;
            }
        }
        let aborted = 0;
        for (const session of activeSessions) {
            try {
                await this.execute({
                    branchName: session.branchName,
                    force: options.force,
                    yes: true,
                });
                aborted++;
            }
            catch (error) {
                this.output.errorMessage(`Failed to abort '${session.branchName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        this.output.successMessage(`Aborted ${aborted} workflow(s)`);
    }
}
exports.AbortCommand = AbortCommand;
//# sourceMappingURL=hansolo-abort.js.map