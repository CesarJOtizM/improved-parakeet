import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetContactsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['CUSTOMER', 'SUPPLIER'] })
  @IsOptional()
  @IsString()
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    required: false,
    enum: ['name', 'identification', 'type', 'isActive', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
