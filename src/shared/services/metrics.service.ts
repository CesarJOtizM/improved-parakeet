import { Injectable, Logger } from '@nestjs/common';

/**
 * Metrics Service
 *
 * Collects application metrics for monitoring and observability.
 * Currently provides basic in-memory metrics collection.
 * Can be extended to export to Prometheus, StatsD, or other metrics backends.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters: Map<string, number> = new Map();
  private readonly histograms: Map<string, number[]> = new Map();
  private readonly gauges: Map<string, number> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    this.logger.debug(`Counter ${key} incremented to ${current + value}`);
  }

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    this.logger.debug(`Histogram ${key} recorded value ${value}`);
  }

  /**
   * Set a gauge value (for current state metrics)
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
    this.logger.debug(`Gauge ${key} set to ${value}`);
  }

  /**
   * Record request duration
   */
  recordRequestDuration(method: string, path: string, duration: number, statusCode: number): void {
    this.recordHistogram('http_request_duration_ms', duration, {
      method,
      path,
      status: statusCode.toString(),
    });
    this.incrementCounter('http_requests_total', {
      method,
      path,
      status: statusCode.toString(),
    });
  }

  /**
   * Record database query duration
   */
  recordQueryDuration(operation: string, table: string, duration: number): void {
    this.recordHistogram('db_query_duration_ms', duration, {
      operation,
      table,
    });
    this.incrementCounter('db_queries_total', {
      operation,
      table,
    });
  }

  /**
   * Get all metrics (for export to Prometheus/StatsD)
   */
  getMetrics(): {
    counters: Record<string, number>;
    histograms: Record<string, number[]>;
    gauges: Record<string, number>;
  } {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(this.histograms),
      gauges: Object.fromEntries(this.gauges),
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    return `${name}{${labelString}}`;
  }
}
