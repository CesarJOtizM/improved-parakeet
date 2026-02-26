import { Prisma, PrismaClient } from '@infrastructure/database/generated/prisma';
import { IUser } from '@shared/types/database.types';

function daysAgo(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + (hours % 10), Math.floor(Math.random() * 60));
  return d;
}

export class DemoAuditLogsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string, users: IUser[]): Promise<void> {
    const entries: Prisma.AuditLogCreateManyInput[] = [];
    const activeUsers = users.filter(u => u.isActive);

    const user = (idx: number) => activeUsers[idx % activeUsers.length]?.id || null;

    // === Login events (~2 per active user per week for 52 weeks) ===
    for (let week = 0; week < 52; week++) {
      for (let u = 0; u < activeUsers.length; u++) {
        // Some users log in more frequently
        const logins = u < 3 ? 3 : 1;
        for (let l = 0; l < logins; l++) {
          const day = week * 7 + l * 2;
          if (day > 365) continue;
          entries.push({
            orgId,
            entityType: 'User',
            action: 'LOGIN',
            performedBy: activeUsers[u].id,
            metadata: { ip: `192.168.1.${100 + u}`, browser: 'Chrome' } as Prisma.InputJsonValue,
            ipAddress: `192.168.1.${100 + u}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            httpMethod: 'POST',
            httpUrl: '/api/auth/login',
            httpStatusCode: 200,
            duration: 180 + Math.floor(Math.random() * 100),
            createdAt: daysAgo(day, l * 3),
          });
        }
      }
    }

    // === Failed logins (scattered) ===
    for (const day of [340, 280, 210, 150, 90, 45, 20, 8]) {
      entries.push({
        orgId,
        entityType: 'User',
        action: 'LOGIN_FAILED',
        performedBy: users[users.length - 1]?.id || null,
        metadata: { ip: '10.0.0.55', reason: 'Invalid password' } as Prisma.InputJsonValue,
        ipAddress: '10.0.0.55',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/auth/login',
        httpStatusCode: 401,
        duration: 120 + Math.floor(Math.random() * 50),
        createdAt: daysAgo(day),
      });
    }

    // === Product CRUD events ===
    for (let i = 0; i < 50; i++) {
      entries.push({
        orgId,
        entityType: 'Product',
        action: 'CREATE',
        performedBy: user(0),
        metadata: { sku: `PROD-${i}`, action: 'seed' } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/products',
        httpStatusCode: 201,
        duration: 200 + Math.floor(Math.random() * 100),
        createdAt: daysAgo(355 - i * 2),
      });
    }

    // Product updates (monthly price reviews)
    for (let month = 0; month < 12; month++) {
      for (let p = 0; p < 5; p++) {
        entries.push({
          orgId,
          entityType: 'Product',
          action: 'UPDATE',
          performedBy: user(1),
          metadata: { changes: ['price'] } as Prisma.InputJsonValue,
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0',
          httpMethod: 'PATCH',
          httpUrl: `/api/products/prod-${p}`,
          httpStatusCode: 200,
          duration: 150 + Math.floor(Math.random() * 80),
          createdAt: daysAgo(month * 30 + 15),
        });
      }
    }

    // === Sale events (CREATE, CONFIRM, COMPLETE for each completed sale) ===
    for (let s = 0; s < 65; s++) {
      const day = 350 - Math.floor(s * 5);
      if (day < 5) continue;
      entries.push({
        orgId,
        entityType: 'Sale',
        action: 'CREATE',
        performedBy: user(3),
        metadata: { saleNumber: `VTA-${s}` } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.150',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/sales',
        httpStatusCode: 201,
        duration: 250 + Math.floor(Math.random() * 100),
        createdAt: daysAgo(day),
      });
      entries.push({
        orgId,
        entityType: 'Sale',
        action: 'CONFIRM',
        performedBy: user(1),
        metadata: { saleNumber: `VTA-${s}` } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: `/api/sales/sale-${s}/confirm`,
        httpStatusCode: 200,
        duration: 400 + Math.floor(Math.random() * 200),
        createdAt: daysAgo(day, 2),
      });
      entries.push({
        orgId,
        entityType: 'Sale',
        action: 'COMPLETE',
        performedBy: user(1),
        metadata: { saleNumber: `VTA-${s}` } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: `/api/sales/sale-${s}/complete`,
        httpStatusCode: 200,
        duration: 600 + Math.floor(Math.random() * 300),
        createdAt: daysAgo(day - 2),
      });
    }

    // === Movement events ===
    for (let m = 0; m < 50; m++) {
      const day = 360 - Math.floor(m * 7);
      if (day < 0) continue;
      entries.push({
        orgId,
        entityType: 'Movement',
        action: m % 5 === 0 ? 'VOID' : m % 3 === 0 ? 'CREATE' : 'POST',
        performedBy: user(m % 2 === 0 ? 2 : 1),
        metadata: {
          reference: `MOV-${m}`,
          type: m % 3 === 0 ? 'IN' : 'OUT',
        } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: `/api/movements/mv-${m}/${m % 5 === 0 ? 'void' : 'post'}`,
        httpStatusCode: 200,
        duration: 500 + Math.floor(Math.random() * 500),
        createdAt: daysAgo(day),
      });
    }

    // === Return events ===
    for (let r = 0; r < 20; r++) {
      const day = 330 - Math.floor(r * 16);
      if (day < 0) continue;
      entries.push({
        orgId,
        entityType: 'Return',
        action: 'CREATE',
        performedBy: user(0),
        metadata: {
          returnNumber: `DEV-${r}`,
          type: r % 3 === 0 ? 'RETURN_SUPPLIER' : 'RETURN_CUSTOMER',
        } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/returns',
        httpStatusCode: 201,
        duration: 250 + Math.floor(Math.random() * 100),
        createdAt: daysAgo(day),
      });
    }

    // === Transfer events ===
    for (let t = 0; t < 20; t++) {
      const day = 340 - Math.floor(t * 17);
      if (day < 0) continue;
      entries.push({
        orgId,
        entityType: 'Transfer',
        action: t % 3 === 0 ? 'CANCEL' : t % 2 === 0 ? 'RECEIVE' : 'CREATE',
        performedBy: user(0),
        metadata: {
          from: 'BOG-MAIN',
          to: t % 2 === 0 ? 'MED-01' : 'CAL-01',
        } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: `/api/transfers/tr-${t}/${t % 3 === 0 ? 'cancel' : 'receive'}`,
        httpStatusCode: 200,
        duration: 400 + Math.floor(Math.random() * 400),
        createdAt: daysAgo(day),
      });
    }

    // === Report generation events (weekly) ===
    const reportTypes = [
      'AVAILABLE_INVENTORY',
      'SALES',
      'RETURNS',
      'ABC_ANALYSIS',
      'LOW_STOCK',
      'VALUATION',
    ];
    for (let week = 0; week < 52; week++) {
      const reportType = reportTypes[week % reportTypes.length];
      entries.push({
        orgId,
        entityType: 'Report',
        action: week % 4 === 0 ? 'EXPORT' : 'GENERATE',
        performedBy: user(4),
        metadata: {
          type: reportType,
          format: week % 4 === 0 ? 'EXCEL' : 'VIEW',
        } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0',
        httpMethod: week % 4 === 0 ? 'POST' : 'GET',
        httpUrl: `/api/reports/${reportType.toLowerCase()}/view`,
        httpStatusCode: 200,
        duration: 1000 + Math.floor(Math.random() * 3000),
        createdAt: daysAgo(week * 7 + 3),
      });
    }

    // === User management events ===
    const userActions = ['CREATE', 'UPDATE', 'DEACTIVATE', 'ASSIGN_ROLE', 'ACTIVATE'];
    for (let i = 0; i < 15; i++) {
      entries.push({
        orgId,
        entityType: 'User',
        action: userActions[i % userActions.length],
        performedBy: user(0),
        metadata: { targetUser: `user-${i}` } as Prisma.InputJsonValue,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        httpMethod: i % 5 === 0 ? 'POST' : 'PATCH',
        httpUrl: `/api/users/user-${i}`,
        httpStatusCode: 200,
        duration: 150 + Math.floor(Math.random() * 100),
        createdAt: daysAgo(300 - i * 20),
      });
    }

    // === Import events ===
    for (let imp = 0; imp < 6; imp++) {
      const day = 300 - imp * 50;
      if (day < 0) continue;
      entries.push(
        {
          orgId,
          entityType: 'Import',
          action: 'CREATE',
          performedBy: user(5),
          metadata: { type: 'PRODUCTS', fileName: `import_${imp}.xlsx` } as Prisma.InputJsonValue,
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0',
          httpMethod: 'POST',
          httpUrl: '/api/imports/products',
          httpStatusCode: 201,
          duration: 1500 + Math.floor(Math.random() * 1000),
          createdAt: daysAgo(day),
        },
        {
          orgId,
          entityType: 'Import',
          action: 'VALIDATE',
          performedBy: user(5),
          metadata: { validRows: 140 + imp * 5, invalidRows: imp } as Prisma.InputJsonValue,
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0',
          httpMethod: 'POST',
          httpUrl: `/api/imports/imp-${imp}/validate`,
          httpStatusCode: 200,
          duration: 4000 + Math.floor(Math.random() * 2000),
          createdAt: daysAgo(day, 3),
        },
        {
          orgId,
          entityType: 'Import',
          action: 'APPLY',
          performedBy: user(5),
          metadata: { processedRows: 140 + imp * 5 } as Prisma.InputJsonValue,
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0',
          httpMethod: 'POST',
          httpUrl: `/api/imports/imp-${imp}/apply`,
          httpStatusCode: 200,
          duration: 8000 + Math.floor(Math.random() * 3000),
          createdAt: daysAgo(day - 1),
        }
      );
    }

    // Batch insert all audit logs
    await this.prisma.auditLog.createMany({ data: entries });
  }
}
