#!/usr/bin/env node

/**
 * Post-install script for @hansolo/cli
 * Launches the interactive installer wizard after npm installation
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Skip in CI environments
if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
  console.log('CI environment detected - skipping interactive setup');
  console.log('Run "hansolo configure" to set up manually');
  process.exit(0);
}

// Skip if running in npm scripts context that shouldn't trigger installer
if (process.env.npm_lifecycle_event === 'prepare' ||
    process.env.npm_lifecycle_event === 'prepack' ||
    process.env.npm_lifecycle_event === 'prepublishOnly') {
  process.exit(0);
}

// Skip if explicitly disabled
if (process.env.HANSOLO_SKIP_INSTALL === 'true' ||
    process.env.SKIP_POSTINSTALL === 'true') {
  console.log('Skipping han-solo setup (HANSOLO_SKIP_INSTALL=true)');
  console.log('Run "hansolo configure" to set up manually');
  process.exit(0);
}

// Detect if this is an update vs fresh install
function isUpgrade() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const globalConfig = path.join(home, '.hansolo', 'config.yaml');
  const localConfig = path.join(process.cwd(), '.hansolo', 'config.yaml');

  return fs.existsSync(globalConfig) || fs.existsSync(localConfig);
}

// Main execution
async function main() {
  // Build the path to the installer wizard
  const installerPath = path.join(__dirname, '..', 'dist', 'cli', 'InstallerWizard.js');

  // Check if built files exist
  if (!fs.existsSync(installerPath)) {
    console.log('Building han-solo...');
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
    console.log('\n🔄 han-solo is already configured');
    console.log('Run "hansolo configure" to modify settings\n');
    process.exit(0);
  }

  // Launch the installer wizard
  console.log('\n🚀 Launching han-solo setup wizard...\n');

  const installer = spawn('node', [installerPath], {
    stdio: 'inherit',
    shell: false
  });

  installer.on('error', (error) => {
    console.error('Failed to launch installer:', error.message);
    console.log('\nYou can run the installer manually with: hansolo configure');
    process.exit(1);
  });

  installer.on('close', (code) => {
    if (code !== 0) {
      console.log('\nSetup was not completed.');
      console.log('You can run the installer again with: hansolo configure');
    }
    process.exit(code);
  });
}

// Run the installer
main().catch(error => {
  console.error('Installation error:', error.message);
  process.exit(1);
});