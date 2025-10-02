"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSession = void 0;
const crypto_1 = require("crypto");
class WorkflowSession {
    id;
    branchName;
    workflowType;
    currentState;
    stateHistory;
    metadata;
    createdAt;
    updatedAt;
    expiresAt;
    lastUpdated; // Alias for updatedAt for compatibility
    gitBranch; // Alias for branchName for compatibility
    constructor(options) {
        this.id = (0, crypto_1.randomUUID)();
        this.workflowType = options.workflowType;
        this.branchName = options.branchName || this.generateBranchName();
        this.currentState = this.getInitialState();
        this.stateHistory = [];
        this.metadata = options.metadata || { projectPath: process.cwd() };
        const now = new Date();
        this.createdAt = now.toISOString();
        this.updatedAt = now.toISOString();
        this.lastUpdated = this.updatedAt; // Set alias
        this.gitBranch = this.branchName; // Set alias
        // Sessions expire after 30 days
        const expirationDate = new Date(now);
        expirationDate.setDate(expirationDate.getDate() + 30);
        this.expiresAt = expirationDate.toISOString();
    }
    getInitialState() {
        switch (this.workflowType) {
            case 'launch':
                return 'INIT';
            case 'ship':
                return 'BRANCH_READY';
            case 'hotfix':
                return 'HOTFIX_INIT';
        }
    }
    generateBranchName() {
        const prefix = this.workflowType === 'hotfix' ? 'hotfix' : 'feature';
        const timestamp = Date.now().toString().slice(-3);
        const randomWords = ['update', 'fix', 'add', 'improve', 'refactor'];
        const word = randomWords[Math.floor(Math.random() * randomWords.length)];
        return `${prefix}/${timestamp}-${word}-feature`;
    }
    isValidId() {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(this.id);
    }
    isValidBranchName() {
        // Check if branch name follows Git conventions
        const invalidPatterns = [
            /^[/.]/, // starts with / or .
            /\/$/, // ends with /
            /\.\./, // contains ..
            /\s/, // contains spaces
            /[~^:?*[]/, // contains special chars
        ];
        const reservedNames = ['main', 'master', 'develop'];
        if (reservedNames.includes(this.branchName)) {
            return false;
        }
        return !invalidPatterns.some(pattern => pattern.test(this.branchName));
    }
    isValidState(state) {
        const standardStates = [
            'INIT', 'BRANCH_READY', 'CHANGES_COMMITTED', 'PUSHED',
            'PR_CREATED', 'WAITING_APPROVAL', 'REBASING', 'MERGING',
            'CLEANUP', 'COMPLETE', 'CONFLICT_RESOLUTION', 'ABORTED',
        ];
        const hotfixStates = [
            'HOTFIX_INIT', 'HOTFIX_READY', 'HOTFIX_COMMITTED',
            'HOTFIX_PUSHED', 'HOTFIX_VALIDATED', 'HOTFIX_DEPLOYED',
            'HOTFIX_CLEANUP', 'HOTFIX_COMPLETE', 'ROLLBACK',
        ];
        if (this.workflowType === 'hotfix') {
            return hotfixStates.includes(state) || state === 'ABORTED';
        }
        else {
            return standardStates.includes(state);
        }
    }
    isExpired() {
        return new Date(this.expiresAt) < new Date();
    }
    isActive() {
        const terminalStates = [
            'COMPLETE', 'HOTFIX_COMPLETE', 'ABORTED',
        ];
        return !terminalStates.includes(this.currentState);
    }
    canResume() {
        return this.isActive() && !this.isExpired();
    }
    transitionTo(newState, trigger = 'user_action', metadata) {
        if (!this.isValidState(newState)) {
            throw new Error(`Invalid state transition: ${newState} is not valid for ${this.workflowType} workflow`);
        }
        const transition = {
            from: this.currentState,
            to: newState,
            trigger,
            timestamp: new Date().toISOString(),
            metadata,
        };
        this.stateHistory.push(transition);
        this.currentState = newState;
        this.updatedAt = new Date().toISOString();
    }
    getAge() {
        const created = new Date(this.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
        else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        else {
            const minutes = Math.floor(diffMs / (1000 * 60));
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    }
    getTimeRemaining() {
        const expires = new Date(this.expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();
        if (diffMs <= 0) {
            return 'Expired';
        }
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
        else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        else {
            const minutes = Math.floor(diffMs / (1000 * 60));
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    }
    validate() {
        const errors = [];
        if (!this.branchName || this.branchName.trim() === '') {
            errors.push('Branch name is required');
        }
        if (!this.workflowType || !['launch', 'ship', 'hotfix'].includes(this.workflowType)) {
            errors.push('Invalid workflow type');
        }
        if (!this.isValidState(this.currentState)) {
            errors.push(`Invalid state: ${this.currentState}`);
        }
        if (this.isExpired()) {
            errors.push('Session has expired');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    toJSON() {
        return {
            id: this.id,
            branchName: this.branchName,
            workflowType: this.workflowType,
            currentState: this.currentState,
            stateHistory: this.stateHistory,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            expiresAt: this.expiresAt,
        };
    }
    static fromJSON(json) {
        const session = new WorkflowSession({
            workflowType: json['workflowType'],
            branchName: json['branchName'],
            metadata: json['metadata'],
        });
        session.id = json['id'];
        session.currentState = json['currentState'];
        session.stateHistory = json['stateHistory'];
        session.createdAt = json['createdAt'];
        session.updatedAt = json['updatedAt'];
        session.expiresAt = json['expiresAt'];
        return session;
    }
}
exports.WorkflowSession = WorkflowSession;
//# sourceMappingURL=workflow-session.js.map