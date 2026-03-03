import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password (8-128 chars, must include uppercase, lowercase, number, special)',
    example: 'N3wP@ssw0rd!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword!: string;

  @ApiProperty({ description: 'Confirm new password', example: 'N3wP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}

export class ChangePasswordResponseDto {
  success!: boolean;
  message!: string;
  data!: { userId: string };
  timestamp!: string;
}
