#!/usr/bin/env node

/**
 * Package script for Claude Code plugin distribution
 *
 * This script:
 * 1. Validates plugin structure
 * 2. Validates plugin.json schema
 * 3. Creates .tar.gz archive
 * 4. Generates SHA256 checksum
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function validatePluginStructure(pluginDir) {
  const requiredFiles = [
    '.claude-plugin/plugin.json',
    'dist/mcp/devsolo-mcp-server.js',
    'commands',
    'agents',
    'node_modules',
  ];

  info('Validating plugin structure...');

  requiredFiles.forEach(file => {
    const fullPath = path.join(pluginDir, file);
    if (!fs.existsSync(fullPath)) {
      error(`Required file/directory missing: ${file}`);
    }
  });

  success('Plugin structure is valid');
}

function validatePluginManifest(pluginDir) {
  info('Validating plugin manifest...');

  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');

  let manifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (err) {
    error(`Invalid JSON in plugin.json: ${err.message}`);
  }

  // Required fields
  const requiredFields = ['name', 'displayName', 'description', 'version', 'mcpServers'];
  requiredFields.forEach(field => {
    if (!manifest[field]) {
      error(`Missing required field in plugin.json: ${field}`);
    }
  });

  // Validate MCP server configuration
  if (!manifest.mcpServers.devsolo) {
    error('MCP server "devsolo" not configured in plugin.json');
  }

  const mcpServer = manifest.mcpServers.devsolo;
  if (!mcpServer.command || !mcpServer.args) {
    error('MCP server configuration missing command or args');
  }

  // Check that MCP server path uses CLAUDE_PLUGIN_ROOT
  const serverPath = mcpServer.args[0];
  if (!serverPath.includes('${CLAUDE_PLUGIN_ROOT}')) {
    warning('MCP server path does not use ${CLAUDE_PLUGIN_ROOT} variable');
  }

  success(`Plugin manifest is valid (version ${manifest.version})`);
  return manifest;
}

function createArchive(pluginDir, outputDir, version) {
  info('Creating plugin archive...');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const archiveName = `devsolo-plugin-v${version}.tar.gz`;
  const archivePath = path.join(outputDir, archiveName);

  // Remove old archive if exists
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  try {
    // Create tar.gz archive (change to parent dir to avoid including dist-plugin in paths)
    const parentDir = path.dirname(pluginDir);
    const pluginDirName = path.basename(pluginDir);

    execSync(
      `tar -czf "${archivePath}" -C "${parentDir}" "${pluginDirName}"`,
      { stdio: 'inherit' }
    );

    success(`Archive created: ${archiveName}`);
    return archivePath;
  } catch (err) {
    error(`Failed to create archive: ${err.message}`);
  }
}

function generateChecksum(archivePath) {
  info('Generating SHA256 checksum...');

  const fileBuffer = fs.readFileSync(archivePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const checksum = hashSum.digest('hex');

  const checksumPath = `${archivePath}.sha256`;
  fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(archivePath)}\n`);

  success(`Checksum: ${checksum}`);
  return checksum;
}

function getArchiveSize(archivePath) {
  const stats = fs.statSync(archivePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  return sizeMB;
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const pluginDir = path.join(rootDir, 'dist-plugin');
  const outputDir = path.join(rootDir, 'packages');

  log('\n📦 Packaging Claude Code Plugin for devsolo\n', colors.bright);

  // Step 1: Check that plugin build exists
  if (!fs.existsSync(pluginDir)) {
    error('Plugin build not found. Run "npm run build:plugin" first.');
  }

  // Step 2: Validate plugin structure
  validatePluginStructure(pluginDir);

  // Step 3: Validate plugin manifest
  const manifest = validatePluginManifest(pluginDir);

  // Step 4: Create archive
  const archivePath = createArchive(pluginDir, outputDir, manifest.version);

  // Step 5: Generate checksum
  const checksum = generateChecksum(archivePath);

  // Step 6: Display summary
  const archiveSize = getArchiveSize(archivePath);

  log('\n✨ Plugin packaging complete!\n', colors.bright + colors.green);
  log('Package Details:', colors.bright);
  log(`  Name: ${manifest.displayName}`, colors.blue);
  log(`  Version: ${manifest.version}`, colors.blue);
  log(`  Size: ${archiveSize} MB`, colors.blue);
  log(`  Archive: ${path.relative(rootDir, archivePath)}`, colors.blue);
  log(`  Checksum: ${checksum.substring(0, 16)}...`, colors.blue);
  log('\nNext steps:', colors.bright);
  log('  1. Test plugin installation with local marketplace');
  log('  2. Distribute plugin package to users');
  log('  3. Submit to Claude Code marketplace (when available)');
  log('');
}

// Run packaging
try {
  main();
} catch (err) {
  error(`Packaging failed: ${err.message}`);
}
