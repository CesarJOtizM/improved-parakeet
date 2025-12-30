import { IMPORT_TYPES } from '@import/domain/valueObjects';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateImportBatchDto {
  @ApiProperty({
    description: 'Type of import',
    enum: Object.values(IMPORT_TYPES),
    example: 'PRODUCTS',
  })
  @IsNotEmpty()
  @IsIn(Object.values(IMPORT_TYPES))
  type!: string;

  @ApiProperty({
    description: 'Name of the file being imported',
    example: 'products-import-2024.xlsx',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiPropertyOptional({
    description: 'Optional note or description for this import batch',
    example: 'Initial product catalog import',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
