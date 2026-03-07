import {
  ImportBatch,
  type IImportBatchRepository,
  ImportRow,
  ImportStatus,
  type ImportStatusValue,
  ImportType,
  type ImportTypeValue,
  ValidationResult,
} from '@import/domain';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

import type { PrismaClient } from '@infrastructure/database/generated/prisma';

@Injectable()
export class PrismaImportBatchRepository implements IImportBatchRepository {
  private readonly logger = new Logger(PrismaImportBatchRepository.name);
  private readonly prisma: PrismaClient;

  constructor(private readonly prismaService: PrismaService) {
    this.prisma = this.prismaService as unknown as PrismaClient;
  }

  async save(batch: ImportBatch): Promise<ImportBatch> {
    this.logger.log('Saving import batch', { batchId: batch.id, type: batch.type.getValue() });

    const rows = batch.getRows();

    const data = {
      id: batch.id,
      orgId: batch.orgId!,
      type: batch.type.getValue(),
      status: batch.status.getValue(),
      fileName: batch.fileName,
      totalRows: batch.totalRows,
      processedRows: batch.processedRows,
      validRows: batch.validRows,
      invalidRows: batch.invalidRows,
      startedAt: batch.startedAt,
      validatedAt: batch.validatedAt,
      completedAt: batch.completedAt,
      errorMessage: batch.errorMessage,
      note: batch.note,
      createdBy: batch.createdBy,
      updatedAt: new Date(),
    };

    await this.prisma.$transaction(async tx => {
      await tx.importBatch.upsert({
        where: { id: batch.id },
        create: data,
        update: data,
      });

      if (rows.length > 0) {
        await tx.importRow.deleteMany({
          where: { importBatchId: batch.id },
        });

        await tx.importRow.createMany({
          data: rows.map(row => ({
            id: row.id,
            orgId: row.orgId!,
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            data: row.data as object,
            isValid: row.isValid(),
            validationErrors: row.errors,
            warnings: row.warnings,
          })),
        });
      }
    });

    return batch;
  }

  async findById(id: string, orgId: string): Promise<ImportBatch | null> {
    const record = await this.prisma.importBatch.findFirst({
      where: { id, orgId },
      include: { rows: true },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(orgId: string): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => this.toDomain(r));
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.importBatch.count({
      where: { id, orgId },
    });
    return count > 0;
  }

  async findByType(type: ImportTypeValue, orgId: string): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { type, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => this.toDomain(r));
  }

  async findByStatus(status: ImportStatusValue, orgId: string): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { status, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => this.toDomain(r));
  }

  async findByCreatedBy(userId: string, orgId: string): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { createdBy: userId, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => this.toDomain(r));
  }

  async findByTypeAndStatus(
    type: ImportTypeValue,
    status: ImportStatusValue,
    orgId: string
  ): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { type, status, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => this.toDomain(r));
  }

  async findRecent(orgId: string, limit = 10): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map(r => this.toDomain(r));
  }

  async countByStatus(status: ImportStatusValue, orgId: string): Promise<number> {
    return this.prisma.importBatch.count({
      where: { status, orgId },
    });
  }

  async findPaginated(
    orgId: string,
    options: {
      page: number;
      limit: number;
      type?: ImportTypeValue;
      status?: ImportStatusValue;
    }
  ): Promise<{
    data: ImportBatch[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const where: Record<string, unknown> = { orgId };
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;

    const [records, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.importBatch.count({ where }),
    ]);

    return {
      data: records.map(r => this.toDomain(r)),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async delete(id: string, _orgId: string): Promise<void> {
    await this.prisma.importBatch.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: string;
    orgId: string;
    type: string;
    status: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    validRows: number;
    invalidRows: number;
    startedAt: Date | null;
    validatedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
    note: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    rows?: {
      id: string;
      orgId: string;
      rowNumber: number;
      data: unknown;
      isValid: boolean;
      validationErrors: unknown;
      warnings: unknown;
    }[];
  }): ImportBatch {
    const batch = ImportBatch.reconstitute(
      {
        type: ImportType.create(record.type),
        status: ImportStatus.create(record.status),
        fileName: record.fileName,
        totalRows: record.totalRows,
        processedRows: record.processedRows,
        validRows: record.validRows,
        invalidRows: record.invalidRows,
        startedAt: record.startedAt ?? undefined,
        validatedAt: record.validatedAt ?? undefined,
        completedAt: record.completedAt ?? undefined,
        errorMessage: record.errorMessage ?? undefined,
        note: record.note ?? undefined,
        createdBy: record.createdBy,
      },
      record.id,
      record.orgId
    );

    const rowRecords = record.rows ?? [];
    if (rowRecords.length > 0) {
      const rows = rowRecords.map(row =>
        ImportRow.reconstitute(
          {
            rowNumber: row.rowNumber,
            data: row.data as Record<string, unknown>,
            validationResult: ValidationResult.create(
              row.isValid,
              (row.validationErrors as string[]) ?? [],
              (row.warnings as string[]) ?? []
            ),
          },
          row.id,
          row.orgId
        )
      );
      batch.restoreRows(rows);
    }

    return batch;
  }
}
