import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

import { ReportParametersDto } from './viewReport.dto';

export class ExportOptionsDto {
  @ApiPropertyOptional({
    description: 'Include header row in export',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean;

  @ApiPropertyOptional({
    description: 'Include summary section in export',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean;

  @ApiPropertyOptional({
    description: 'Custom title for the report',
    example: 'Monthly Sales Report',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Author name for the report',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  author?: string;
}

export class ExportReportDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['PDF', 'EXCEL', 'CSV'],
    example: 'EXCEL',
  })
  @IsNotEmpty()
  @IsIn(['PDF', 'EXCEL', 'CSV'])
  format: string;

  @ApiPropertyOptional({
    description: 'Report parameters',
    type: ReportParametersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportParametersDto)
  parameters?: ReportParametersDto;

  @ApiPropertyOptional({
    description: 'Export options',
    type: ExportOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportOptionsDto)
  options?: ExportOptionsDto;

  @ApiPropertyOptional({
    description: 'Save report metadata for audit',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  saveMetadata?: boolean;
}
