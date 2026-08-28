import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { ConnectivityPartnerType } from '@prisma/client';

export class CreateDeveloperRegisterDto {
  @ApiProperty({ example: 'Acme PMS Systems', description: 'Company or Partner Name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Company name must be at least 3 characters long' })
  name: string;

  @ApiProperty({ example: 'ACME_PMS', description: 'Unique partner code (uppercase alphanumeric)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Partner code must be at least 3 characters long' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Partner code can only contain letters, numbers, underscores, and hyphens' })
  code: string;

  @ApiProperty({ enum: ConnectivityPartnerType, example: ConnectivityPartnerType.PMS, description: 'Type of connectivity integration' })
  @IsEnum(ConnectivityPartnerType)
  @IsNotEmpty()
  type: ConnectivityPartnerType;

  @ApiProperty({ example: 'developer@acmepms.com', description: 'Contact email for developer account' })
  @IsEmail({}, { message: 'Please provide a valid contact email address' })
  @IsNotEmpty()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://webhook.acmepms.com/events', description: 'Outbound webhook destination URL' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({ example: 'SecureP@ssw0rd2026', description: 'Password for developer portal login (min 8 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
