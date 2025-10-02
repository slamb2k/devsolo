import { WorkflowSession } from '../models/workflow-session';
import { Configuration } from '../models/configuration';
export declare class SessionRepository {
    private sessionPath;
    private lockPath;
    private configManager;
    constructor(basePath?: string);
    initialize(): Promise<void>;
    createSession(session: WorkflowSession): Promise<WorkflowSession>;
    getSession(sessionId: string): Promise<WorkflowSession | null>;
    getSessionByBranch(branchName: string): Promise<WorkflowSession | null>;
    updateSession(sessionId: string, updates: Partial<WorkflowSession>): Promise<WorkflowSession>;
    deleteSession(sessionId: string): Promise<void>;
    listSessions(includeExpired?: boolean): Promise<WorkflowSession[]>;
    getAllSessions(): Promise<WorkflowSession[]>;
    saveSession(session: WorkflowSession): Promise<WorkflowSession>;
    save(session: WorkflowSession): Promise<void>;
    findById(sessionId: string): Promise<WorkflowSession | null>;
    findByBranch(branchName: string): Promise<WorkflowSession | null>;
    load(sessionId: string): Promise<WorkflowSession | null>;
    delete(sessionId: string): Promise<void>;
    setCurrentSession(sessionId: string): Promise<void>;
    getCurrentSession(): Promise<WorkflowSession | null>;
    cleanupExpiredSessions(): Promise<number>;
    acquireLock(sessionId: string): Promise<boolean>;
    releaseLock(sessionId: string): Promise<void>;
    isLocked(sessionId: string): Promise<boolean>;
    cleanupOrphanedLocks(): Promise<number>;
    private readIndex;
    private updateIndex;
    private removeFromIndex;
    private appendAudit;
    loadConfiguration(): Promise<Configuration>;
    saveConfiguration(config: Configuration): Promise<void>;
    updateSessionState(sessionId: string, newState: string): Promise<void>;
}
//# sourceMappingURL=session-repository.d.ts.map