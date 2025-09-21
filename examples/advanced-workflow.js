#!/usr/bin/env node

/**
 * Advanced han-solo workflow example using the JavaScript API
 */

const { execSync } = require('child_process');

// Helper function to run han-solo commands
function hansolo(command) {
  console.log(`Running: hansolo ${command}`);
  try {
    const output = execSync(`hansolo ${command}`, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Helper to run git commands
function git(command) {
  return execSync(`git ${command}`, { encoding: 'utf8' }).trim();
}

async function main() {
  console.log('=== Advanced han-solo Workflow ===\n');

  // 1. Initialize if needed
  console.log('Step 1: Checking initialization...');
  try {
    hansolo('status');
  } catch {
    console.log('Not initialized, running init...');
    hansolo('init');
  }

  // 2. Check for existing sessions
  console.log('\nStep 2: Checking existing sessions...');
  const sessions = hansolo('sessions --json');
  console.log(`Active sessions: ${sessions}`);

  // 3. Create a feature branch with timestamp
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const branchName = `feature/auto-${timestamp}`;
  console.log(`\nStep 3: Creating branch ${branchName}...`);
  hansolo(`launch --branch ${branchName}`);

  // 4. Make some changes (simulated)
  console.log('\nStep 4: Making changes...');
  execSync('echo "// Automated change" >> example.js');
  git('add .');

  // 5. Ship with automated commit message
  console.log('\nStep 5: Shipping changes...');
  const commitMsg = 'feat: automated workflow example';
  hansolo(`ship --message "${commitMsg}" --push`);

  // 6. Create PR if GitHub is configured
  if (process.env.GITHUB_TOKEN) {
    console.log('\nStep 6: Creating pull request...');
    hansolo('ship --create-pr');
  }

  // 7. Show final status
  console.log('\nStep 7: Final status:');
  hansolo('status');

  console.log('\n=== Workflow Complete ===');
}

// Run the workflow
main().catch(error => {
  console.error('Workflow failed:', error);
  process.exit(1);
});