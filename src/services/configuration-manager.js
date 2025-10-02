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
exports.ConfigurationManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const configuration_1 = require("../models/configuration");
class ConfigurationManager {
    configPath;
    config = null;
    fileWatcher = null;
    constructor(basePath = '.hansolo') {
        // Always resolve relative to current working directory
        const resolvedBasePath = path.resolve(process.cwd(), basePath);
        this.configPath = path.join(resolvedBasePath, 'config.yaml');
    }
    async load() {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            const parsed = yaml.parse(data);
            this.config = configuration_1.Configuration.fromJSON(parsed);
            return this.config;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Config doesn't exist yet, return default
                this.config = configuration_1.Configuration.getDefault();
                return this.config;
            }
            throw error;
        }
    }
    async save(config) {
        const configToSave = config || this.config;
        if (!configToSave) {
            throw new Error('No configuration to save');
        }
        const dir = path.dirname(this.configPath);
        await fs.mkdir(dir, { recursive: true });
        const data = yaml.stringify(configToSave.toJSON());
        // Write atomically
        const tempFile = `${this.configPath}.tmp`;
        await fs.writeFile(tempFile, data);
        await fs.rename(tempFile, this.configPath);
        this.config = configToSave;
    }
    // Alias for load to match MCP tool expectations
    async loadConfig() {
        return this.load();
    }
    // Alias for save to match MCP tool expectations
    async saveConfig(config) {
        return this.save(config);
    }
    // Additional aliases for commands
    async loadConfiguration() {
        return this.load();
    }
    async saveConfiguration(config) {
        return this.save(config);
    }
    async createDefaultConfiguration() {
        return configuration_1.Configuration.getDefault();
    }
    async initialize() {
        const existingConfig = await this.exists();
        if (existingConfig) {
            throw new Error('Configuration already exists. Use "hansolo config" to modify.');
        }
        const config = new configuration_1.Configuration({
            initialized: true,
            scope: 'project',
            version: '1.0.0',
        });
        await this.save(config);
        // Create marker file
        const markerPath = path.join(path.dirname(this.configPath), 'hansolo.yaml');
        await fs.writeFile(markerPath, `# han-solo project marker file
# This file indicates that han-solo has been initialized in this project
version: 1.0.0
initialized: true
created: ${new Date().toISOString()}
`);
        return config;
    }
    async exists() {
        try {
            await fs.access(this.configPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async isInitialized() {
        const markerPath = path.join(path.dirname(this.configPath), 'hansolo.yaml');
        try {
            await fs.access(markerPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async validate() {
        if (!await this.isInitialized()) {
            throw new Error('han-solo not initialized. Run "/hansolo:init" first.');
        }
        const config = await this.load();
        const errors = config.validate();
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
        return true;
    }
    async getInstallPath() {
        const config = this.config || await this.load();
        return config.getInstallPath();
    }
    async getSessionsPath() {
        const config = this.config || await this.load();
        return config.getSessionsPath();
    }
    async getAuditPath() {
        const config = this.config || await this.load();
        return config.getAuditPath();
    }
    async getHooksPath() {
        const config = this.config || await this.load();
        return config.getHooksPath();
    }
    async getTemplatesPath() {
        const config = this.config || await this.load();
        return config.getTemplatesPath();
    }
    async updatePreferences(preferences) {
        const config = await this.load();
        config.preferences = {
            ...config.preferences,
            ...preferences,
        };
        await this.save(config);
        return config;
    }
    async updateGitPlatform(platform) {
        const config = await this.load();
        config.gitPlatform = platform;
        await this.save(config);
        return config;
    }
    async enableComponent(component) {
        const config = await this.load();
        config.components[component] = true;
        await this.save(config);
        return config;
    }
    async disableComponent(component) {
        const config = await this.load();
        if (component === 'mpcServer') {
            throw new Error('Cannot disable MCP Server - it is required for han-solo to function');
        }
        config.components[component] = false;
        await this.save(config);
        return config;
    }
    async watchForChanges(callback) {
        if (this.fileWatcher) {
            await this.stopWatching();
        }
        // Use fs.watch for file changes
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        this.fileWatcher = fs.watch(this.configPath, async (eventType) => {
            if (eventType === 'change') {
                try {
                    const config = await this.load();
                    callback(config);
                }
                catch (error) {
                    console.error('Error reloading config:', error);
                }
            }
        });
    }
    async stopWatching() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
    }
    async getGitPlatformToken() {
        const config = await this.load();
        if (!config.gitPlatform?.token) {
            // Try to get from environment variables
            const platform = config.gitPlatform?.type;
            if (platform === 'github') {
                return process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || null;
            }
            else if (platform === 'gitlab') {
                return process.env['GITLAB_TOKEN'] || process.env['GL_TOKEN'] || null;
            }
        }
        return config.gitPlatform?.token || null;
    }
    async installHooks() {
        const hooksPath = await this.getHooksPath();
        await fs.mkdir(hooksPath, { recursive: true });
        // Pre-commit hook
        const preCommitHook = `#!/bin/bash
# han-solo pre-commit hook
# Enforces workflow when han-solo session is active

# Check for active han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active!"
  echo "📝 Use 'hansolo ship' or '/hansolo:ship' to commit changes"
  echo "   Or use 'hansolo abort' to exit the workflow"
  exit 1
fi

# Prevent direct commits to main/master branches
branch=$(git branch --show-current)
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct commits to $branch are not allowed!"
  echo "Use '/hansolo:launch' to create a feature branch"
  exit 1
fi

exit 0
`;
        await fs.writeFile(path.join(hooksPath, 'pre-commit'), preCommitHook, { mode: 0o755 });
        // Pre-push hook
        const prePushHook = `#!/bin/bash
# han-solo pre-push hook
# Validates branch state before pushing

# Check for active han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active!"
  echo "📝 Use 'hansolo ship --push' to push changes"
  echo "   Or complete the workflow with 'hansolo ship'"
  exit 1
fi

branch=$(git branch --show-current)

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct pushes to $branch are not allowed!"
  exit 1
fi

echo "✅ Push validation passed"
exit 0
`;
        await fs.writeFile(path.join(hooksPath, 'pre-push'), prePushHook, { mode: 0o755 });
        // Link hooks to Git
        const gitHooksPath = path.join('.git', 'hooks');
        try {
            await fs.symlink(path.join('..', '..', hooksPath, 'pre-commit'), path.join(gitHooksPath, 'pre-commit'));
            await fs.symlink(path.join('..', '..', hooksPath, 'pre-push'), path.join(gitHooksPath, 'pre-push'));
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    async installClaudeGuidance() {
        const MARKER_START = '<!-- BEGIN HAN-SOLO MANAGED SECTION - DO NOT EDIT -->';
        const MARKER_END = '<!-- END HAN-SOLO MANAGED SECTION -->';
        // Read existing CLAUDE.md if it exists
        let existingContent = '';
        try {
            existingContent = await fs.readFile('CLAUDE.md', 'utf-8');
        }
        catch (error) {
            // File doesn't exist yet, that's fine
        }
        // Check if markers already exist
        if (existingContent.includes(MARKER_START)) {
            // Replace content between markers
            const before = existingContent.substring(0, existingContent.indexOf(MARKER_START));
            const after = existingContent.substring(existingContent.indexOf(MARKER_END) + MARKER_END.length);
            const updatedContent = `${before}${MARKER_START}
${this.getHanSoloSection()}
${MARKER_END}${after}`;
            await fs.writeFile('CLAUDE.md', updatedContent);
        }
        else {
            // Add marked section to existing content or create new file
            const newContent = existingContent
                ? `${existingContent}\n\n${MARKER_START}\n${this.getHanSoloSection()}\n${MARKER_END}`
                : `# CLAUDE.md\n\nThis file provides guidance to Claude Code when working with this repository.\n\n${MARKER_START}\n${this.getHanSoloSection()}\n${MARKER_END}`;
            await fs.writeFile('CLAUDE.md', newContent);
        }
    }
    getHanSoloSection() {
        return `
## 🚀 han-solo Git Workflow Management

This section is automatically managed by han-solo. Last updated: ${new Date().toISOString()}

### Workflow Detection

Before performing git operations, check for active han-solo session:

\`\`\`javascript
// Check if han-solo is managing current work
if (fs.existsSync('.hansolo/session.json')) {
  // han-solo is active - MUST use MCP tools
  return 'use-hansolo-mcp';
} else {
  // No active session - can use standard git
  return 'use-standard-git';
}
\`\`\`

### ⛔ When han-solo Session is Active

If \`.hansolo/session.json\` exists, **NEVER** use these commands:
- \`git commit\` → Use \`/hansolo:ship\` instead
- \`git push\` → Use \`/hansolo:ship --push\` instead
- \`gh pr create\` → Use \`/hansolo:ship --create-pr\` instead
- \`git checkout -b\` → Use \`/hansolo:launch\` instead
- \`git rebase\` → han-solo handles this automatically

### ✅ When No Session Exists

If no \`.hansolo/session.json\` file:
- Safe to use standard git commands
- Can optionally start han-solo workflow with \`/hansolo:launch\`
- Direct git operations won't conflict with han-solo

### Why This Enforcement?

han-solo maintains a state machine tracking:
- Linear history enforcement
- Automatic rebasing and conflict resolution
- PR readiness validation
- Workflow audit trail

Direct git operations bypass this state tracking and will cause workflow corruption.

### Team Collaboration

- **With han-solo**: Follow session-based rules above
- **Without han-solo**: Use standard git workflow
- **Mixed teams**: Both can work simultaneously using session detection
`;
    }
    async removeClaudeGuidance() {
        try {
            const content = await fs.readFile('CLAUDE.md', 'utf-8');
            const MARKER_START = '<!-- BEGIN HAN-SOLO MANAGED SECTION - DO NOT EDIT -->';
            const MARKER_END = '<!-- END HAN-SOLO MANAGED SECTION -->';
            if (content.includes(MARKER_START)) {
                const before = content.substring(0, content.indexOf(MARKER_START));
                const after = content.substring(content.indexOf(MARKER_END) + MARKER_END.length);
                const cleaned = `${before}${after}`.trim();
                if (cleaned) {
                    await fs.writeFile('CLAUDE.md', cleaned);
                }
                else {
                    // File would be empty, remove it
                    await fs.unlink('CLAUDE.md');
                }
            }
        }
        catch {
            // File doesn't exist, nothing to remove
        }
    }
    async installTemplates() {
        const templatesPath = await this.getTemplatesPath();
        await fs.mkdir(templatesPath, { recursive: true });
        // Commit message template
        const commitTemplate = `# <type>: <subject>

# <body>

# <footer>

# Type should be one of: feat, fix, docs, style, refactor, test, chore
# Subject: imperative mood, max 50 chars
# Body: explain what and why, not how
# Footer: references to issues, breaking changes
`;
        await fs.writeFile(path.join(templatesPath, 'commit-message.txt'), commitTemplate);
        // PR template
        const prTemplate = `## Summary
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No merge conflicts

## Related Issues
<!-- Link to related issues -->
Closes #
`;
        await fs.writeFile(path.join(templatesPath, 'pull-request.md'), prTemplate);
    }
    // Additional methods for test compatibility
    async setSetting(key, value) {
        if (!this.config) {
            await this.load();
        }
        if (this.config) {
            this.config[key] = value;
            await this.save(this.config);
        }
    }
    async setWorkflowConfig(workflowType, config) {
        if (!this.config) {
            await this.load();
        }
        if (this.config) {
            if (!this.config.workflows) {
                this.config.workflows = {};
            }
            this.config.workflows[workflowType] = config;
            await this.save(this.config);
        }
    }
    // Alias methods for compatibility with new tools
    get(key) {
        if (!this.config) {
            return undefined;
        }
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
            value = value?.[k];
        }
        return value;
    }
    async set(key, value) {
        if (!this.config) {
            await this.load();
        }
        if (this.config) {
            const keys = key.split('.');
            let target = this.config;
            for (let i = 0; i < keys.length - 1; i++) {
                const currentKey = keys[i];
                if (!currentKey) {
                    continue;
                }
                if (!target[currentKey]) {
                    target[currentKey] = {};
                }
                target = target[currentKey];
            }
            const lastKey = keys[keys.length - 1];
            if (lastKey) {
                target[lastKey] = value;
            }
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=configuration-manager.js.map