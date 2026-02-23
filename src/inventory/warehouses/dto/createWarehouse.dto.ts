import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiProperty({
    description: 'Street address',
    example: '123 Main St',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Street must be a string' })
  @MaxLength(200, { message: 'Street must be at most 200 characters long' })
  street?: string;

  @ApiProperty({
    description: 'City',
    example: 'Bogotá',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @MaxLength(100, { message: 'City must be at most 100 characters long' })
  city?: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Cundinamarca',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @MaxLength(100, { message: 'State must be at most 100 characters long' })
  state?: string;

  @ApiProperty({
    description: 'ZIP or postal code',
    example: '110111',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Zip code must be a string' })
  @MaxLength(20, { message: 'Zip code must be at most 20 characters long' })
  zipCode?: string;

  @ApiProperty({
    description: 'Country',
    example: 'Colombia',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  @MaxLength(100, { message: 'Country must be at most 100 characters long' })
  country?: string;
}

export class CreateWarehouseDto {
  @ApiProperty({
    description: 'Warehouse code (unique identifier)',
    example: 'WH-001',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(2, { message: 'Code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Code must be at most 50 characters long' })
  code!: string;

  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(200, { message: 'Name must be at most 200 characters long' })
  name!: string;

  @ApiProperty({
    description: 'Warehouse description',
    example: 'Main warehouse for inventory storage',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must be at most 1000 characters long' })
  description?: string;

  @ApiProperty({
    description: 'Warehouse address',
    type: AddressDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({
    description: 'Whether the warehouse is active',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWarehouseDto {
  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(200, { message: 'Name must be at most 200 characters long' })
  name?: string;

  @ApiProperty({
    description: 'Warehouse description',
    example: 'Main warehouse for inventory storage',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must be at most 1000 characters long' })
  description?: string;

  @ApiProperty({
    description: 'Warehouse address',
    type: AddressDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({
    description: 'Whether the warehouse is active',
    example: true,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}
