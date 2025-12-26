import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSaleDto {
  @ApiProperty({
    description: 'Customer reference (optional text)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Customer reference must be a string' })
  customerReference?: string;

  @ApiProperty({
    description: 'External reference (invoice, order, etc.)',
    example: 'INV-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'External reference must be a string' })
  externalReference?: string;

  @ApiProperty({
    description: 'Note',
    example: 'Sale note',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;
}
