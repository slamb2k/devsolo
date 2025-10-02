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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HooksStrategyService = void 0;
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const inquirer_1 = __importDefault(require("inquirer"));
class HooksStrategyService {
    /**
     * Determine the best hook manager based on project analysis
     */
    async recommendHookManager() {
        const factors = await this.analyzeProject();
        // Check for existing hook managers
        if (factors.hasHusky) {
            console.log('💡 Detected existing Husky setup');
            return 'husky';
        }
        if (factors.hasLefthook) {
            console.log('💡 Detected existing Lefthook setup');
            return 'lefthook';
        }
        // Recommend based on project characteristics
        if (factors.teamSize > 10 || factors.hasMonorepo) {
            console.log('💡 Recommended: Lefthook (better for large projects)');
            return 'lefthook';
        }
        console.log('💡 Recommended: Husky (simpler setup)');
        return 'husky';
    }
    /**
     * Analyze project characteristics
     */
    async analyzeProject() {
        let hasHusky = false;
        let hasLefthook = false;
        let hasMonorepo = false;
        let teamSize = 5; // Default estimate
        // Check for Husky
        try {
            await fs.access('.husky');
            hasHusky = true;
        }
        catch {
            // Check package.json
            try {
                const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
                hasHusky = !!pkg.devDependencies?.husky;
            }
            catch {
                // No package.json or husky
            }
        }
        // Check for Lefthook
        try {
            await fs.access('lefthook.yml');
            hasLefthook = true;
        }
        catch {
            try {
                const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
                hasLefthook = !!pkg.devDependencies?.lefthook;
            }
            catch {
                // No lefthook
            }
        }
        // Check for monorepo
        try {
            await fs.access('lerna.json');
            hasMonorepo = true;
        }
        catch {
            try {
                await fs.access('pnpm-workspace.yaml');
                hasMonorepo = true;
            }
            catch {
                // Check for workspaces in package.json
                try {
                    const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
                    hasMonorepo = !!pkg.workspaces;
                }
                catch {
                    // Not a monorepo
                }
            }
        }
        // Estimate team size from git contributors
        try {
            const contributors = (0, child_process_1.execSync)('git shortlog -sn --all', { encoding: 'utf-8' });
            teamSize = contributors.split('\n').filter(line => line.trim()).length;
        }
        catch {
            // Can't get contributors
        }
        return { hasHusky, hasLefthook, hasMonorepo, teamSize };
    }
    /**
     * Install hooks based on selected strategy
     */
    async installHooks(config) {
        switch (config.manager) {
            case 'husky':
                await this.installHuskyHooks(config.scope === 'team');
                break;
            case 'lefthook':
                await this.installLefthookHooks(config.scope === 'team');
                break;
            case 'simple':
                await this.installSimpleHooks(config.scope === 'team');
                break;
            case 'none':
                console.log('⏭️  Skipping git hooks installation');
                break;
        }
    }
    /**
     * Install Husky hooks
     */
    async installHuskyHooks(forTeam) {
        if (!forTeam) {
            await this.installPersonalHooks();
            return;
        }
        // Check if Husky is installed
        let huskyInstalled = false;
        try {
            const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
            huskyInstalled = !!pkg.devDependencies?.husky;
        }
        catch {
            // No package.json
        }
        if (!huskyInstalled) {
            console.log('📦 Installing husky...');
            (0, child_process_1.execSync)('npm install --save-dev husky', { stdio: 'inherit' });
            (0, child_process_1.execSync)('npx husky init', { stdio: 'inherit' });
        }
        // Create pre-commit hook
        const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check for han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active!"
  echo "📝 Use: hansolo ship"
  exit 1
fi

# Prevent direct commits to main
branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "❌ No direct commits to $branch"
  echo "📝 Use: hansolo launch"
  exit 1
fi
`;
        await fs.mkdir('.husky', { recursive: true });
        await fs.writeFile('.husky/pre-commit', preCommitContent, { mode: 0o755 });
        // Create pre-push hook
        const prePushContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check for han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active!"
  echo "📝 Use: hansolo ship --push"
  exit 1
fi

# Prevent direct pushes to main
branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "❌ No direct pushes to $branch"
  exit 1
fi
`;
        await fs.writeFile('.husky/pre-push', prePushContent, { mode: 0o755 });
        console.log('✅ Husky hooks configured for team');
    }
    /**
     * Install Lefthook hooks
     */
    async installLefthookHooks(forTeam) {
        if (!forTeam) {
            await this.installPersonalHooks();
            return;
        }
        // Check if Lefthook is installed
        let lefthookInstalled = false;
        try {
            const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
            lefthookInstalled = !!pkg.devDependencies?.lefthook;
        }
        catch {
            // No package.json
        }
        if (!lefthookInstalled) {
            console.log('📦 Installing lefthook...');
            (0, child_process_1.execSync)('npm install --save-dev lefthook', { stdio: 'inherit' });
        }
        // Create lefthook.yml
        const lefthookConfig = `# Lefthook configuration for han-solo
pre-commit:
  parallel: true
  commands:
    check-hansolo-session:
      run: |
        if [ -f ".hansolo/session.json" ]; then
          echo "❌ han-solo session active! Use: hansolo ship"
          exit 1
        fi

    prevent-main-commit:
      run: |
        branch=$(git branch --show-current)
        if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
          echo "❌ No direct commits to main! Use: hansolo launch"
          exit 1
        fi

pre-push:
  commands:
    check-hansolo-push:
      run: |
        if [ -f ".hansolo/session.json" ]; then
          echo "❌ han-solo session active! Use: hansolo ship --push"
          exit 1
        fi

    prevent-main-push:
      run: |
        branch=$(git branch --show-current)
        if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
          echo "❌ No direct pushes to main!"
          exit 1
        fi

# Optional: Commit message validation
commit-msg:
  commands:
    validate-format:
      run: |
        if [ -f ".hansolo/session.json" ]; then
          # han-solo manages commit messages
          exit 0
        fi
        # Add your commit message validation here if needed
`;
        await fs.writeFile('lefthook.yml', lefthookConfig);
        (0, child_process_1.execSync)('npx lefthook install', { stdio: 'inherit' });
        console.log('✅ Lefthook configured for team');
    }
    /**
     * Install simple hooks (no dependencies)
     */
    async installSimpleHooks(forTeam) {
        if (!forTeam) {
            await this.installPersonalHooks();
            return;
        }
        // Create hooks directory
        await fs.mkdir('.hansolo/hooks', { recursive: true });
        // Create the hook script
        const hookScript = `#!/bin/sh
# Simple han-solo git hooks (no external dependencies)

HOOK_TYPE=$1

check_hansolo_session() {
  if [ -f ".hansolo/session.json" ]; then
    echo "❌ han-solo session active!"
    echo "📝 Use han-solo commands instead of direct git"
    exit 1
  fi
}

check_main_branch() {
  branch=$(git branch --show-current)
  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    echo "❌ Direct operations on $branch not allowed"
    exit 1
  fi
}

case "$HOOK_TYPE" in
  pre-commit)
    check_hansolo_session
    check_main_branch
    ;;
  pre-push)
    check_hansolo_session
    check_main_branch
    ;;
esac
`;
        await fs.writeFile('.hansolo/hooks/git-hooks.sh', hookScript, { mode: 0o755 });
        // Update package.json to install hooks
        try {
            const pkgPath = 'package.json';
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
            if (!pkg.scripts) {
                pkg.scripts = {};
            }
            pkg.scripts.prepare = pkg.scripts.prepare || 'hansolo hooks install';
            await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
        }
        catch {
            console.log('⚠️  Could not update package.json scripts');
        }
        console.log('✅ Simple hooks configured (no dependencies)');
    }
    /**
     * Install personal hooks (not shared with team)
     */
    async installPersonalHooks() {
        const gitHooksPath = '.git/hooks';
        // Pre-commit hook
        const preCommitHook = `#!/bin/sh
# Personal han-solo hook - not shared with team

# Check for han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active! Use 'hansolo ship' to commit"
  exit 1
fi

# Prevent direct commits to main
branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "❌ Direct commits to $branch not allowed"
  exit 1
fi
`;
        // Pre-push hook
        const prePushHook = `#!/bin/sh
# Personal han-solo hook - not shared with team

# Check for han-solo session
if [ -f ".hansolo/session.json" ]; then
  echo "❌ han-solo session active! Use 'hansolo ship --push' to push"
  exit 1
fi

# Prevent direct pushes to main
branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "❌ Direct pushes to $branch not allowed"
  exit 1
fi
`;
        await fs.mkdir(gitHooksPath, { recursive: true });
        await fs.writeFile(`${gitHooksPath}/pre-commit`, preCommitHook, { mode: 0o755 });
        await fs.writeFile(`${gitHooksPath}/pre-push`, prePushHook, { mode: 0o755 });
        console.log('✅ Personal git hooks installed (not shared with team)');
    }
    /**
     * Prompt user for hook configuration
     */
    async promptForHookConfiguration(isGlobalInstall) {
        if (isGlobalInstall) {
            // Global installs are always personal
            return {
                manager: 'simple',
                scope: 'personal',
                installPath: '.git/hooks',
            };
        }
        const { manager } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'manager',
                message: 'Choose git hooks manager:',
                choices: [
                    { name: 'Husky (recommended - most popular)', value: 'husky' },
                    { name: 'Lefthook (faster - better for large teams)', value: 'lefthook' },
                    { name: 'Simple hooks (no dependencies)', value: 'simple' },
                    { name: 'Skip hooks installation', value: 'none' },
                ],
                default: await this.recommendHookManager(),
            },
        ]);
        if (manager === 'none') {
            return {
                manager: 'none',
                scope: 'personal',
                installPath: '',
            };
        }
        const { scope } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'scope',
                message: 'Configure git hooks for:',
                choices: [
                    { name: 'Entire team (shared via version control)', value: 'team' },
                    { name: 'Just me (local only)', value: 'personal' },
                ],
                default: 'team',
            },
        ]);
        return {
            manager,
            scope,
            installPath: scope === 'team' ? '.husky' : '.git/hooks',
        };
    }
}
exports.HooksStrategyService = HooksStrategyService;
//# sourceMappingURL=hooks-strategy.js.map