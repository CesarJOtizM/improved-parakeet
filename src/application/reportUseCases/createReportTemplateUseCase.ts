import { Injectable, Logger, Inject } from '@nestjs/common';
import { ReportType } from '@report/domain/valueObjects';
import { IReportParametersInput } from '@report/domain/valueObjects';
import { IReportTemplateData, ReportTemplateMapper } from '@report/mappers';
import {
  REPORT_TEMPLATE_NAME_TOO_SHORT,
  REPORT_TEMPLATE_NAME_TOO_LONG,
  REPORT_INVALID_TYPE,
  REPORT_TEMPLATE_CREATION_ERROR,
  REPORT_TEMPLATE_NAME_CONFLICT,
} from '@shared/constants/error-codes';
import { err, ok, Result } from '@shared/domain/result';
import { ConflictError, DomainError, ValidationError } from '@shared/domain/result/domainError';

import type { IReportTemplateRepository } from '@report/domain/ports/repositories';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface ICreateReportTemplateRequest {
  name: string;
  description?: string;
  type: string;
  defaultParameters: IReportParametersInput;
  createdBy: string;
  orgId: string;
}

export interface ICreateReportTemplateResponse {
  success: boolean;
  message: string;
  data: IReportTemplateData;
  timestamp: string;
}

@Injectable()
export class CreateReportTemplateUseCase {
  private readonly logger = new Logger(CreateReportTemplateUseCase.name);

  constructor(
    @Inject('ReportTemplateRepository')
    private readonly reportTemplateRepository: IReportTemplateRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICreateReportTemplateRequest
  ): Promise<Result<ICreateReportTemplateResponse, DomainError>> {
    this.logger.log('Creating report template', {
      name: request.name,
      type: request.type,
      orgId: request.orgId,
    });

    // Validate name
    if (!request.name || request.name.trim().length < 3) {
      return err(
        new ValidationError(
          'Template name must be at least 3 characters long',
          REPORT_TEMPLATE_NAME_TOO_SHORT
        )
      );
    }

    if (request.name.trim().length > 100) {
      return err(
        new ValidationError(
          'Template name must be at most 100 characters long',
          REPORT_TEMPLATE_NAME_TOO_LONG
        )
      );
    }

    // Validate report type
    try {
      ReportType.create(request.type);
    } catch {
      return err(new ValidationError(`Invalid report type: ${request.type}`, REPORT_INVALID_TYPE));
    }

    // Check if template with same name already exists
    const existingTemplate = await this.reportTemplateRepository.existsByName(
      request.name.trim(),
      request.orgId
    );
    if (existingTemplate) {
      return err(
        new ConflictError(
          `A report template with name '${request.name}' already exists`,
          REPORT_TEMPLATE_NAME_CONFLICT
        )
      );
    }

    try {
      // Create the template entity
      const template = ReportTemplateMapper.createEntity(
        {
          name: request.name,
          description: request.description,
          type: request.type,
          defaultParameters: request.defaultParameters,
          createdBy: request.createdBy,
        },
        request.orgId
      );

      // Save the template
      const savedTemplate = await this.reportTemplateRepository.save(template);

      // Dispatch domain events
      savedTemplate.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedTemplate.domainEvents);
      savedTemplate.clearEvents();

      this.logger.log('Report template created successfully', {
        id: savedTemplate.id,
        name: savedTemplate.name,
        type: savedTemplate.type.getValue(),
        orgId: request.orgId,
      });

      return ok({
        success: true,
        message: 'Report template created successfully',
        data: ReportTemplateMapper.toResponseData(savedTemplate),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to create report template', {
        name: request.name,
        orgId: request.orgId,
        error,
      });
      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to create report template',
          REPORT_TEMPLATE_CREATION_ERROR
        )
      );
    }
  }
}
