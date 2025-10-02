#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.claude.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const mode = process.argv[2] || 'dev';

if (mode === 'dev') {
  config.mcpServers.hansolo = {
    type: 'stdio',
    command: 'node',
    args: [path.join(__dirname, '../dist/mcp/index.js')],
    env: {
      HANSOLO_BASE_PATH: '${HANSOLO_BASE_PATH:-.hansolo}'
    }
  };
  console.log('✅ DEV mode enabled - using local build');
} else if (mode === 'prod') {
  config.mcpServers.hansolo = {
    type: 'stdio',
    command: 'hansolo-mcp',
    args: [],
    env: {
      HANSOLO_BASE_PATH: '${HANSOLO_BASE_PATH:-.hansolo}'
    }
  };
  console.log('✅ PROD mode enabled - using global binary');
} else {
  console.log('Usage: node toggle-mcp-mode.js [dev|prod]');
  process.exit(1);
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('⚠️  Restart Claude Code to apply changes');
