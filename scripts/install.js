#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Post-install script for @devsolo/cli
 * Sets up necessary directories and configurations after npm install
 */

const DEVSOLO_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.devsolo');
const CONFIG_FILE = path.join(DEVSOLO_DIR, 'config.yaml');
const SESSIONS_DIR = path.join(DEVSOLO_DIR, 'sessions');
const TEMPLATES_DIR = path.join(DEVSOLO_DIR, 'templates');

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

function createDefaultConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = `# devsolo Global Configuration
version: 1.0.0

# Default settings for all projects
defaults:
  autoRebase: true
  squashMerge: true
  deleteAfterMerge: true
  requireApproval: true

# Git platform preferences
platform:
  type: auto # auto | github | gitlab | bitbucket

# Visual output preferences
ui:
  colors: true
  emoji: true
  timestamps: false
  verbose: false

# Session management
sessions:
  maxConcurrent: 10
  autoCleanup: true
  cleanupAfterDays: 30
`;

    fs.writeFileSync(CONFIG_FILE, defaultConfig);
    console.log(`✓ Created default configuration: ${CONFIG_FILE}`);
  }
}

function copyTemplates() {
  const sourceTemplates = path.join(__dirname, '..', 'templates');

  if (fs.existsSync(sourceTemplates)) {
    const templates = fs.readdirSync(sourceTemplates);

    templates.forEach(template => {
      const sourcePath = path.join(sourceTemplates, template);
      const destPath = path.join(TEMPLATES_DIR, template);

      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✓ Copied template: ${template}`);
      }
    });
  }
}

function checkGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    console.log('✓ Git is installed');
    return true;
  } catch (error) {
    console.error('✗ Git is not installed or not in PATH');
    console.error('  Please install Git before using devsolo');
    return false;
  }
}

function printWelcomeMessage() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 devsolo installation complete!');
  console.log('='.repeat(60));
  console.log('\nGet started with:');
  console.log('  1. Navigate to your Git project');
  console.log('  2. Run: devsolo init');
  console.log('  3. Start a feature: devsolo launch <branch-name>');
  console.log('\nFor more information:');
  console.log('  - Run: devsolo --help');
  console.log('  - Visit: https://github.com/yourusername/devsolo');
  console.log('='.repeat(60) + '\n');
}

function main() {
  console.log('\n🔧 Setting up devsolo...\n');

  try {
    // Create necessary directories
    ensureDirectory(DEVSOLO_DIR);
    ensureDirectory(SESSIONS_DIR);
    ensureDirectory(TEMPLATES_DIR);

    // Create default configuration
    createDefaultConfig();

    // Copy templates
    copyTemplates();

    // Check dependencies
    const gitInstalled = checkGitInstalled();

    if (gitInstalled) {
      printWelcomeMessage();
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Installation failed:', error.message);
    process.exit(1);
  }
}

// Run only if called directly (not during development)
if (require.main === module) {
  main();
}