#!/usr/bin/env node

import { WorkflowSession } from './models/workflow-session';
import { Configuration } from './models/configuration';
import { LaunchWorkflowStateMachine } from './state-machines/launch-workflow';
import { InitCommand } from './commands/hansolo-init';

const HANSOLO_ASCII = `
╔═══════════════════════════════════════════╗
║                                           ║
║  ██╗  ██╗ █████╗ ███╗   ██╗    ███████╗  ║
║  ██║  ██║██╔══██╗████╗  ██║    ██╔════╝  ║
║  ███████║███████║██╔██╗ ██║    ███████╗  ║
║  ██╔══██║██╔══██║██║╚██╗██║    ╚════██║  ║
║  ██║  ██║██║  ██║██║ ╚████║    ███████║  ║
║  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝  ║
║                                           ║
║       Git Workflow Automation Tool        ║
║           Enforce Linear History          ║
╚═══════════════════════════════════════════╝
`;

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    showVersion();
    return;
  }

  // Simple demo to show the system is working
  if (command === 'demo') {
    runDemo();
    return;
  }

  // Initialize command
  if (command === 'init') {
    await runInit();
    return;
  }

  // Status command
  if (command === 'status') {
    await runStatus();
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log('Run "hansolo --help" for usage information.');
  process.exit(1);
}

function showHelp(): void {
  console.log(HANSOLO_ASCII);
  console.log('\nUsage: hansolo <command> [options]');
  console.log('\nCommands:');
  console.log('  init         Initialize han-solo in your project');
  console.log('  launch       Start a new feature workflow');
  console.log('  ship         Complete workflow and merge to main');
  console.log('  hotfix       Create emergency hotfix');
  console.log('  status       Show current workflow status');
  console.log('  sessions     List all active sessions');
  console.log('  swap         Switch between sessions');
  console.log('  abort        Abort current workflow');
  console.log('  demo         Run a demonstration');
  console.log('\nOptions:');
  console.log('  --help, -h    Show this help message');
  console.log('  --version, -v Show version information');
  console.log('\nFor more information, visit: https://github.com/yourusername/hansolo');
}

function showVersion(): void {
  const packageJson = require('../package.json');
  console.log(`han-solo v${packageJson.version}`);
}

function runDemo(): void {
  console.log(HANSOLO_ASCII);
  console.log('\n🚀 Running han-solo demonstration...\n');

  // Create a demo configuration
  const config = new Configuration({
    initialized: true,
    scope: 'project',
  });

  console.log('✅ Configuration loaded:');
  console.log(`   Install path: ${config.getInstallPath()}`);
  console.log(`   Initialized: ${config.isInitialized()}`);

  // Create a demo session
  const session = new WorkflowSession({
    workflowType: 'launch',
    branchName: 'feature/demo-feature',
  });

  console.log('\n✅ Workflow session created:');
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Branch: ${session.branchName}`);
  console.log(`   Type: ${session.workflowType}`);
  console.log(`   State: ${session.currentState}`);

  // Demo state machine
  const stateMachine = new LaunchWorkflowStateMachine();
  console.log('\n✅ State machine initialized:');
  console.log(`   Initial state: ${stateMachine.getInitialState()}`);
  console.log(`   Can transition to BRANCH_READY: ${stateMachine.canTransition('INIT', 'BRANCH_READY')}`);

  // Simulate state transition
  session.transitionTo('BRANCH_READY');
  console.log('\n✅ State transition executed:');
  console.log(`   New state: ${session.currentState}`);
  console.log(`   State history: ${session.stateHistory.length} transition(s)`);
  console.log(`   Session age: ${session.getAge()}`);
  console.log(`   Time remaining: ${session.getTimeRemaining()}`);

  console.log('\n✨ Demo completed successfully!');
  console.log('   Run "hansolo init" to set up han-solo in your project.');
}

async function runInit(): Promise<void> {
  const initCommand = new InitCommand();
  await initCommand.execute();
}

async function runStatus(): Promise<void> {
  const initCommand = new InitCommand();
  await initCommand.showStatus();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}