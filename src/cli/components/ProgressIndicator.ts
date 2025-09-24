import chalk from 'chalk';

export class ProgressIndicator {
  private lastStep: number = 0;

  update(current: number, total: number, stepName: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(current, total);

    // Clear previous lines if not first update
    if (this.lastStep > 0) {
      process.stdout.write('\x1b[2K\r'); // Clear current line
    }

    console.log();
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
    console.log(chalk.cyan(`  Step ${current} of ${total}: `) + chalk.white.bold(stepName));
    console.log();
    console.log(`  ${progressBar} ${percentage}%`);
    console.log();
    console.log(chalk.gray('─'.repeat(60)));
    console.log();

    this.lastStep = current;
  }

  private createProgressBar(current: number, total: number): string {
    const barLength = 40;
    const filled = Math.round((current / total) * barLength);
    const empty = barLength - filled;

    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));

    return `[${filledBar}${emptyBar}]`;
  }

  showSpinner(message: string): void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const interval = setInterval(() => {
      const frame = frames[i % frames.length];
      process.stdout.write(`\r${chalk.cyan(frame)} ${message}`);
      i++;
    }, 80);

    return interval as any;
  }

  stopSpinner(interval: any): void {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
  }
}