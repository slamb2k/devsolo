import { ConsoleOutput } from '../ui/console-output';
import { globalMonitor } from '../utils/performance-monitor';
import { OptimizedSessionRepository } from '../services/optimized-session-repository';
import chalk from 'chalk';

export class PerfCommand {
  private output = new ConsoleOutput();
  private sessionRepo: OptimizedSessionRepository;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new OptimizedSessionRepository(basePath);
  }

  async execute(options: {
    command?: string;
    since?: number;
    limit?: number;
  } = {}): Promise<void> {
    this.output.header('📊 Performance Monitoring');

    const command = options.command || 'stats';

    switch (command) {
      case 'stats':
        await this.showStats(options.since);
        break;
      case 'slow':
        await this.showSlowestOperations(options.limit || 10);
        break;
      case 'failed':
        await this.showFailedOperations();
        break;
      case 'session':
        await this.showSessionStats();
        break;
      case 'clear':
        await this.clearMetrics();
        break;
      default:
        this.output.errorMessage(`Unknown command: ${command}`);
        this.showHelp();
    }
  }

  private async showStats(since?: number): Promise<void> {
    const stats = globalMonitor.getStats(since);

    console.log(chalk.cyan('\n📈 Overall Performance Stats'));
    console.log(chalk.gray('─'.repeat(40)));
    
    console.log(`Total Operations: ${chalk.yellow(stats.totalOperations)}`);
    console.log(`Average Duration: ${chalk.yellow(stats.averageDuration.toFixed(2))}ms`);
    console.log(`Min Duration: ${chalk.green(stats.minDuration.toFixed(2))}ms`);
    console.log(`Max Duration: ${chalk.red(stats.maxDuration.toFixed(2))}ms`);
    console.log(`Success Rate: ${chalk.cyan((stats.successRate * 100).toFixed(1))}%`);

    console.log(chalk.cyan('\n📊 Operation Breakdown'));
    console.log(chalk.gray('─'.repeat(40)));

    const table = Object.entries(stats.operationBreakdown)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    for (const [op, data] of table) {
      const successColor = data.successRate === 1 ? chalk.green : 
                          data.successRate > 0.8 ? chalk.yellow : 
                          chalk.red;
      
      console.log(
        `${chalk.blue(op.padEnd(25))} ` +
        `Count: ${chalk.yellow(data.count.toString().padStart(4))} ` +
        `Avg: ${chalk.cyan(data.avgDuration.toFixed(2).padStart(8))}ms ` +
        `Success: ${successColor((data.successRate * 100).toFixed(0).padStart(3))}%`
      );
    }
  }

  private async showSlowestOperations(limit: number): Promise<void> {
    const slowest = globalMonitor.getSlowestOperations(limit);

    console.log(chalk.cyan(`\n🐌 Top ${limit} Slowest Operations`));
    console.log(chalk.gray('─'.repeat(40)));

    if (slowest.length === 0) {
      console.log('No operations recorded yet');
      return;
    }

    slowest.forEach((metric, index) => {
      const statusIcon = metric.success ? '✅' : '❌';
      const timestamp = new Date(metric.timestamp).toLocaleTimeString();
      
      console.log(
        `${chalk.gray(`${(index + 1).toString().padStart(2)}.`)} ` +
        `${statusIcon} ` +
        `${chalk.blue(metric.operation.padEnd(25))} ` +
        `${chalk.red(metric.duration.toFixed(2).padStart(8))}ms ` +
        `${chalk.gray(timestamp)}`
      );

      if (metric.metadata) {
        console.log(`    ${chalk.gray(JSON.stringify(metric.metadata))}`);
      }
    });
  }

  private async showFailedOperations(): Promise<void> {
    const failed = globalMonitor.getFailedOperations();

    console.log(chalk.cyan('\n❌ Failed Operations'));
    console.log(chalk.gray('─'.repeat(40)));

    if (failed.length === 0) {
      console.log(chalk.green('No failed operations! 🎉'));
      return;
    }

    failed.forEach((metric) => {
      const timestamp = new Date(metric.timestamp).toLocaleTimeString();
      
      console.log(
        `${chalk.red('✗')} ` +
        `${chalk.blue(metric.operation.padEnd(25))} ` +
        `${chalk.yellow(metric.duration.toFixed(2).padStart(8))}ms ` +
        `${chalk.gray(timestamp)}`
      );

      if (metric.metadata) {
        console.log(`  ${chalk.gray(JSON.stringify(metric.metadata))}`);
      }
    });

    console.log(`\n${chalk.red(`Total: ${failed.length} failed operations`)}`);
  }

  private async showSessionStats(): Promise<void> {
    await this.sessionRepo.initialize();
    const stats = await this.sessionRepo.getStats();

    console.log(chalk.cyan('\n💾 Session Performance Stats'));
    console.log(chalk.gray('─'.repeat(40)));
    
    console.log(`Total Sessions: ${chalk.yellow(stats.totalSessions)}`);
    console.log(`Active Sessions: ${chalk.green(stats.activeSessions)}`);
    console.log(`Cache Hit Rate: ${chalk.cyan((stats.cacheHitRate * 100).toFixed(1))}%`);
    console.log(`Avg Load Time: ${chalk.yellow(stats.averageLoadTime.toFixed(2))}ms`);
  }

  private async clearMetrics(): Promise<void> {
    globalMonitor.clear();
    this.output.successMessage('Performance metrics cleared');
  }

  private showHelp(): void {
    console.log('\nUsage: hansolo perf <command> [options]');
    console.log('\nCommands:');
    console.log('  stats    Show overall performance statistics');
    console.log('  slow     Show slowest operations');
    console.log('  failed   Show failed operations');
    console.log('  session  Show session performance stats');
    console.log('  clear    Clear all metrics');
    console.log('\nOptions:');
    console.log('  --since <ms>   Show stats since timestamp');
    console.log('  --limit <n>    Limit number of results');
  }
}