import { Injectable, Logger, Inject } from '@nestjs/common';
import { IReportParametersInput } from '@report/domain/valueObjects';
import { IReportTemplateData, ReportTemplateMapper } from '@report/mappers';
import { err, ok, Result } from '@shared/domain/result';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

import type { IReportTemplateRepository } from '@report/domain/ports/repositories';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IUpdateReportTemplateRequest {
  templateId: string;
  name?: string;
  description?: string;
  defaultParameters?: IReportParametersInput;
  isActive?: boolean;
  updatedBy: string;
  orgId: string;
}

export interface IUpdateReportTemplateResponse {
  success: boolean;
  message: string;
  data: IReportTemplateData;
  timestamp: string;
}

@Injectable()
export class UpdateReportTemplateUseCase {
  private readonly logger = new Logger(UpdateReportTemplateUseCase.name);

  constructor(
    @Inject('ReportTemplateRepository')
    private readonly reportTemplateRepository: IReportTemplateRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IUpdateReportTemplateRequest
  ): Promise<Result<IUpdateReportTemplateResponse, DomainError>> {
    this.logger.log('Updating report template', {
      templateId: request.templateId,
      orgId: request.orgId,
    });

    // Find existing template
    const template = await this.reportTemplateRepository.findById(
      request.templateId,
      request.orgId
    );

    if (!template) {
      return err(new NotFoundError(`Report template with ID '${request.templateId}' not found`));
    }

    // Update name if provided
    if (request.name !== undefined) {
      if (request.name.trim().length < 3) {
        return err(new ValidationError('Template name must be at least 3 characters long'));
      }

      if (request.name.trim().length > 100) {
        return err(new ValidationError('Template name must be at most 100 characters long'));
      }

      // Check if new name conflicts with existing template
      if (request.name.trim() !== template.name) {
        const existingTemplate = await this.reportTemplateRepository.findByName(
          request.name.trim(),
          request.orgId
        );
        if (existingTemplate && existingTemplate.id !== request.templateId) {
          return err(
            new ConflictError(`A report template with name '${request.name}' already exists`)
          );
        }
      }

      template.updateName(request.name, request.updatedBy);
    }

    // Update description if provided
    if (request.description !== undefined) {
      template.updateDescription(request.description);
    }

    // Update parameters if provided
    if (request.defaultParameters !== undefined) {
      template.updateParameters(request.defaultParameters, request.updatedBy);
    }

    // Update active status if provided
    if (request.isActive !== undefined) {
      if (request.isActive) {
        template.activate();
      } else {
        template.deactivate();
      }
    }

    try {
      // Save the updated template
      const savedTemplate = await this.reportTemplateRepository.save(template);

      // Dispatch domain events
      savedTemplate.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedTemplate.domainEvents);
      savedTemplate.clearEvents();

      this.logger.log('Report template updated successfully', {
        id: savedTemplate.id,
        name: savedTemplate.name,
        orgId: request.orgId,
      });

      return ok({
        success: true,
        message: 'Report template updated successfully',
        data: ReportTemplateMapper.toResponseData(savedTemplate),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to update report template', {
        templateId: request.templateId,
        orgId: request.orgId,
        error,
      });
      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to update report template'
        )
      );
    }
  }
}
