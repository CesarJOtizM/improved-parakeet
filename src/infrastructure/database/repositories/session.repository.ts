import { Session } from '@auth/domain/entities/session.entity';
import { ISessionRepository as SessionRepositoryInterface } from '@auth/domain/repositories/sessionRepository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SessionRepository implements SessionRepositoryInterface {
  private readonly logger = new Logger(SessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Session | null> {
    try {
      const sessionData = await this.prisma.session.findFirst({
        where: { id, user: { orgId } },
      });

      if (!sessionData) return null;

      return Session.reconstitute(
        {
          userId: sessionData.userId,
          token: sessionData.token,
          expiresAt: sessionData.expiresAt,
          isActive: sessionData.isActive,
          ipAddress: sessionData.ipAddress ?? undefined,
          userAgent: sessionData.userAgent ?? undefined,
        },
        sessionData.id,
        orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding session by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding session by ID: ${error}`);
      }
      throw error;
    }
  }

  async findByUserId(userId: string, orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          userId,
          user: { orgId },
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
            ipAddress: sessionData.ipAddress ?? undefined,
            userAgent: sessionData.userAgent ?? undefined,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sessions by user ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding sessions by user ID: ${error}`);
      }
      throw error;
    }
  }

  async findActiveSessions(userId: string, orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
          user: { orgId },
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
            ipAddress: sessionData.ipAddress ?? undefined,
            userAgent: sessionData.userAgent ?? undefined,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding active sessions: ${error.message}`);
      } else {
        this.logger.error(`Error finding active sessions: ${error}`);
      }
      throw error;
    }
  }

  async findActiveByUserId(userId: string, orgId: string): Promise<Session[]> {
    return this.findActiveSessions(userId, orgId);
  }

  async findActiveByUserIdAndToken(
    userId: string,
    orgId: string,
    token: string
  ): Promise<Session | null> {
    try {
      const sessionData = await this.prisma.session.findFirst({
        where: {
          userId,
          token,
          isActive: true,
          expiresAt: { gt: new Date() },
          user: { orgId },
        },
      });

      if (!sessionData) return null;

      return Session.reconstitute(
        {
          userId: sessionData.userId,
          token: sessionData.token,
          expiresAt: sessionData.expiresAt,
          isActive: sessionData.isActive,
          ipAddress: sessionData.ipAddress ?? undefined,
          userAgent: sessionData.userAgent ?? undefined,
        },
        sessionData.id,
        orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding active session by user ID and token: ${error.message}`);
      } else {
        this.logger.error(`Error finding active session by user ID and token: ${error}`);
      }
      throw error;
    }
  }

  async findByToken(token: string): Promise<Session | null> {
    try {
      const sessionData = await this.prisma.session.findFirst({
        where: { token },
        include: { user: true },
      });

      if (!sessionData) return null;

      return Session.reconstitute(
        {
          userId: sessionData.userId,
          token: sessionData.token,
          expiresAt: sessionData.expiresAt,
          isActive: sessionData.isActive,
          ipAddress: sessionData.ipAddress ?? undefined,
          userAgent: sessionData.userAgent ?? undefined,
        },
        sessionData.id,
        sessionData.user.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding session by token: ${error.message}`);
      } else {
        this.logger.error(`Error finding session by token: ${error}`);
      }
      throw error;
    }
  }

  async findExpiredSessions(): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          expiresAt: { lt: new Date() },
        },
        include: {
          user: true,
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
          },
          sessionData.id,
          'unknown' // TODO: Obtener orgId real
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding expired sessions: ${error.message}`);
      } else {
        this.logger.error(`Error finding expired sessions: ${error}`);
      }
      throw error;
    }
  }

  async findSessionsByIpAddress(ipAddress: string, orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          ipAddress,
          user: { orgId },
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
            ipAddress: sessionData.ipAddress ?? undefined,
            userAgent: sessionData.userAgent ?? undefined,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sessions by IP address: ${error.message}`);
      } else {
        this.logger.error(`Error finding sessions by IP address: ${error}`);
      }
      throw error;
    }
  }

  async findSessionsByUserAgent(userAgent: string, orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          userAgent,
          user: { orgId },
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
            ipAddress: sessionData.ipAddress ?? undefined,
            userAgent: sessionData.userAgent ?? undefined,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sessions by user agent: ${error.message}`);
      } else {
        this.logger.error(`Error finding sessions by user agent: ${error}`);
      }
      throw error;
    }
  }

  async findSessionsByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          user: { orgId },
        },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
            ipAddress: sessionData.ipAddress ?? undefined,
            userAgent: sessionData.userAgent ?? undefined,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sessions by date range: ${error.message}`);
      } else {
        this.logger.error(`Error finding sessions by date range: ${error}`);
      }
      throw error;
    }
  }

  async countActiveSessions(userId: string, orgId: string): Promise<number> {
    try {
      return await this.prisma.session.count({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
          user: { orgId },
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error counting active sessions: ${error.message}`);
      } else {
        this.logger.error(`Error counting active sessions: ${error}`);
      }
      throw error;
    }
  }

  async countActiveByUserId(userId: string, orgId: string): Promise<number> {
    return this.countActiveSessions(userId, orgId);
  }

  async deleteExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      return result.count;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting expired sessions: ${error.message}`);
      } else {
        this.logger.error(`Error deleting expired sessions: ${error}`);
      }
      throw error;
    }
  }

  async deleteExpired(orgId: string): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          user: { orgId },
        },
      });
      return result.count;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting expired sessions: ${error.message}`);
      } else {
        this.logger.error(`Error deleting expired sessions: ${error}`);
      }
      throw error;
    }
  }

  async deleteSessionsByUserId(userId: string, orgId: string): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          userId,
          user: { orgId },
        },
      });
      return result.count;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting sessions by user ID: ${error.message}`);
      } else {
        this.logger.error(`Error deleting sessions by user ID: ${error}`);
      }
      throw error;
    }
  }

  async deleteSessionsByToken(token: string): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: { token },
      });
      return result.count;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting sessions by token: ${error.message}`);
      } else {
        this.logger.error(`Error deleting sessions by token: ${error}`);
      }
      throw error;
    }
  }

  async save(session: Session): Promise<Session> {
    try {
      const sessionData = {
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        orgId: session.orgId,
      };

      // Usar upsert para manejar tanto creación como actualización
      const savedSession = await this.prisma.session.upsert({
        where: { id: session.id },
        update: sessionData,
        create: {
          id: session.id, // Usar el ID generado por la entidad
          ...sessionData,
        },
      });

      return Session.reconstitute(
        {
          userId: savedSession.userId,
          token: savedSession.token,
          expiresAt: savedSession.expiresAt,
          isActive: savedSession.isActive,
          ipAddress: savedSession.ipAddress ?? undefined,
          userAgent: savedSession.userAgent ?? undefined,
        },
        savedSession.id,
        session.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving session: ${error.message}`);
      } else {
        this.logger.error(`Error saving session: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.session.deleteMany({
        where: { id, user: { orgId } },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting session: ${error.message}`);
      } else {
        this.logger.error(`Error deleting session: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.session.count({
        where: { id, user: { orgId } },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking session existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking session existence: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Session[]> {
    try {
      const sessionsData = await this.prisma.session.findMany({
        where: { user: { orgId } },
      });

      return sessionsData.map(sessionData =>
        Session.reconstitute(
          {
            userId: sessionData.userId,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
            isActive: sessionData.isActive,
          },
          sessionData.id,
          orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all sessions: ${error.message}`);
      } else {
        this.logger.error(`Error finding all sessions: ${error}`);
      }
      throw error;
    }
  }
}
