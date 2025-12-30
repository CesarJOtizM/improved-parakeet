import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ReportParametersDto } from './viewReport.dto';

import type { IReportParametersInput } from '@report/domain/valueObjects';

export class CreateReportTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Monthly Inventory Report',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Monthly report for inventory valuation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Report type',
    enum: Object.values(REPORT_TYPES),
    example: 'VALUATION',
  })
  @IsNotEmpty()
  @IsIn(Object.values(REPORT_TYPES))
  type!: string;

  @ApiPropertyOptional({
    description: 'Default parameters for the template',
    type: ReportParametersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportParametersDto)
  defaultParameters?: ReportParametersDto;
}

export class UpdateReportTemplateDto {
  @ApiPropertyOptional({
    description: 'Template name',
    example: 'Monthly Inventory Report',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Monthly report for inventory valuation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Default parameters for the template',
    type: ReportParametersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportParametersDto)
  defaultParameters?: ReportParametersDto;

  @ApiPropertyOptional({
    description: 'Whether the template is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReportTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id!: string;

  @ApiProperty({ description: 'Template name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Template description' })
  description?: string;

  @ApiProperty({ description: 'Report type' })
  type!: string;

  @ApiProperty({ description: 'Default parameters' })
  defaultParameters!: IReportParametersInput;

  @ApiProperty({ description: 'Whether the template is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'User who created the template' })
  createdBy!: string;

  @ApiProperty({ description: 'Organization ID' })
  orgId!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class ReportTemplateListResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Response message' })
  message!: string;

  @ApiProperty({ description: 'List of report templates', type: [ReportTemplateResponseDto] })
  data!: ReportTemplateResponseDto[];

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp!: string;
}

export class ReportTemplateCreateResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Response message' })
  message!: string;

  @ApiProperty({ description: 'Created report template', type: ReportTemplateResponseDto })
  data!: ReportTemplateResponseDto;

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp!: string;
}
