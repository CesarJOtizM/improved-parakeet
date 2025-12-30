import { IMPORT_TYPES } from '@import/domain/valueObjects';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteImportDto {
  @ApiProperty({
    description: 'Type of import',
    enum: Object.values(IMPORT_TYPES),
    example: 'PRODUCTS',
  })
  @IsNotEmpty()
  @IsIn(Object.values(IMPORT_TYPES))
  type!: string;

  @ApiPropertyOptional({
    description: 'Optional note or description for this import',
    example: 'Initial product catalog import',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ExecuteImportResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message!: string;

  @ApiProperty({
    description: 'Import execution result data',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Import batch ID' },
      status: { type: 'string', description: 'Final status (COMPLETED or FAILED)' },
      totalRows: { type: 'number', description: 'Total number of rows' },
      processedRows: { type: 'number', description: 'Number of processed rows' },
      validRows: { type: 'number', description: 'Number of valid rows' },
      invalidRows: { type: 'number', description: 'Number of invalid rows' },
    },
  })
  data!: {
    id: string;
    status: string;
    totalRows: number;
    processedRows: number;
    validRows: number;
    invalidRows: number;
  };

  @ApiProperty({ description: 'ISO timestamp of the response' })
  timestamp!: string;
}
