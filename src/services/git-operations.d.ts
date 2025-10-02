import { StatusResult } from 'simple-git';
import { GitBranchStatus } from '../models/types';
export declare class GitOperations {
    private git;
    constructor(basePath?: string);
    init(): Promise<void>;
    isInitialized(): Promise<boolean>;
    getCurrentBranch(): Promise<string>;
    createBranch(branchName: string, baseBranch?: string): Promise<void>;
    checkoutBranch(branchName: string): Promise<void>;
    deleteBranch(branchName: string, force?: boolean): Promise<void>;
    deleteRemoteBranch(branchName: string): Promise<void>;
    status(): Promise<StatusResult>;
    getStatus(): Promise<StatusResult>;
    isClean(): Promise<boolean>;
    hasUncommittedChanges(): Promise<boolean>;
    stashChanges(message?: string): Promise<{
        stashRef: string;
    }>;
    add(files?: string | string[]): Promise<void>;
    stageAll(): Promise<void>;
    commit(message: string, options?: {
        noVerify?: boolean;
    }): Promise<{
        commit: string;
    }>;
    push(remote?: string, branch?: string, options?: boolean | string[]): Promise<void>;
    pull(remote?: string, branch?: string): Promise<void>;
    rebase(branch?: string): Promise<void>;
    merge(branch: string, squash?: boolean): Promise<void>;
    getBranchStatus(branchName?: string): Promise<GitBranchStatus>;
    getRemoteUrl(): Promise<string | null>;
    addRemote(name: string, url: string): Promise<void>;
    fetch(remote?: string, branch?: string): Promise<void>;
    getTags(): Promise<string[]>;
    createTag(tagName: string, message?: string): Promise<void>;
    getCommitHash(ref?: string): Promise<string>;
    getCommitMessage(ref?: string): Promise<string>;
    getDiff(cached?: boolean): Promise<string>;
    getLog(limit?: number): Promise<string[]>;
    listBranches(remote?: boolean): Promise<string[]>;
    hasConflicts(): Promise<boolean>;
    getConflictedFiles(): Promise<string[]>;
    resolveConflict(file: string, resolution: 'ours' | 'theirs'): Promise<void>;
    abortRebase(): Promise<void>;
    continueRebase(): Promise<void>;
    getConfig(key: string): Promise<string | null>;
    setConfig(key: string, value: string, global?: boolean): Promise<void>;
    raw(args: string[]): Promise<string>;
    isGitRepository(): Promise<boolean>;
    checkout(branch: string): Promise<void>;
    isInstalled(): Promise<boolean>;
    hasCommits(): Promise<boolean>;
    getBranches(): Promise<string[]>;
    getLogWithBranch(branchOrLimit: string | number, limit?: number): Promise<any[]>;
    isRebasing(): Promise<boolean>;
    rebaseInteractive(branch?: string): Promise<any>;
    execute(args: string[]): Promise<string>;
    getGitVersion(): Promise<string>;
    getMainBranch(): Promise<string>;
    getCommitsBehindMain(branch: string): Promise<number>;
    getCommitsSince(branch: string): Promise<any[]>;
    getAheadBehindCount(): Promise<{
        ahead: number;
        behind: number;
    }>;
    hasRemote(): Promise<boolean>;
    fetchRemote(): Promise<void>;
    getLastCommit(): Promise<{
        message: string;
    }>;
    isBranchMerged(branch: string): Promise<boolean>;
    getFilesInCommit(commit: string): Promise<string[]>;
}
//# sourceMappingURL=git-operations.d.ts.map