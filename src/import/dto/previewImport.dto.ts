import { IMPORT_TYPES } from '@import/domain/valueObjects';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

export class PreviewImportDto {
  @ApiProperty({
    description: 'Type of import',
    enum: Object.values(IMPORT_TYPES),
    example: 'PRODUCTS',
  })
  @IsNotEmpty()
  @IsIn(Object.values(IMPORT_TYPES))
  type!: string;
}

export class PreviewImportResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message!: string;

  @ApiProperty({
    description: 'Validation result data',
    type: 'object',
    properties: {
      canBeProcessed: { type: 'boolean', description: 'True if no errors found' },
      totalRows: { type: 'number', description: 'Total number of rows in the file' },
      validRows: { type: 'number', description: 'Number of valid rows' },
      invalidRows: { type: 'number', description: 'Number of invalid rows' },
      structureErrors: {
        type: 'array',
        items: { type: 'string' },
        description: 'File structure validation errors',
      },
      rowErrors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rowNumber: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        description: 'Row-level validation errors',
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
        description: 'Validation warnings',
      },
    },
  })
  data!: {
    canBeProcessed: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    structureErrors: string[];
    rowErrors: Array<{ rowNumber: number; errors: string[] }>;
    warnings: string[];
  };

  @ApiProperty({ description: 'ISO timestamp of the response' })
  timestamp!: string;
}
