#!/usr/bin/env node

/**
 * Build script for Claude Code plugin distribution
 *
 * This script:
 * 1. Builds TypeScript source
 * 2. Creates plugin distribution directory
 * 3. Copies plugin manifest, MCP server, slash commands, and agents
 * 4. Bundles necessary dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, colors.red);
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    error(`Source path does not exist: ${src}`);
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);

    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const distPluginDir = path.join(rootDir, 'dist-plugin');

  log('\n🚀 Building Claude Code Plugin for han-solo\n', colors.bright);

  // Step 1: Clean previous build
  info('Step 1: Cleaning previous plugin build...');
  if (fs.existsSync(distPluginDir)) {
    fs.rmSync(distPluginDir, { recursive: true, force: true });
  }
  success('Cleaned dist-plugin directory');

  // Step 2: Build TypeScript source
  info('Step 2: Building TypeScript source...');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    execSync('npm run build:mcp', { cwd: rootDir, stdio: 'inherit' });
    success('TypeScript compilation complete');
  } catch (err) {
    error('TypeScript build failed');
  }

  // Step 3: Create plugin directory structure
  info('Step 3: Creating plugin directory structure...');
  fs.mkdirSync(distPluginDir, { recursive: true });
  fs.mkdirSync(path.join(distPluginDir, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(distPluginDir, 'commands'), { recursive: true });
  fs.mkdirSync(path.join(distPluginDir, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(distPluginDir, 'dist', 'mcp'), { recursive: true });
  success('Plugin directory structure created');

  // Step 4: Copy plugin manifest
  info('Step 4: Copying plugin manifest...');
  const manifestSrc = path.join(rootDir, '.claude-plugin', 'plugin.json');
  const manifestDest = path.join(distPluginDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifestSrc)) {
    error('Plugin manifest not found at .claude-plugin/plugin.json');
  }
  fs.copyFileSync(manifestSrc, manifestDest);
  success('Plugin manifest copied');

  // Step 5: Copy compiled MCP server
  info('Step 5: Copying compiled MCP server...');
  const mcpServerSrc = path.join(rootDir, 'dist', 'mcp', 'hansolo-mcp-server.js');
  const mcpServerDest = path.join(distPluginDir, 'dist', 'mcp', 'hansolo-mcp-server.js');
  if (!fs.existsSync(mcpServerSrc)) {
    error('MCP server not found. Did TypeScript build complete?');
  }

  // Copy entire dist directory to preserve dependencies
  copyRecursive(path.join(rootDir, 'dist'), path.join(distPluginDir, 'dist'));
  success('MCP server and dependencies copied');

  // Step 6: Copy slash commands
  info('Step 6: Copying slash commands...');
  const commandsSrc = path.join(rootDir, '.claude', 'commands', 'hansolo');
  const commandsDest = path.join(distPluginDir, 'commands');
  if (!fs.existsSync(commandsSrc)) {
    error('Slash commands not found at .claude/commands/hansolo/');
  }
  copyRecursive(commandsSrc, commandsDest);
  const commandCount = fs.readdirSync(commandsDest).length;
  success(`${commandCount} slash commands copied`);

  // Step 7: Copy sub-agents
  info('Step 7: Copying sub-agents...');
  const agentsSrc = path.join(rootDir, '.claude', 'agents');
  const agentsDest = path.join(distPluginDir, 'agents');
  if (!fs.existsSync(agentsSrc)) {
    error('Agents not found at .claude/agents/');
  }
  copyRecursive(agentsSrc, agentsDest);
  const agentCount = fs.readdirSync(agentsDest).length;
  success(`${agentCount} sub-agents copied`);

  // Step 8: Copy node_modules (bundled dependencies)
  info('Step 8: Bundling dependencies...');
  const nodeModulesSrc = path.join(rootDir, 'node_modules');
  const nodeModulesDest = path.join(distPluginDir, 'node_modules');
  if (!fs.existsSync(nodeModulesSrc)) {
    error('node_modules not found. Run npm install first.');
  }

  // Copy only production dependencies
  log('   (This may take a minute...)', colors.yellow);
  copyRecursive(nodeModulesSrc, nodeModulesDest);
  success('Dependencies bundled');

  // Step 9: Copy essential files
  info('Step 9: Copying essential files...');
  const filesToCopy = ['README.md', 'LICENSE', 'package.json'];
  filesToCopy.forEach(file => {
    const src = path.join(rootDir, file);
    const dest = path.join(distPluginDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  success('Essential files copied');

  // Step 10: Generate plugin metadata
  info('Step 10: Generating plugin metadata...');
  const metadata = {
    buildDate: new Date().toISOString(),
    version: require(path.join(rootDir, 'package.json')).version,
    nodeVersion: process.version,
  };
  fs.writeFileSync(
    path.join(distPluginDir, '.plugin-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  success('Plugin metadata generated');

  log('\n✨ Plugin build complete!\n', colors.bright + colors.green);
  log(`📦 Plugin package location: ${distPluginDir}`, colors.blue);
  log('Next steps:', colors.bright);
  log('  1. Run "npm run package:plugin" to create distributable archive');
  log('  2. Test plugin installation with local marketplace');
  log('');
}

// Run build
try {
  main();
} catch (err) {
  error(`Build failed: ${err.message}`);
}
