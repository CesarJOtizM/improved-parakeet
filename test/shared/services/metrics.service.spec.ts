import { beforeEach, describe, expect, it } from '@jest/globals';
import { MetricsService } from '@shared/services/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('incrementCounter', () => {
    it('Given: counter name When: incrementing Then: should increment by 1', () => {
      // Act
      service.incrementCounter('test_counter');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters['test_counter']).toBe(1);
    });

    it('Given: counter name with value When: incrementing Then: should increment by value', () => {
      // Act
      service.incrementCounter('test_counter', undefined, 5);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters['test_counter']).toBe(5);
    });

    it('Given: counter with labels When: incrementing Then: should create labeled key', () => {
      // Act
      service.incrementCounter('test_counter', { method: 'GET', path: '/api' });

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters['test_counter{method="GET",path="/api"}']).toBe(1);
    });

    it('Given: existing counter When: incrementing multiple times Then: should accumulate', () => {
      // Act
      service.incrementCounter('test_counter');
      service.incrementCounter('test_counter');
      service.incrementCounter('test_counter');

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters['test_counter']).toBe(3);
    });
  });

  describe('recordHistogram', () => {
    it('Given: histogram name and value When: recording Then: should store value', () => {
      // Act
      service.recordHistogram('test_histogram', 100);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.histograms['test_histogram']).toContain(100);
    });

    it('Given: histogram When: recording multiple values Then: should store all values', () => {
      // Act
      service.recordHistogram('test_histogram', 100);
      service.recordHistogram('test_histogram', 200);
      service.recordHistogram('test_histogram', 150);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.histograms['test_histogram']).toEqual([100, 200, 150]);
    });

    it('Given: histogram with labels When: recording Then: should create labeled key', () => {
      // Act
      service.recordHistogram('test_histogram', 100, { operation: 'read' });

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.histograms['test_histogram{operation="read"}']).toContain(100);
    });
  });

  describe('setGauge', () => {
    it('Given: gauge name and value When: setting Then: should store value', () => {
      // Act
      service.setGauge('test_gauge', 42);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.gauges['test_gauge']).toBe(42);
    });

    it('Given: gauge When: setting new value Then: should overwrite previous', () => {
      // Act
      service.setGauge('test_gauge', 42);
      service.setGauge('test_gauge', 100);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.gauges['test_gauge']).toBe(100);
    });

    it('Given: gauge with labels When: setting Then: should create labeled key', () => {
      // Act
      service.setGauge('test_gauge', 42, { instance: 'server-1' });

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.gauges['test_gauge{instance="server-1"}']).toBe(42);
    });
  });

  describe('recordRequestDuration', () => {
    it('Given: request info When: recording Then: should record histogram and counter', () => {
      // Act
      service.recordRequestDuration('GET', '/api/users', 150, 200);

      // Assert
      const metrics = service.getMetrics();
      expect(
        metrics.histograms['http_request_duration_ms{method="GET",path="/api/users",status="200"}']
      ).toContain(150);
      expect(
        metrics.counters['http_requests_total{method="GET",path="/api/users",status="200"}']
      ).toBe(1);
    });
  });

  describe('recordQueryDuration', () => {
    it('Given: query info When: recording Then: should record histogram and counter', () => {
      // Act
      service.recordQueryDuration('SELECT', 'users', 50);

      // Assert
      const metrics = service.getMetrics();
      expect(
        metrics.histograms['db_query_duration_ms{operation="SELECT",table="users"}']
      ).toContain(50);
      expect(metrics.counters['db_queries_total{operation="SELECT",table="users"}']).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('Given: empty service When: getting metrics Then: should return empty objects', () => {
      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.counters).toEqual({});
      expect(metrics.histograms).toEqual({});
      expect(metrics.gauges).toEqual({});
    });

    it('Given: service with mixed metrics When: getting metrics Then: should return all', () => {
      // Arrange
      service.incrementCounter('counter1');
      service.recordHistogram('histogram1', 100);
      service.setGauge('gauge1', 42);

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.counters['counter1']).toBe(1);
      expect(metrics.histograms['histogram1']).toEqual([100]);
      expect(metrics.gauges['gauge1']).toBe(42);
    });
  });
});
