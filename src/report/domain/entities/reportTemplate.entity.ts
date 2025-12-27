import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

import { ReportTemplateCreatedEvent, ReportTemplateUpdatedEvent } from '../events';
import {
  IReportParametersInput,
  ReportParameters,
  ReportType,
  ReportTypeValue,
} from '../valueObjects';

export interface IReportTemplateProps {
  name: string;
  description?: string;
  type: ReportType;
  defaultParameters: ReportParameters;
  isActive: boolean;
  createdBy: string;
}

export class ReportTemplate extends AggregateRoot<IReportTemplateProps> {
  private constructor(props: IReportTemplateProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IReportTemplateProps, orgId: string): ReportTemplate {
    const template = new ReportTemplate(props, undefined, orgId);
    template.addDomainEvent(
      new ReportTemplateCreatedEvent(
        template.id,
        props.name,
        props.type.getValue(),
        orgId,
        props.createdBy
      )
    );
    return template;
  }

  public static reconstitute(
    props: IReportTemplateProps,
    id: string,
    orgId: string
  ): ReportTemplate {
    return new ReportTemplate(props, id, orgId);
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get type(): ReportType {
    return this.props.type;
  }

  get defaultParameters(): ReportParameters {
    return this.props.defaultParameters;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  // Business methods
  public activate(): void {
    if (this.props.isActive) {
      return;
    }
    this.props.isActive = true;
    this.updateTimestamp();
  }

  public deactivate(): void {
    if (!this.props.isActive) {
      return;
    }
    this.props.isActive = false;
    this.updateTimestamp();
  }

  public updateName(name: string, updatedBy: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Template name cannot be empty');
    }
    if (name.trim().length < 3) {
      throw new Error('Template name must be at least 3 characters long');
    }
    if (name.trim().length > 100) {
      throw new Error('Template name must be at most 100 characters long');
    }
    this.props.name = name.trim();
    this.updateTimestamp();
    this.addDomainEvent(
      new ReportTemplateUpdatedEvent(
        this.id,
        this.props.name,
        this.props.type.getValue(),
        this.orgId!,
        updatedBy
      )
    );
  }

  public updateDescription(description: string | undefined): void {
    this.props.description = description?.trim();
    this.updateTimestamp();
  }

  public updateParameters(parameters: IReportParametersInput, updatedBy: string): void {
    this.props.defaultParameters = ReportParameters.create(parameters);
    this.updateTimestamp();
    this.addDomainEvent(
      new ReportTemplateUpdatedEvent(
        this.id,
        this.props.name,
        this.props.type.getValue(),
        this.orgId!,
        updatedBy
      )
    );
  }

  public toPlainObject(): {
    id: string;
    name: string;
    description?: string;
    type: ReportTypeValue;
    defaultParameters: IReportParametersInput;
    isActive: boolean;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.props.name,
      description: this.props.description,
      type: this.props.type.getValue(),
      defaultParameters: this.props.defaultParameters.getValue(),
      isActive: this.props.isActive,
      createdBy: this.props.createdBy,
      orgId: this.orgId!,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
