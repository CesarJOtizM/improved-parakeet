import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ description: 'Contact name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Identification (NIT, CC, etc.)',
    example: '900123456-7',
  })
  @IsString()
  @IsNotEmpty()
  identification!: string;

  @ApiProperty({
    description: 'Contact type',
    enum: ['CUSTOMER', 'SUPPLIER'],
    default: 'CUSTOMER',
  })
  @IsString()
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
