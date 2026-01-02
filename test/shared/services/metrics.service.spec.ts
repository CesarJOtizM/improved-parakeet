// Metrics Service Tests
// Unit tests for MetricsService following AAA and Given-When-Then patterns

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MetricsService } from '@shared/services/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockLogger: { debug: jest.Mock };

  beforeEach(() => {
    service = new MetricsService();
    mockLogger = {
      debug: jest.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).logger = mockLogger;
  });

  describe('incrementCounter', () => {
    it('Given: new counter When: incrementing counter Then: should create counter with value 1', () => {
      // Arrange
      const counterName = 'test_counter';

      // Act
      service.incrementCounter(counterName);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters[counterName]).toBe(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Counter ${counterName} incremented to 1`)
      );
    });

    it('Given: existing counter When: incrementing counter Then: should increment value', () => {
      // Arrange
      const counterName = 'test_counter';
      service.incrementCounter(counterName, undefined, 5);

      // Act
      service.incrementCounter(counterName);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters[counterName]).toBe(6);
    });

    it('Given: counter with labels When: incrementing counter Then: should create counter with labels in key', () => {
      // Arrange
      const counterName = 'test_counter';
      const labels = { orgId: 'org-123', env: 'test' };

      // Act
      service.incrementCounter(counterName, labels);

      // Assert
      const metrics = service.getMetrics();
      const key = Object.keys(metrics.counters)[0];
      expect(key).toContain(counterName);
      expect(key).toContain('orgId="org-123"');
      expect(key).toContain('env="test"');
      expect(metrics.counters[key]).toBe(1);
    });

    it('Given: counter with custom value When: incrementing counter Then: should increment by custom value', () => {
      // Arrange
      const counterName = 'test_counter';
      const incrementValue = 5;

      // Act
      service.incrementCounter(counterName, undefined, incrementValue);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters[counterName]).toBe(5);
    });
  });

  describe('recordHistogram', () => {
    it('Given: new histogram When: recording value Then: should create histogram with value', () => {
      // Arrange
      const histogramName = 'test_histogram';
      const value = 100;

      // Act
      service.recordHistogram(histogramName, value);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.histograms[histogramName]).toEqual([100]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Histogram ${histogramName} recorded value ${value}`)
      );
    });

    it('Given: existing histogram When: recording value Then: should append value to array', () => {
      // Arrange
      const histogramName = 'test_histogram';
      service.recordHistogram(histogramName, 50);
      service.recordHistogram(histogramName, 75);

      // Act
      service.recordHistogram(histogramName, 100);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.histograms[histogramName]).toEqual([50, 75, 100]);
    });

    it('Given: histogram with labels When: recording value Then: should create histogram with labels in key', () => {
      // Arrange
      const histogramName = 'test_histogram';
      const labels = { operation: 'read', table: 'users' };
      const value = 42;

      // Act
      service.recordHistogram(histogramName, value, labels);

      // Assert
      const metrics = service.getMetrics();
      const key = Object.keys(metrics.histograms)[0];
      expect(key).toContain(histogramName);
      expect(key).toContain('operation="read"');
      expect(key).toContain('table="users"');
      expect(metrics.histograms[key]).toEqual([42]);
    });
  });

  describe('setGauge', () => {
    it('Given: new gauge When: setting gauge value Then: should create gauge with value', () => {
      // Arrange
      const gaugeName = 'test_gauge';
      const value = 50;

      // Act
      service.setGauge(gaugeName, value);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.gauges[gaugeName]).toBe(50);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Gauge ${gaugeName} set to ${value}`)
      );
    });

    it('Given: existing gauge When: setting new gauge value Then: should update gauge value', () => {
      // Arrange
      const gaugeName = 'test_gauge';
      service.setGauge(gaugeName, 50);

      // Act
      service.setGauge(gaugeName, 75);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.gauges[gaugeName]).toBe(75);
    });

    it('Given: gauge with labels When: setting gauge value Then: should create gauge with labels in key', () => {
      // Arrange
      const gaugeName = 'test_gauge';
      const labels = { orgId: 'org-123' };
      const value = 100;

      // Act
      service.setGauge(gaugeName, value, labels);

      // Assert
      const metrics = service.getMetrics();
      const key = Object.keys(metrics.gauges)[0];
      expect(key).toContain(gaugeName);
      expect(key).toContain('orgId="org-123"');
      expect(metrics.gauges[key]).toBe(100);
    });
  });

  describe('recordRequestDuration', () => {
    it('Given: HTTP request When: recording request duration Then: should record histogram and counter', () => {
      // Arrange
      const method = 'GET';
      const path = '/api/products';
      const duration = 150;
      const statusCode = 200;

      // Act
      service.recordRequestDuration(method, path, duration, statusCode);

      // Assert
      const metrics = service.getMetrics();
      const histogramKey = Object.keys(metrics.histograms)[0];
      const counterKey = Object.keys(metrics.counters)[0];
      expect(histogramKey).toContain('http_request_duration_ms');
      expect(histogramKey).toContain(`method="${method}"`);
      expect(histogramKey).toContain(`path="${path}"`);
      expect(histogramKey).toContain(`status="${statusCode}"`);
      expect(metrics.histograms[histogramKey]).toEqual([duration]);
      expect(counterKey).toContain('http_requests_total');
      expect(metrics.counters[counterKey]).toBe(1);
    });
  });

  describe('recordQueryDuration', () => {
    it('Given: database query When: recording query duration Then: should record histogram and counter', () => {
      // Arrange
      const operation = 'SELECT';
      const table = 'products';
      const duration = 25;

      // Act
      service.recordQueryDuration(operation, table, duration);

      // Assert
      const metrics = service.getMetrics();
      const histogramKey = Object.keys(metrics.histograms)[0];
      const counterKey = Object.keys(metrics.counters)[0];
      expect(histogramKey).toContain('db_query_duration_ms');
      expect(histogramKey).toContain(`operation="${operation}"`);
      expect(histogramKey).toContain(`table="${table}"`);
      expect(metrics.histograms[histogramKey]).toEqual([duration]);
      expect(counterKey).toContain('db_queries_total');
      expect(metrics.counters[counterKey]).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('Given: metrics with various types When: getting all metrics Then: should return all metrics grouped by type', () => {
      // Arrange
      service.incrementCounter('counter1');
      service.recordHistogram('histogram1', 100);
      service.setGauge('gauge1', 50);

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics).toHaveProperty('counters');
      expect(metrics).toHaveProperty('histograms');
      expect(metrics).toHaveProperty('gauges');
      expect(metrics.counters).toHaveProperty('counter1');
      expect(metrics.histograms).toHaveProperty('histogram1');
      expect(metrics.gauges).toHaveProperty('gauge1');
    });

    it('Given: empty metrics When: getting all metrics Then: should return empty objects', () => {
      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.counters).toEqual({});
      expect(metrics.histograms).toEqual({});
      expect(metrics.gauges).toEqual({});
    });
  });

  describe('reset', () => {
    it('Given: metrics with values When: resetting metrics Then: should clear all metrics', () => {
      // Arrange
      service.incrementCounter('counter1');
      service.recordHistogram('histogram1', 100);
      service.setGauge('gauge1', 50);

      // Act
      service.reset();

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters).toEqual({});
      expect(metrics.histograms).toEqual({});
      expect(metrics.gauges).toEqual({});
    });

    it('Given: empty metrics When: resetting metrics Then: should remain empty', () => {
      // Act
      service.reset();

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters).toEqual({});
      expect(metrics.histograms).toEqual({});
      expect(metrics.gauges).toEqual({});
    });
  });

  describe('buildKey', () => {
    it('Given: metric name without labels When: building key Then: should return name only', () => {
      // Arrange
      const name = 'test_metric';

      // Act
      service.incrementCounter(name);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters).toHaveProperty(name);
    });

    it('Given: metric name with labels When: building key Then: should return name with sorted labels', () => {
      // Arrange
      const name = 'test_metric';
      const labels = { z: 'last', a: 'first', m: 'middle' };

      // Act
      service.incrementCounter(name, labels);

      // Assert
      const metrics = service.getMetrics();
      const key = Object.keys(metrics.counters)[0];
      expect(key).toContain(name);
      expect(key).toMatch(/a="first".*m="middle".*z="last"/);
    });

    it('Given: metric name with empty labels When: building key Then: should return name only', () => {
      // Arrange
      const name = 'test_metric';
      const labels = {};

      // Act
      service.incrementCounter(name, labels);

      // Assert
      const metrics = service.getMetrics();
      expect(metrics.counters).toHaveProperty(name);
    });
  });

  describe('multi-tenancy', () => {
    it('Given: metrics with different orgIds When: recording metrics Then: should separate metrics by orgId', () => {
      // Arrange
      const counterName = 'user_actions';
      const orgId1 = 'org-123';
      const orgId2 = 'org-456';

      // Act
      service.incrementCounter(counterName, { orgId: orgId1 });
      service.incrementCounter(counterName, { orgId: orgId2 });

      // Assert
      const metrics = service.getMetrics();
      const keys = Object.keys(metrics.counters);
      expect(keys).toHaveLength(2);
      expect(keys.some(key => key.includes(`orgId="${orgId1}"`))).toBe(true);
      expect(keys.some(key => key.includes(`orgId="${orgId2}"`))).toBe(true);
    });
  });
});
