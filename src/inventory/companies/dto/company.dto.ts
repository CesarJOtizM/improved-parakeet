import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'Gym Equipment' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: 'Company code (unique)', example: 'GYM' })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Code must contain only alphanumeric characters, hyphens and underscores',
  })
  code!: string;

  @ApiProperty({ description: 'Company description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateCompanyDto {
  @ApiProperty({ description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Company code', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Code cannot be empty' })
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Code must contain only alphanumeric characters, hyphens and underscores',
  })
  code?: string;

  @ApiProperty({ description: 'Company description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetCompaniesQueryDto {
  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Sort by field',
    enum: ['name', 'code', 'isActive', 'productCount', 'createdAt', 'updatedAt'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['name', 'code', 'isActive', 'productCount', 'createdAt', 'updatedAt'], {
    message: 'SortBy must be one of: name, code, isActive, productCount, createdAt, updatedAt',
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'], {
    message: 'SortOrder must be one of: asc, desc',
  })
  sortOrder?: 'asc' | 'desc';
}
