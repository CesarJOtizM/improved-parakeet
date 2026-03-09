import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsBoolean, IsEmail } from 'class-validator';

export class UpdateContactDto {
  @ApiProperty({ description: 'Contact name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Identification', required: false })
  @IsString()
  @IsOptional()
  identification?: string;

  @ApiProperty({
    description: 'Contact type',
    enum: ['CUSTOMER', 'SUPPLIER'],
    required: false,
  })
  @IsString()
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
