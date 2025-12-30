import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessImportDto {
  @ApiPropertyOptional({
    description: 'Whether to skip invalid rows and process only valid ones',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  skipInvalidRows?: boolean;
}

export class ProcessImportParamDto {
  @ApiProperty({
    description: 'ID of the import batch to process',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
