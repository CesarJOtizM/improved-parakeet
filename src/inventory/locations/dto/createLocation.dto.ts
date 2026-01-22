import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  type?: string; // ZONE, AISLE, RACK, SHELF, BIN - defaults to BIN

  @IsNotEmpty()
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
