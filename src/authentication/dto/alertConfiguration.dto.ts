import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAlertConfigurationDto {
  @ApiProperty({
    description: 'Cron frequency for stock checks',
    example: 'EVERY_HOUR',
    enum: ['EVERY_HOUR', 'EVERY_6_HOURS', 'EVERY_12_HOURS', 'EVERY_DAY'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['EVERY_HOUR', 'EVERY_6_HOURS', 'EVERY_12_HOURS', 'EVERY_DAY'], {
    message: 'Frequency must be EVERY_HOUR, EVERY_6_HOURS, EVERY_12_HOURS, or EVERY_DAY',
  })
  cronFrequency?: string;

  @ApiProperty({
    description: 'Notify on low stock',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyLowStock?: boolean;

  @ApiProperty({
    description: 'Notify on critical stock',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyCriticalStock?: boolean;

  @ApiProperty({
    description: 'Notify on out of stock',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyOutOfStock?: boolean;

  @ApiProperty({
    description: 'Comma-separated recipient emails',
    example: 'admin@company.com,manager@company.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Recipient emails must be at most 500 characters' })
  recipientEmails?: string;

  @ApiProperty({
    description: 'Enable or disable alerts',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class AlertConfigurationResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message' })
  message!: string;

  @ApiProperty({ description: 'Alert configuration data' })
  data!: {
    id: string;
    orgId: string;
    cronFrequency: string;
    notifyLowStock: boolean;
    notifyCriticalStock: boolean;
    notifyOutOfStock: boolean;
    recipientEmails: string;
    isEnabled: boolean;
    lastRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;
}
