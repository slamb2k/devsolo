"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOperations = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
class GitOperations {
    git;
    constructor(basePath) {
        this.git = (0, simple_git_1.default)(basePath || process.cwd());
    }
    async init() {
        await this.git.init();
    }
    async isInitialized() {
        try {
            await this.git.status();
            return true;
        }
        catch {
            return false;
        }
    }
    async getCurrentBranch() {
        const status = await this.git.status();
        return status.current || 'main';
    }
    async createBranch(branchName, baseBranch = 'main') {
        // Ensure we're on the base branch
        await this.git.checkout(baseBranch);
        // Pull latest changes
        const remotes = await this.git.getRemotes();
        if (remotes.length > 0) {
            try {
                await this.git.pull('origin', baseBranch);
            }
            catch {
                // Ignore pull errors (might not have upstream)
            }
        }
        // Create and checkout new branch
        await this.git.checkoutBranch(branchName, baseBranch);
    }
    async checkoutBranch(branchName) {
        await this.git.checkout(branchName);
    }
    async deleteBranch(branchName, force = false) {
        if (force) {
            await this.git.deleteLocalBranch(branchName, true);
        }
        else {
            await this.git.deleteLocalBranch(branchName);
        }
    }
    async deleteRemoteBranch(branchName) {
        await this.git.push('origin', branchName, ['--delete']);
    }
    async status() {
        return await this.git.status();
    }
    async getStatus() {
        return await this.git.status();
    }
    async isClean() {
        const status = await this.git.status();
        return status.isClean();
    }
    async hasUncommittedChanges() {
        const status = await this.git.status();
        return !status.isClean();
    }
    async stashChanges(message) {
        const stashMessage = message || `han-solo stash ${new Date().toISOString()}`;
        const result = await this.git.stash(['push', '-m', stashMessage]);
        // Extract stash reference from output
        const match = result.match(/stash@\{(\d+)\}/);
        const stashRef = match ? `stash@{${match[1]}}` : 'stash@{0}';
        return { stashRef };
    }
    async add(files) {
        if (files) {
            await this.git.add(files);
        }
        else {
            await this.git.add('.');
        }
    }
    async stageAll() {
        await this.git.add('.');
    }
    async commit(message, options) {
        const args = ['--message', message];
        if (options?.noVerify) {
            args.push('--no-verify');
        }
        const result = await this.git.raw(['commit', ...args]);
        const match = result.match(/\[\w+\s+([a-f0-9]+)\]/);
        return { commit: match?.[1] || 'unknown' };
    }
    async push(remote = 'origin', branch, options) {
        const currentBranch = branch || await this.getCurrentBranch();
        if (Array.isArray(options)) {
            // Pass through options array
            await this.git.push(remote, currentBranch, options);
        }
        else if (typeof options === 'boolean' && options) {
            // Legacy setUpstream parameter or force push
            await this.git.push(remote, currentBranch, ['--set-upstream']);
        }
        else {
            await this.git.push(remote, currentBranch);
        }
    }
    async pull(remote = 'origin', branch) {
        const currentBranch = branch || await this.getCurrentBranch();
        await this.git.pull(remote, currentBranch);
    }
    async rebase(branch = 'main') {
        await this.git.rebase([branch]);
    }
    async merge(branch, squash = true) {
        const args = squash ? ['--squash'] : [];
        await this.git.merge([branch, ...args]);
    }
    async getBranchStatus(branchName) {
        const branch = branchName || await this.getCurrentBranch();
        // Get status
        const status = await this.git.status();
        // Check if branch has remote
        const remoteBranch = `origin/${branch}`;
        let hasRemote = false;
        let ahead = 0;
        let behind = 0;
        try {
            // Check if remote branch exists
            const remoteRefs = await this.git.raw(['ls-remote', '--heads', 'origin', branch]);
            hasRemote = remoteRefs.trim().length > 0;
            if (hasRemote) {
                // Get ahead/behind count
                const revList = await this.git.raw(['rev-list', '--left-right', '--count', `${remoteBranch}...${branch || 'HEAD'}`]);
                const [behindStr, aheadStr] = revList?.trim().split('\t') || ['0', '0'];
                behind = parseInt(behindStr || '0') || 0;
                ahead = parseInt(aheadStr || '0') || 0;
            }
        }
        catch {
            // Remote operations might fail if offline
        }
        return {
            ahead,
            behind,
            hasRemote,
            isClean: status.isClean(),
            conflicted: status.conflicted,
        };
    }
    async getRemoteUrl() {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs?.fetch || null;
        }
        catch {
            return null;
        }
    }
    async addRemote(name, url) {
        await this.git.addRemote(name, url);
    }
    async fetch(remote = 'origin', branch) {
        if (branch) {
            await this.git.fetch(remote, branch);
        }
        else {
            await this.git.fetch(remote);
        }
    }
    async getTags() {
        const result = await this.git.tags();
        return result.all;
    }
    async createTag(tagName, message) {
        if (message) {
            await this.git.tag(['-a', tagName, '-m', message]);
        }
        else {
            await this.git.tag([tagName]);
        }
    }
    async getCommitHash(ref = 'HEAD') {
        const hash = await this.git.revparse([ref]);
        return hash.trim();
    }
    async getCommitMessage(ref = 'HEAD') {
        const message = await this.git.raw(['log', '-1', '--pretty=%B', ref]);
        return message.trim();
    }
    async getDiff(cached = false) {
        if (cached) {
            return await this.git.diff(['--cached']);
        }
        return await this.git.diff();
    }
    async getLog(limit = 10) {
        const result = await this.git.log(['-n', limit.toString()]);
        return result.all.map(commit => `${commit.hash.substring(0, 7)} - ${commit.message}`);
    }
    async listBranches(remote = false) {
        const result = await this.git.branch(remote ? ['-r'] : []);
        return result.all;
    }
    async hasConflicts() {
        const status = await this.git.status();
        return status.conflicted.length > 0;
    }
    async getConflictedFiles() {
        const status = await this.git.status();
        return status.conflicted;
    }
    async resolveConflict(file, resolution) {
        if (resolution === 'ours') {
            await this.git.raw(['checkout', '--ours', file]);
        }
        else {
            await this.git.raw(['checkout', '--theirs', file]);
        }
        await this.git.add(file);
    }
    async abortRebase() {
        await this.git.rebase(['--abort']);
    }
    async continueRebase() {
        await this.git.rebase(['--continue']);
    }
    async getConfig(key) {
        try {
            const value = await this.git.raw(['config', '--get', key]);
            return value.trim();
        }
        catch {
            return null;
        }
    }
    async setConfig(key, value, global = false) {
        const args = ['config'];
        if (global) {
            args.push('--global');
        }
        args.push(key, value);
        await this.git.raw(args);
    }
    async raw(args) {
        return await this.git.raw(args);
    }
    // Additional methods for test compatibility
    async isGitRepository() {
        return this.isInitialized();
    }
    async checkout(branch) {
        await this.git.checkout(branch);
    }
    async isInstalled() {
        try {
            await this.git.version();
            return true;
        }
        catch {
            return false;
        }
    }
    async hasCommits() {
        try {
            await this.git.log(['-1']);
            return true;
        }
        catch {
            return false;
        }
    }
    async getBranches() {
        return this.listBranches();
    }
    async getLogWithBranch(branchOrLimit, limit) {
        if (typeof branchOrLimit === 'number') {
            // Called with just limit
            const result = await this.git.log(['-n', branchOrLimit.toString()]);
            return result.all.map(commit => `${commit.hash.substring(0, 7)} - ${commit.message}`);
        }
        else {
            // Called with branch and limit
            const result = await this.git.log([branchOrLimit, '-n', (limit || 10).toString()]);
            return [...result.all];
        }
    }
    async isRebasing() {
        try {
            await this.git.raw(['rev-parse', '--git-path', 'rebase-merge']);
            return true;
        }
        catch {
            return false;
        }
    }
    async rebaseInteractive(branch) {
        if (branch) {
            return await this.git.rebase([branch]);
        }
        return await this.git.rebase(['--continue']);
    }
    // Generic execute method for raw git commands
    async execute(args) {
        return await this.git.raw(args);
    }
    // Additional methods for quality checks
    async getGitVersion() {
        const result = await this.git.raw(['--version']);
        const match = result.match(/git version (\d+\.\d+\.\d+)/);
        return match?.[1] || '0.0.0';
    }
    async getMainBranch() {
        // Try to detect main branch name (main or master)
        const branches = await this.git.branchLocal();
        if (branches.all.includes('main')) {
            return 'main';
        }
        if (branches.all.includes('master')) {
            return 'master';
        }
        return 'main'; // default
    }
    async getCommitsBehindMain(branch) {
        const mainBranch = await this.getMainBranch();
        const result = await this.git.raw(['rev-list', '--count', `${branch}..${mainBranch}`]);
        return parseInt(result.trim()) || 0;
    }
    async getCommitsSince(branch) {
        const commits = await this.git.log({ from: branch, to: 'HEAD' });
        return [...commits.all];
    }
    async getAheadBehindCount() {
        try {
            const status = await this.git.status();
            return {
                ahead: status.ahead || 0,
                behind: status.behind || 0,
            };
        }
        catch {
            return { ahead: 0, behind: 0 };
        }
    }
    async hasRemote() {
        const remotes = await this.git.getRemotes();
        return remotes.length > 0;
    }
    async fetchRemote() {
        await this.git.fetch();
    }
    async getLastCommit() {
        const log = await this.git.log({ maxCount: 1 });
        return {
            message: log.latest?.message || '',
        };
    }
    async isBranchMerged(branch) {
        try {
            const mainBranch = await this.getMainBranch();
            const mergedBranches = await this.git.raw(['branch', '--merged', mainBranch]);
            return mergedBranches.includes(branch);
        }
        catch {
            return false;
        }
    }
    async getFilesInCommit(commit) {
        const result = await this.git.raw(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]);
        return result.split('\n').filter(f => f.trim());
    }
}
exports.GitOperations = GitOperations;
//# sourceMappingURL=git-operations.js.map