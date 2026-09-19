import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePolicyAdminDto {
  @ApiPropertyOptional({ description: 'Policy ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Platform' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ description: 'Minimum supported app version (e.g. 1.0.0)' })
  @IsString()
  @IsNotEmpty()
  minimumSupportedVersion: string;

  @ApiProperty({ description: 'Latest released app version (e.g. 1.1.0)' })
  @IsString()
  @IsNotEmpty()
  latestVersion: string;

  @ApiProperty({ description: 'Update type policy', enum: ['none', 'optional', 'force'] })
  @IsString()
  @IsIn(['none', 'optional', 'force'])
  updateType: string;

  @ApiProperty({ description: 'Dialog/screen title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Dialog/screen message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'App Store / Play Store URL' })
  @IsString()
  storeUrl: string;

  @ApiPropertyOptional({ description: 'Whether update enforcement is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Rollout percentage (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({ description: 'Policy version' })
  @IsOptional()
  policyVersion?: any;

  @ApiPropertyOptional({ description: 'Published at' })
  @IsOptional()
  publishedAt?: any;

  @ApiPropertyOptional({ description: 'Created at' })
  @IsOptional()
  createdAt?: any;

  @ApiPropertyOptional({ description: 'Updated at' })
  @IsOptional()
  updatedAt?: any;

  @ApiPropertyOptional({ description: 'Created by' })
  @IsOptional()
  createdById?: any;

  @ApiPropertyOptional({ description: 'Updated by' })
  @IsOptional()
  updatedById?: any;
}
