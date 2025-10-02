"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const workflow_session_1 = require("../models/workflow-session");
const audit_entry_1 = require("../models/audit-entry");
const configuration_manager_1 = require("./configuration-manager");
class SessionRepository {
    sessionPath;
    lockPath;
    configManager;
    constructor(basePath = '.hansolo') {
        // Always resolve relative to current working directory
        const resolvedBasePath = path.resolve(process.cwd(), basePath);
        this.sessionPath = path.join(resolvedBasePath, 'sessions');
        this.lockPath = path.join(resolvedBasePath, 'locks');
        this.configManager = new configuration_manager_1.ConfigurationManager(basePath);
    }
    async initialize() {
        await fs.mkdir(this.sessionPath, { recursive: true });
        await fs.mkdir(this.lockPath, { recursive: true });
    }
    async createSession(session) {
        await this.initialize();
        const sessionFile = path.join(this.sessionPath, `${session.id}.json`);
        const lockFile = path.join(this.lockPath, `${session.id}.lock`);
        // Check if session already exists
        try {
            await fs.access(sessionFile);
            throw new Error(`Session ${session.id} already exists`);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        // Write session atomically
        const tempFile = `${sessionFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(session.toJSON(), null, 2));
        await fs.rename(tempFile, sessionFile);
        // Create lock file with PID
        await fs.writeFile(lockFile, process.pid.toString());
        // Update index
        await this.updateIndex(session);
        // Create audit entry
        const auditEntry = new audit_entry_1.AuditEntry({
            sessionId: session.id,
            action: 'session_created',
            actor: process.env['USER'] || 'unknown',
            details: {
                command: 'create_session',
                gitOperation: `branch: ${session.branchName}`,
            },
            result: 'success',
        });
        await this.appendAudit(auditEntry);
        return session;
    }
    async getSession(sessionId) {
        const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);
        try {
            const data = await fs.readFile(sessionFile, 'utf-8');
            const json = JSON.parse(data);
            return workflow_session_1.WorkflowSession.fromJSON(json);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async getSessionByBranch(branchName) {
        const index = await this.readIndex();
        const sessionId = index.branchMap?.[branchName];
        if (!sessionId) {
            return null;
        }
        return this.getSession(sessionId);
    }
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Merge updates
        Object.assign(session, updates);
        session.updatedAt = new Date().toISOString();
        // Write atomically
        const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);
        const tempFile = `${sessionFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(session.toJSON(), null, 2));
        await fs.rename(tempFile, sessionFile);
        // Update index
        await this.updateIndex(session);
        return session;
    }
    async deleteSession(sessionId) {
        const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);
        const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
        // Get session for audit
        const session = await this.getSession(sessionId);
        if (!session) {
            return; // Already deleted
        }
        // Delete files
        await fs.unlink(sessionFile).catch(() => { });
        await fs.unlink(lockFile).catch(() => { });
        // Update index
        await this.removeFromIndex(sessionId, session.branchName);
        // Create audit entry
        const auditEntry = new audit_entry_1.AuditEntry({
            sessionId,
            action: 'session_completed',
            actor: process.env['USER'] || 'unknown',
            details: {
                command: 'delete_session',
            },
            result: 'success',
        });
        await this.appendAudit(auditEntry);
    }
    async listSessions(includeExpired = false) {
        await this.initialize();
        const files = await fs.readdir(this.sessionPath);
        const sessions = [];
        for (const file of files) {
            if (!file.endsWith('.json') || file === 'index.json') {
                continue;
            }
            const sessionId = path.basename(file, '.json');
            const session = await this.getSession(sessionId);
            if (session && (includeExpired || !session.isExpired())) {
                sessions.push(session);
            }
        }
        // Sort by updatedAt descending
        return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    // Alias for listSessions to match MCP tool expectations
    async getAllSessions() {
        return this.listSessions(true);
    }
    // Alias for createSession to match MCP tool expectations
    async saveSession(session) {
        return this.createSession(session);
    }
    // Add save method for test compatibility
    async save(session) {
        if (await this.getSession(session.id)) {
            await this.updateSession(session.id, session);
        }
        else {
            await this.createSession(session);
        }
    }
    // Add findById method for test compatibility
    async findById(sessionId) {
        return this.getSession(sessionId);
    }
    // Add findByBranch method for test compatibility
    async findByBranch(branchName) {
        const sessions = await this.listSessions();
        return sessions.find(s => s.branchName === branchName) || null;
    }
    // Alias methods for compatibility with new tools
    async load(sessionId) {
        return this.getSession(sessionId);
    }
    async delete(sessionId) {
        return this.deleteSession(sessionId);
    }
    // Add setCurrentSession method for test compatibility
    async setCurrentSession(sessionId) {
        const currentFile = path.join(this.sessionPath, 'current.json');
        await fs.writeFile(currentFile, JSON.stringify({ sessionId }));
    }
    // Add getCurrentSession method for test compatibility
    async getCurrentSession() {
        try {
            const currentFile = path.join(this.sessionPath, 'current.json');
            const data = await fs.readFile(currentFile, 'utf-8');
            const { sessionId } = JSON.parse(data);
            return this.getSession(sessionId);
        }
        catch {
            return null;
        }
    }
    async cleanupExpiredSessions() {
        const sessions = await this.listSessions(true);
        let cleaned = 0;
        for (const session of sessions) {
            if (session.isExpired()) {
                await this.deleteSession(session.id);
                cleaned++;
            }
        }
        return cleaned;
    }
    async acquireLock(sessionId) {
        const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
        try {
            // Check if lock exists
            const existingPid = await fs.readFile(lockFile, 'utf-8');
            // Check if process is still running
            try {
                process.kill(parseInt(existingPid), 0);
                return false; // Process still running, lock is held
            }
            catch {
                // Process not running, can acquire lock
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        // Acquire lock
        await fs.writeFile(lockFile, process.pid.toString());
        return true;
    }
    async releaseLock(sessionId) {
        const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
        await fs.unlink(lockFile).catch(() => { });
    }
    async isLocked(sessionId) {
        const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
        try {
            await fs.access(lockFile);
            return true;
        }
        catch {
            return false;
        }
    }
    async cleanupOrphanedLocks() {
        await this.initialize();
        const lockFiles = await fs.readdir(this.lockPath);
        let cleaned = 0;
        for (const file of lockFiles) {
            if (file.endsWith('.lock')) {
                const lockPath = path.join(this.lockPath, file);
                const stat = await fs.stat(lockPath);
                const ageMs = Date.now() - stat.mtimeMs;
                // Remove locks older than 1 hour
                if (ageMs > 60 * 60 * 1000) {
                    await fs.unlink(lockPath).catch(() => { });
                    cleaned++;
                }
            }
        }
        return cleaned;
    }
    async readIndex() {
        const indexFile = path.join(this.sessionPath, 'index.json');
        try {
            const data = await fs.readFile(indexFile, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { sessions: [], branchMap: {} };
            }
            throw error;
        }
    }
    async updateIndex(session) {
        const index = await this.readIndex();
        // Update sessions list
        if (!index.sessions) {
            index.sessions = [];
        }
        const existingIndex = index.sessions.findIndex((s) => s.id === session.id);
        const sessionSummary = {
            id: session.id,
            branchName: session.branchName,
            workflowType: session.workflowType,
            currentState: session.currentState,
            updatedAt: session.updatedAt,
        };
        if (existingIndex >= 0) {
            index.sessions[existingIndex] = sessionSummary;
        }
        else {
            index.sessions.push(sessionSummary);
        }
        // Update branch map
        if (!index.branchMap) {
            index.branchMap = {};
        }
        index.branchMap[session.branchName] = session.id;
        // Write index
        const indexFile = path.join(this.sessionPath, 'index.json');
        const tempFile = `${indexFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(index, null, 2));
        await fs.rename(tempFile, indexFile);
    }
    async removeFromIndex(sessionId, branchName) {
        const index = await this.readIndex();
        // Remove from sessions list
        if (index.sessions) {
            index.sessions = index.sessions.filter((s) => s.id !== sessionId);
        }
        // Remove from branch map
        if (index.branchMap && index.branchMap[branchName] === sessionId) {
            delete index.branchMap[branchName];
        }
        // Write index
        const indexFile = path.join(this.sessionPath, 'index.json');
        const tempFile = `${indexFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(index, null, 2));
        await fs.rename(tempFile, indexFile);
    }
    async appendAudit(entry) {
        const auditPath = path.join(path.dirname(this.sessionPath), 'audit');
        await fs.mkdir(auditPath, { recursive: true });
        const date = new Date();
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const day = String(date.getDate()).padStart(2, '0');
        const monthDir = path.join(auditPath, yearMonth);
        await fs.mkdir(monthDir, { recursive: true });
        const auditFile = path.join(monthDir, `${day}.jsonl`);
        const line = JSON.stringify(entry.toJSON()) + '\n';
        await fs.appendFile(auditFile, line);
    }
    // Configuration management methods
    async loadConfiguration() {
        return this.configManager.loadConfiguration();
    }
    async saveConfiguration(config) {
        return this.configManager.saveConfiguration(config);
    }
    // Additional state update method
    async updateSessionState(sessionId, newState) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Add state transition to history
        session.stateHistory.push({
            from: session.currentState,
            to: newState,
            trigger: 'user_action',
            timestamp: new Date().toISOString(),
        });
        session.currentState = newState;
        session.updatedAt = new Date().toISOString();
        await this.updateSession(session.id, session);
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=session-repository.js.map