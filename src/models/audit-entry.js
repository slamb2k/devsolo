"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEntry = void 0;
const crypto_1 = require("crypto");
class AuditEntry {
    id;
    timestamp;
    sessionId;
    action;
    actor;
    details;
    result;
    errorMessage;
    constructor(options) {
        this.id = (0, crypto_1.randomUUID)();
        this.timestamp = new Date().toISOString();
        this.sessionId = options.sessionId;
        this.action = options.action;
        this.actor = options.actor;
        this.details = options.details;
        this.result = options.result;
        this.errorMessage = options.errorMessage;
        // Validate error message requirement
        if (this.result === 'failure' && !this.errorMessage) {
            this.errorMessage = 'Unknown error';
        }
    }
    getSeverity() {
        if (this.result === 'failure') {
            return 'error';
        }
        if (this.result === 'aborted') {
            return 'warning';
        }
        return 'info';
    }
    getFormattedMessage() {
        const parts = [`[${this.timestamp}]`, `[${this.action}]`];
        if (this.sessionId) {
            parts.push(`[Session: ${this.sessionId.substring(0, 8)}]`);
        }
        parts.push(this.getActionDescription());
        if (this.result === 'failure' && this.errorMessage) {
            parts.push(`- Error: ${this.errorMessage}`);
        }
        return parts.join(' ');
    }
    getActionDescription() {
        switch (this.action) {
            case 'session_created':
                return `Created new session for ${this.details.command}`;
            case 'session_resumed':
                return `Resumed session from branch ${this.details.gitOperation || 'unknown'}`;
            case 'state_transition':
                if (this.details.stateTransition) {
                    return `State: ${this.details.stateTransition.from} → ${this.details.stateTransition.to}`;
                }
                return 'State transition occurred';
            case 'git_operation':
                return `Git: ${this.details.gitOperation || 'operation'}`;
            case 'api_call':
                return `API: ${this.details.command}`;
            case 'user_decision':
                return `User: ${this.details.userDecision || 'made decision'}`;
            case 'error_occurred':
                return `Error: ${this.errorMessage || 'Unknown error'}`;
            case 'session_completed':
                return 'Session completed successfully';
            case 'session_aborted':
                return `Session aborted: ${this.details.userDecision || 'by user'}`;
            default:
                return this.details.command || 'Action performed';
        }
    }
    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,
            sessionId: this.sessionId,
            action: this.action,
            actor: this.actor,
            details: this.details,
            result: this.result,
            errorMessage: this.errorMessage,
        };
    }
    static fromJSON(json) {
        const entry = new AuditEntry({
            sessionId: json['sessionId'],
            action: json['action'],
            actor: json['actor'],
            details: json['details'],
            result: json['result'],
            errorMessage: json['errorMessage'],
        });
        entry.id = json['id'];
        entry.timestamp = json['timestamp'];
        return entry;
    }
    static createForStateTransition(sessionId, from, to, actor) {
        return new AuditEntry({
            sessionId,
            action: 'state_transition',
            actor,
            details: {
                command: 'state_transition',
                stateTransition: { from, to },
            },
            result: 'success',
        });
    }
    static createForGitOperation(sessionId, operation, actor, success, errorMessage) {
        return new AuditEntry({
            sessionId,
            action: 'git_operation',
            actor,
            details: {
                command: 'git',
                gitOperation: operation,
            },
            result: success ? 'success' : 'failure',
            errorMessage,
        });
    }
    static createForError(sessionId, error, actor, context) {
        return new AuditEntry({
            sessionId,
            action: 'error_occurred',
            actor,
            details: {
                command: context || 'unknown',
                affectedFiles: [],
            },
            result: 'failure',
            errorMessage: error.message,
        });
    }
}
exports.AuditEntry = AuditEntry;
//# sourceMappingURL=audit-entry.js.map