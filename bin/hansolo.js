#!/usr/bin/env node

const { main } = require('../dist/cli.js');

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});