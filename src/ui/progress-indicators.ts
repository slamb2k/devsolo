import ora, { Ora } from 'ora';

export class ProgressIndicator {
  private spinner: Ora | null = null;
  private useSpinner: boolean;

  constructor() {
    this.useSpinner = process.stdout.isTTY && !process.env['NO_COLOR'];
  }

  start(text: string): void {
    if (this.useSpinner) {
      this.spinner = ora({
        text,
        color: 'cyan',
        spinner: 'dots',
      }).start();
    } else {
      console.log(`${text}...`);
    }
  }

  update(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    } else {
      console.log(text);
    }
  }

  succeed(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    } else if (text) {
      console.log(`✅ ${text}`);
    }
  }

  fail(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    } else if (text) {
      console.log(`❌ ${text}`);
    }
  }

  warn(text?: string): void {
    if (this.spinner) {
      this.spinner.warn(text);
      this.spinner = null;
    } else if (text) {
      console.log(`⚠️ ${text}`);
    }
  }

  info(text?: string): void {
    if (this.spinner) {
      this.spinner.info(text);
      this.spinner = null;
    } else if (text) {
      console.log(`ℹ️ ${text}`);
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  stopAndPersist(symbol?: string, text?: string): void {
    if (this.spinner) {
      this.spinner.stopAndPersist({ symbol, text });
      this.spinner = null;
    } else if (text) {
      console.log(`${symbol || '•'} ${text}`);
    }
  }

  // Multi-step progress
  async runSteps<T>(
    steps: Array<{
      name: string;
      action: () => Promise<T>;
    }>
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      const stepNumber = `[${i + 1}/${steps.length}]`;
      const stepText = `${stepNumber} ${step.name}`;

      this.start(stepText);

      try {
        const result = await step.action();
        results.push(result);
        this.succeed(`${stepNumber} ${step.name}`);
      } catch (error) {
        this.fail(`${stepNumber} ${step.name}`);
        throw error;
      }
    }

    return results;
  }

  // Progress bar for determinate operations
  progressBar(current: number, total: number, text?: string): void {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((current / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const output = `${text ? text + ' ' : ''}[${bar}] ${percentage}%`;

    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(output);

      if (current === total) {
        console.log(); // New line when complete
      }
    } else {
      console.log(output);
    }
  }

  // Countdown timer
  async countdown(seconds: number, text: string = 'Waiting'): Promise<void> {
    for (let i = seconds; i > 0; i--) {
      this.update(`${text} (${i}s remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.stop();
  }

  // Loading animation for indeterminate operations
  loadingAnimation(text: string, duration: number = 3000): Promise<void> {
    return new Promise(resolve => {
      this.start(text);
      setTimeout(() => {
        this.stop();
        resolve();
      }, duration);
    });
  }
}

// Pre-configured progress indicators for specific operations
export class WorkflowProgress extends ProgressIndicator {
  async gitOperation(operation: string, action: () => Promise<void>): Promise<void> {
    this.start(`Running Git ${operation}`);
    try {
      await action();
      this.succeed(`Git ${operation} completed`);
    } catch (error) {
      this.fail(`Git ${operation} failed`);
      throw error;
    }
  }

  async apiCall(platform: string, operation: string, action: () => Promise<void>): Promise<void> {
    this.start(`${platform}: ${operation}`);
    try {
      await action();
      this.succeed(`${platform}: ${operation} successful`);
    } catch (error) {
      this.fail(`${platform}: ${operation} failed`);
      throw error;
    }
  }

  async stateTransition(from: string, to: string, action: () => Promise<void>): Promise<void> {
    this.start(`Transitioning: ${from} → ${to}`);
    try {
      await action();
      this.succeed(`State: ${to}`);
    } catch (error) {
      this.fail(`Transition failed: ${from} → ${to}`);
      throw error;
    }
  }

  async fileOperation(operation: string, path: string, action: () => Promise<void>): Promise<void> {
    this.start(`${operation}: ${path}`);
    try {
      await action();
      this.succeed(`${operation}: ${path}`);
    } catch (error) {
      this.fail(`${operation} failed: ${path}`);
      throw error;
    }
  }
}

// Singleton instance for global use
export const progress = new WorkflowProgress();