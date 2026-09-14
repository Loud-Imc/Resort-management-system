import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigQueryDto {
  @ApiProperty({ description: 'Platform (android or ios)', enum: ['android', 'ios'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['android', 'ios'], { message: 'platform must be either android or ios' })
  platform: string;

  @ApiPropertyOptional({ description: 'Currently installed app semantic version (e.g. 2.4.0)' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Application flavor/identifier (e.g. guest, partner, admin)' })
  @IsOptional()
  @IsString()
  appId?: string;
}
