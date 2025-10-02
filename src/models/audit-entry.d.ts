import { AuditAction, AuditDetails, StateName } from './types';
export declare class AuditEntry {
    id: string;
    timestamp: string;
    sessionId?: string;
    action: AuditAction;
    actor: string;
    details: AuditDetails;
    result: 'success' | 'failure' | 'aborted';
    errorMessage?: string;
    constructor(options: {
        sessionId?: string;
        action: AuditAction;
        actor: string;
        details: AuditDetails;
        result: 'success' | 'failure' | 'aborted';
        errorMessage?: string;
    });
    getSeverity(): 'info' | 'warning' | 'error';
    getFormattedMessage(): string;
    private getActionDescription;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: Record<string, unknown>): AuditEntry;
    static createForStateTransition(sessionId: string, from: StateName, to: StateName, actor: string): AuditEntry;
    static createForGitOperation(sessionId: string | undefined, operation: string, actor: string, success: boolean, errorMessage?: string): AuditEntry;
    static createForError(sessionId: string | undefined, error: Error, actor: string, context?: string): AuditEntry;
}
//# sourceMappingURL=audit-entry.d.ts.map