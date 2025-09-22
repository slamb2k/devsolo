export interface TaskResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
}

export class ParallelExecutor {
  private concurrency: number;

  constructor(concurrency: number = 4) {
    this.concurrency = concurrency;
  }

  /**
   * Execute multiple tasks in parallel with limited concurrency
   */
  async executeAll<T>(
    tasks: (() => Promise<T>)[],
    options: {
      stopOnError?: boolean;
      timeout?: number;
    } = {}
  ): Promise<TaskResult<T>[]> {
    const results: TaskResult<T>[] = [];
    const executing: Promise<void>[] = [];
    let shouldStop = false;

    for (let i = 0; i < tasks.length; i++) {
      if (shouldStop && options.stopOnError) {
        break;
      }

      const taskFn = tasks[i];
      if (!taskFn) {
        continue;
      }
      const task = this.wrapTask(taskFn, options.timeout);
      const promise = task.then(
        result => {
          results[i] = result;
          if (!result.success && options.stopOnError) {
            shouldStop = true;
          }
        }
      );

      executing.push(promise);

      if (executing.length >= this.concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        executing.splice(
          0,
          executing.length,
          ...executing.filter(p => p !== promise)
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Execute tasks in batches
   */
  async executeBatch<T>(
    tasks: (() => Promise<T>)[],
    batchSize: number
  ): Promise<TaskResult<T>[]> {
    const allResults: TaskResult<T>[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(task => this.wrapTask(task))
      );
      allResults.push(...batchResults);
    }

    return allResults;
  }

  /**
   * Map over items with parallel execution
   */
  async map<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    options: {
      concurrency?: number;
      stopOnError?: boolean;
    } = {}
  ): Promise<R[]> {
    const tasks = items.map((item, index) => () => mapper(item, index));
    const executor = new ParallelExecutor(options.concurrency || this.concurrency);
    const results = await executor.executeAll(tasks, options);

    if (options.stopOnError && results.some(r => !r.success)) {
      const firstError = results.find(r => !r.success);
      throw firstError?.error || new Error('Task failed');
    }

    return results.map(r => r.result as R);
  }

  /**
   * Filter items with parallel execution
   */
  async filter<T>(
    items: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
    options: { concurrency?: number } = {}
  ): Promise<T[]> {
    const tasks = items.map((item, index) => () => predicate(item, index));
    const executor = new ParallelExecutor(options.concurrency || this.concurrency);
    const results = await executor.executeAll(tasks);

    return items.filter((_, index) => results[index]?.result === true);
  }

  /**
   * Execute tasks with retry logic
   */
  async executeWithRetry<T>(
    task: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      exponentialBackoff?: boolean;
    } = {}
  ): Promise<TaskResult<T>> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.wrapTask(task);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (attempt < maxRetries) {
        const delay = options.exponentialBackoff
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError || new Error('Task failed after retries'),
      duration: 0,
    };
  }

  /**
   * Race multiple tasks and return the first to complete
   */
  async race<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<TaskResult<T>> {
    const wrapped = tasks.map(task => this.wrapTask(task));
    return Promise.race(wrapped);
  }

  private async wrapTask<T>(
    task: () => Promise<T>,
    timeout?: number
  ): Promise<TaskResult<T>> {
    const startTime = Date.now();

    try {
      const promise = task();
      const result = timeout
        ? await this.withTimeout(promise, timeout)
        : await promise;

      return {
        success: true,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timed out')), timeout)
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const parallelExecutor = new ParallelExecutor();