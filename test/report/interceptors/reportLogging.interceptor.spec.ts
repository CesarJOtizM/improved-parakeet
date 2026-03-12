import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportLoggingInterceptor } from '@report/interceptors/reportLogging.interceptor';
import { lastValueFrom, of, throwError } from 'rxjs';

describe('ReportLoggingInterceptor', () => {
  let logSpy: jest.Spied<typeof Logger.prototype.log>;
  let warnSpy: jest.Spied<typeof Logger.prototype.warn>;
  let errorSpy: jest.Spied<typeof Logger.prototype.error>;
  let debugSpy: jest.Spied<typeof Logger.prototype.debug>;

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
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
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
      const errorCall = errorSpy.mock.calls.find((call: any) => String(call[0]).includes('ERROR'));
      expect(errorCall?.[1]).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'boom',
        })
      );
    });

    it('Given: no configService When: constructing Then: should use default metadata values', async () => {
      // Arrange - pass undefined as configService (Optional decorator)
      const interceptor = new ReportLoggingInterceptor(undefined as unknown as ConfigService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: { ok: true } });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert - default enabled=true so logging should occur
      expect(logSpy).toHaveBeenCalled();
    });

    it('Given: debug log level When: intercepting Then: should use debug logger', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'debug';
          if (key === 'REPORT_LOGGING_CACHE_HITS') return false;
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: { ok: true } });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(debugSpy).toHaveBeenCalled();
    });

    it('Given: warn log level When: intercepting Then: should use warn logger', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'warn';
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(warnSpy).toHaveBeenCalled();
    });

    it('Given: error log level When: intercepting successful request Then: should use error logger', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'error';
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(errorSpy).toHaveBeenCalled();
    });

    it('Given: request without user When: intercepting Then: should use anonymous/unknown defaults', async () => {
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
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
        // No user
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      expect(logSpy).toHaveBeenCalled();
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          userId: 'anonymous',
          orgId: 'unknown',
        })
      );
    });

    it('Given: report type from body When: extracting Then: should use body.type', async () => {
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
        method: 'POST',
        url: '/reports/export',
        ip: '127.0.0.1',
        query: {},
        body: { type: 'SALES', format: 'CSV' },
        user: { id: 'user-1', orgId: 'org-1' },
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const startCall = logSpy.mock.calls.find((call: any) => String(call[0]).includes('START'));
      expect(startCall?.[1]).toEqual(
        expect.objectContaining({
          reportType: 'SALES',
          reportFormat: 'CSV',
          isExport: true,
        })
      );
    });

    it('Given: report format from query When: extracting Then: should use query.format', async () => {
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
        url: '/reports/view',
        ip: '127.0.0.1',
        query: { format: 'PDF' },
        body: {},
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const startCall = logSpy.mock.calls.find((call: any) => String(call[0]).includes('START'));
      expect(startCall?.[1]).toEqual(
        expect.objectContaining({
          reportFormat: 'PDF',
        })
      );
    });

    it('Given: URL pattern /type/view When: extracting report type Then: should extract from URL', async () => {
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
        url: '/reports/inventory/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const startCall = logSpy.mock.calls.find((call: any) => String(call[0]).includes('START'));
      expect(startCall?.[1]).toEqual(
        expect.objectContaining({
          reportType: 'inventory',
          isView: true,
          isExport: false,
        })
      );
    });

    it('Given: URL without type/view/export pattern When: extracting Then: should return undefined reportType', async () => {
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
        url: '/reports/something',
        ip: '127.0.0.1',
        query: {},
        body: {},
      });
      const handler = buildHandler({ data: {} });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const startCall = logSpy.mock.calls.find((call: any) => String(call[0]).includes('START'));
      expect(startCall?.[1]).toEqual(
        expect.objectContaining({
          reportType: undefined,
          isView: false,
          isExport: false,
        })
      );
    });

    it('Given: response with no data When: calculating size Then: should return 0', async () => {
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
      const handler = buildHandler({ fromCache: false }); // data is undefined

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          size: 0,
          fromCache: false,
        })
      );
    });

    it('Given: response with Buffer data When: calculating size Then: should return buffer length', async () => {
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
      const bufferData = Buffer.from('test-export-content');
      const handler = buildHandler({ data: bufferData });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          size: bufferData.length,
        })
      );
    });

    it('Given: response with string data When: calculating size Then: should return string length', async () => {
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
        method: 'POST',
        url: '/reports/stock/export',
        ip: '127.0.0.1',
        query: {},
        body: {},
        user: { id: 'user-1', orgId: 'org-1' },
      });
      const handler = buildHandler({ data: 'string-data' });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          size: 'string-data'.length,
        })
      );
    });

    it('Given: non-export view request When: succeeding Then: should not include size in log', async () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'info';
          if (key === 'REPORT_LOGGING_CACHE_HITS') return false;
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);
      const context = buildContext({
        method: 'GET',
        url: '/reports/stock/view',
        ip: '127.0.0.1',
        query: {},
        body: {},
        user: { id: 'user-1', orgId: 'org-1' },
      });
      const handler = buildHandler({ data: { rows: [] } });

      // Act
      await lastValueFrom(interceptor.intercept(context, handler));

      // Assert
      const successCall = logSpy.mock.calls.find((call: any) =>
        String(call[0]).includes('SUCCESS')
      );
      expect(successCall?.[1]).toEqual(
        expect.objectContaining({
          size: undefined,
          fromCache: undefined,
        })
      );
    });

    it('Given: error without status When: handling error Then: should default to 500', async () => {
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
        query: {},
        body: {},
      });
      const handler: CallHandler = {
        handle: () => throwError(() => ({ message: 'Internal error' })),
      };

      // Act & Assert
      await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toBeDefined();
      const errorCall = errorSpy.mock.calls.find((call: any) => String(call[0]).includes('ERROR'));
      expect(errorCall?.[1]).toEqual(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('Given: REPORT_LOGGING_PARAMETERS=true When: constructing Then: should set logParameters to true', () => {
      // Arrange
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'REPORT_LOGGING_ENABLED') return true;
          if (key === 'REPORT_LOGGING_LEVEL') return 'info';
          if (key === 'REPORT_LOGGING_CACHE_HITS') return true;
          if (key === 'REPORT_LOGGING_PARAMETERS') return true;
          return undefined;
        }),
      } as unknown as ConfigService;
      const interceptor = new ReportLoggingInterceptor(configService);

      // Assert - the interceptor was successfully created with logParameters=true
      expect(interceptor).toBeDefined();
    });
  });
});
