#!/usr/bin/env node

/**
 * Post-install script for devsolo-cli
 * Launches the interactive installer wizard after npm installation
 * Configures MCP server for Claude Code if available
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Skip in CI environments
if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
  console.log('CI environment detected - skipping interactive setup');
  console.log('Run "devsolo configure" to set up manually');
  process.exit(0);
}

// Skip if installed as Claude Code plugin
if (process.env['CLAUDE_PLUGIN_ROOT']) {
  console.log('✅ Installed as Claude Code plugin - no setup required');
  console.log('📋 Plugin will be automatically configured by Claude Code');
  process.exit(0);
}

// Skip if running in npm scripts context that shouldn't trigger installer
if (process.env.npm_lifecycle_event === 'prepare' ||
    process.env.npm_lifecycle_event === 'prepack' ||
    process.env.npm_lifecycle_event === 'prepublishOnly') {
  process.exit(0);
}

// Skip if explicitly disabled
if (process.env.DEVSOLO_SKIP_INSTALL === 'true' ||
    process.env.SKIP_POSTINSTALL === 'true') {
  console.log('Skipping devsolo setup (DEVSOLO_SKIP_INSTALL=true)');
  console.log('Run "devsolo configure" to set up manually');
  process.exit(0);
}

// Detect if this is an update vs fresh install
function isUpgrade() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const globalConfig = path.join(home, '.devsolo', 'config.yaml');
  const localConfig = path.join(process.cwd(), '.devsolo', 'config.yaml');

  return fs.existsSync(globalConfig) || fs.existsSync(localConfig);
}

// Detect installation type
function detectInstallationType() {
  // Check for NPX
  if (process.env.npm_command === 'exec' ||
      process.env.npm_lifecycle_event === 'npx' ||
      process.env._?.includes('npx')) {
    return 'npx';
  }

  // Check for global
  if (process.env.npm_config_global === 'true' ||
      __dirname.includes('npm/node_modules') ||
      __dirname.includes('.nvm/versions')) {
    return 'global';
  }

  return 'local';
}

// Check if Claude Code is available
function hasClaudeCode() {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  const installType = detectInstallationType();
  console.log(`\n🚀 devsolo installation detected: ${installType}\n`);
  // Build the path to the installer wizard
  const installerPath = path.join(__dirname, '..', 'dist', 'cli', 'InstallerWizard.js');

  // Check if built files exist
  if (!fs.existsSync(installerPath)) {
    console.log('Building devsolo...');
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve) => {
      buildProcess.on('close', resolve);
    });
  }

  if (isUpgrade()) {
    console.log('\n🔄 devsolo is already configured');
    console.log('Run "devsolo configure" to modify settings\n');
    process.exit(0);
  }

  // Launch the installer wizard
  console.log('\n🚀 Launching devsolo setup wizard...\n');

  // Pass installation type to the wizard
  const env = { ...process.env, DEVSOLO_INSTALL_TYPE: installType };

  const installer = spawn('node', [installerPath], {
    stdio: 'inherit',
    shell: false,
    env
  });

  installer.on('error', (error) => {
    console.error('Failed to launch installer:', error.message);
    console.log('\nYou can run the installer manually with: devsolo configure');
    process.exit(1);
  });

  installer.on('close', async (code) => {
    if (code !== 0) {
      console.log('\nSetup was not completed.');
      console.log('You can run the installer again with: devsolo configure');
      process.exit(code);
    }

    // After successful installation, offer MCP configuration
    if (installType !== 'npx' && hasClaudeCode()) {
      console.log('\n🔧 Claude Code detected!');
      console.log('To configure MCP server, run: devsolo init');
      console.log('This will set up the devsolo MCP server for use with Claude Code.\n');
    }

    process.exit(code);
  });
}

// Run the installer
main().catch(error => {
  console.error('Installation error:', error.message);
  process.exit(1);
});