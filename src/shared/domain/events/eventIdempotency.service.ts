import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Service to ensure event handlers are idempotent.
 * Prevents duplicate processing of events in case of retries or redelivery.
 */
@Injectable()
export class EventIdempotencyService {
  private readonly logger = new Logger(EventIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attempts to mark an event as processed.
   * Returns true if the event was successfully marked (i.e., it hasn't been processed before).
   * Returns false if the event has already been processed.
   *
   * @param eventType - The type/name of the event (e.g., 'MovementPostedEvent')
   * @param eventId - The unique identifier of the event (e.g., movementId, saleId)
   * @param orgId - The organization ID
   * @returns true if the event should be processed, false if already processed
   */
  async tryMarkAsProcessed(eventType: string, eventId: string, orgId: string): Promise<boolean> {
    try {
      await this.prisma.processedEvent.create({
        data: {
          eventType,
          eventId,
          orgId,
        },
      });

      this.logger.debug('Event marked as processed', { eventType, eventId, orgId });
      return true;
    } catch (error) {
      // Check if it's a unique constraint violation (P2002 in Prisma)
      if (this.isUniqueConstraintError(error)) {
        this.logger.warn('Event already processed, skipping', { eventType, eventId, orgId });
        return false;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Checks if an event has already been processed.
   *
   * @param eventType - The type/name of the event
   * @param eventId - The unique identifier of the event
   * @param orgId - The organization ID
   * @returns true if already processed, false otherwise
   */
  async isProcessed(eventType: string, eventId: string, orgId: string): Promise<boolean> {
    const existing = await this.prisma.processedEvent.findUnique({
      where: {
        eventType_eventId_orgId: {
          eventType,
          eventId,
          orgId,
        },
      },
    });

    return existing !== null;
  }

  /**
   * Removes processed event record.
   * Use this for cleanup or when you need to allow reprocessing.
   *
   * @param eventType - The type/name of the event
   * @param eventId - The unique identifier of the event
   * @param orgId - The organization ID
   */
  async removeProcessedMark(eventType: string, eventId: string, orgId: string): Promise<void> {
    await this.prisma.processedEvent.deleteMany({
      where: {
        eventType,
        eventId,
        orgId,
      },
    });

    this.logger.debug('Processed event mark removed', { eventType, eventId, orgId });
  }

  /**
   * Cleans up old processed event records.
   * Should be called periodically to prevent table growth.
   *
   * @param olderThanDays - Delete records older than this many days (default: 30)
   * @returns Number of records deleted
   */
  async cleanupOldRecords(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.processedEvent.deleteMany({
      where: {
        processedAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old processed event records`);
    return result.count;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: string }).code === 'P2002';
    }
    return false;
  }
}
