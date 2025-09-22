export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  operationBreakdown: Record<string, {
    count: number;
    avgDuration: number;
    successRate: number;
  }>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number;
  private timers: Map<string, number> = new Map();

  constructor(maxMetrics: number = 1000) {
    this.maxMetrics = maxMetrics;
  }

  startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  endTimer(
    operationId: string,
    operation: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      console.warn(`No timer found for operation: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    this.recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      success,
      metadata,
    });

    return duration;
  }

  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operation}_${Date.now()}_${Math.random()}`;
    this.startTimer(operationId);

    try {
      const result = await fn();
      this.endTimer(operationId, operation, true, metadata);
      return result;
    } catch (error) {
      this.endTimer(operationId, operation, false, metadata);
      throw error;
    }
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getStats(since?: number): PerformanceStats {
    const relevantMetrics = since
      ? this.metrics.filter(m => m.timestamp >= since)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        operationBreakdown: {},
      };
    }

    const durations = relevantMetrics.map(m => m.duration);
    const successCount = relevantMetrics.filter(m => m.success).length;
    const operationBreakdown: Record<string, any> = {};

    // Group by operation
    const grouped = relevantMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation]!.push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);

    // Calculate per-operation stats
    for (const [op, metrics] of Object.entries(grouped)) {
      const opDurations = metrics.map(m => m.duration);
      const opSuccessCount = metrics.filter(m => m.success).length;

      operationBreakdown[op] = {
        count: metrics.length,
        avgDuration: opDurations.reduce((a, b) => a + b, 0) / opDurations.length,
        successRate: opSuccessCount / metrics.length,
      };
    }

    return {
      totalOperations: relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successCount / relevantMetrics.length,
      operationBreakdown,
    };
  }

  getSlowestOperations(limit: number = 10): PerformanceMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getFailedOperations(): PerformanceMetrics[] {
    return this.metrics.filter(m => !m.success);
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  importMetrics(metrics: PerformanceMetrics[]): void {
    this.metrics.push(...metrics);
    
    // Trim to max size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

// Singleton instance for global monitoring
export const globalMonitor = new PerformanceMonitor();