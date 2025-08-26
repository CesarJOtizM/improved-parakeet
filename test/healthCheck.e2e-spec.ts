import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import request, { Response } from 'supertest';

// Mock del PrismaService para tests
const mockPrismaService = {
  $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('Health Check (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('PrismaService')
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET) - should return basic health status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: Response) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('uptime');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('environment');
        expect(['healthy', 'unhealthy', 'degraded']).toContain(res.body.status);
      });
  });

  it('/health/detailed (GET) - should return detailed health status', () => {
    return request(app.getHttpServer())
      .get('/health/detailed')
      .expect(200)
      .expect((res: Response) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('database');
        expect(res.body).toHaveProperty('system');
        expect(res.body).toHaveProperty('services');
        expect(res.body.database).toHaveProperty('status');
        expect(res.body.system).toHaveProperty('memory');
        expect(res.body.system).toHaveProperty('cpu');
        expect(res.body.system).toHaveProperty('disk');
      });
  });

  it('/health/full (GET) - should return full health status', () => {
    return request(app.getHttpServer())
      .get('/health/full')
      .expect(200)
      .expect((res: Response) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('database');
        expect(res.body).toHaveProperty('system');
        expect(res.body).toHaveProperty('services');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('uptime');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('environment');
      });
  });
});
