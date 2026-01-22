import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportLoggingInterceptor } from '@report/interceptors/reportLogging.interceptor';
import { lastValueFrom, of, throwError } from 'rxjs';

describe('ReportLoggingInterceptor', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  const buildContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  const buildHandler = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  describe('intercept', () => {
    it('Given: logging disabled When: intercepting Then: should skip logging', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => (key === 'REPORT_LOGGING_ENABLED' ? false : undefined)),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
      });
      const handler = buildHandler({ data: { ok: true } });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('Given: export request When: response succeeds Then: should log start and success with size', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'info';
          if (key === 'REPORT_LOGGING_CACHE_HITS') return true;
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'POST',
        url: '/reports/stock/export',
        ip: '127.0.0.1',
        query: {},
        body: {},
        user: { id: 'user-1', orgId: 'org-1' },
      });
      const responsePayload = { data: { rows: [1, 2, 3] }, fromCache: true };
      const handler = buildHandler(responsePayload);
      const expectedSize = JSON.stringify(responsePayload.data).length;

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(logSpy).toHaveBeenCalled();
      const successCall = logSpy.mock.calls.find(call => String(call[0]).includes('SUCCESS'));
      expect(successCall).toBeDefined();
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          reportType: 'stock',
          reportFormat: undefined,
          fromCache: true,
          size: expectedSize,
        })
      );
    });

    it('Given: view request When: handler fails Then: should log error and rethrow', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'info';
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/sales/view',
        ip: '127.0.0.1',
        query: { type: 'sales' },
        body: {},
        user: { id: 'user-2', orgId: 'org-2' },
      });
      const handler: CallHandler = {
        handle: () => throwError(() => ({ status: 400, message: 'boom' })),
      };

      // Act & Assert
      await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toBeDefined();
      expect(errorSpy).toHaveBeenCalled();
      const errorCall = errorSpy.mock.calls.find(call => String(call[0]).includes('ERROR'));
      expect(errorCall?.[1]).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'boom',
        })
      );
    });
  });
});
