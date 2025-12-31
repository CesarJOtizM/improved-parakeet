import * as crypto from 'crypto';

import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  shouldCacheReport,
  getTtlForView,
  getTtlForExport,
  DEFAULT_CACHE_TTL,
} from '../constants/reportCache.constants';

import type { IReportParametersInput } from '../valueObjects/reportParameters.valueObject';

@Injectable()
export class ReportCacheService {
  private readonly logger = new Logger(ReportCacheService.name);
  private readonly CACHE_PREFIX = 'report:';
  private readonly cacheEnabled: boolean;
  private readonly defaultTtlView: number;
  private readonly defaultTtlExport: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService
  ) {
    this.cacheEnabled = this.configService.get<boolean>('REPORT_CACHE_ENABLED', true);
    this.defaultTtlView =
      this.configService.get<number>('REPORT_CACHE_TTL_VIEW', DEFAULT_CACHE_TTL.VIEW) ||
      DEFAULT_CACHE_TTL.VIEW;
    this.defaultTtlExport =
      this.configService.get<number>('REPORT_CACHE_TTL_EXPORT', DEFAULT_CACHE_TTL.EXPORT) ||
      DEFAULT_CACHE_TTL.EXPORT;
  }

  /**
   * Check if a report should be cached
   */
  public isCacheable(
    reportType: string,
    parameters: IReportParametersInput,
    isExport: boolean = false
  ): boolean {
    if (!this.cacheEnabled) {
      return false;
    }

    return shouldCacheReport(reportType, parameters, isExport);
  }

  /**
   * Generate a cache key for a report
   * Format: report:{view|export}:{type}:{format?}:{hash(parameters)}
   */
  public generateKey(
    reportType: string,
    parameters: IReportParametersInput,
    format?: string,
    isExport: boolean = false
  ): string {
    const operation = isExport ? 'export' : 'view';
    const formatPart = format ? `:${format}` : '';

    // Create a hash of the parameters to ensure uniqueness
    const paramsHash = this.hashParameters(parameters);

    return `${this.CACHE_PREFIX}${operation}:${reportType}${formatPart}:${paramsHash}`;
  }

  /**
   * Get a cached report
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.cacheEnabled) {
      return null;
    }

    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a cached report
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.cacheEnabled) {
      return;
    }

    try {
      // TTL is in seconds, but cache manager expects milliseconds
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cached report with key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * Note: This is a simple implementation. For production, consider using Redis SCAN
   */
  public async invalidate(pattern: string): Promise<void> {
    if (!this.cacheEnabled) {
      return;
    }

    try {
      // Simple implementation: if pattern matches key format, try to delete
      // For full pattern matching, would need Redis SCAN or similar
      this.logger.debug(`Invalidating cache pattern: ${pattern}`);
      // Note: Full pattern matching would require Redis-specific implementation
      // For now, this is a placeholder
    } catch (error) {
      this.logger.error(`Error invalidating cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Get TTL for a view report
   */
  public getTtlForView(reportType: string): number {
    return getTtlForView(reportType, this.defaultTtlView);
  }

  /**
   * Get TTL for an export report
   */
  public getTtlForExport(reportType: string): number {
    return getTtlForExport(reportType, this.defaultTtlExport);
  }

  /**
   * Hash parameters to create a unique key
   */
  private hashParameters(parameters: IReportParametersInput): string {
    // Create a normalized object for hashing
    const normalized: Record<string, unknown> = {};

    if (parameters.dateRange) {
      normalized.dateRange = {
        startDate: parameters.dateRange.startDate.toISOString(),
        endDate: parameters.dateRange.endDate.toISOString(),
      };
    }

    if (parameters.warehouseId) normalized.warehouseId = parameters.warehouseId;
    if (parameters.productId) normalized.productId = parameters.productId;
    if (parameters.category) normalized.category = parameters.category;
    if (parameters.status) normalized.status = parameters.status;
    if (parameters.returnType) normalized.returnType = parameters.returnType;
    if (parameters.groupBy) normalized.groupBy = parameters.groupBy;
    if (parameters.period) normalized.period = parameters.period;
    if (parameters.movementType) normalized.movementType = parameters.movementType;
    if (parameters.customerReference) normalized.customerReference = parameters.customerReference;
    if (parameters.saleId) normalized.saleId = parameters.saleId;
    if (parameters.movementId) normalized.movementId = parameters.movementId;
    if (parameters.includeInactive !== undefined)
      normalized.includeInactive = parameters.includeInactive;
    if (parameters.locationId) normalized.locationId = parameters.locationId;
    if (parameters.severity) normalized.severity = parameters.severity;

    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(normalized).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = normalized[key];
    }

    // Create hash
    const jsonString = JSON.stringify(sortedObj);
    return crypto.createHash('sha256').update(jsonString).digest('hex').substring(0, 16);
  }
}
