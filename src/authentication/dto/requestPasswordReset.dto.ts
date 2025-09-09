import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'User email requesting password recovery',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must have a valid format' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  email!: string;
}
