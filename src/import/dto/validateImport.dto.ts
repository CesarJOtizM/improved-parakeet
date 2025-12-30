import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateImportDto {
  @ApiProperty({
    description: 'ID of the import batch to validate',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  batchId!: string;
}

export class ValidateImportParamDto {
  @ApiProperty({
    description: 'ID of the import batch',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
