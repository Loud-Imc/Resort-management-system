import { IsNotEmpty, IsString, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAvailabilityDto {
  @ApiProperty({ description: 'Internal RouteGuide Property ID or External Property ID' })
  @IsNotEmpty()
  @IsString()
  propertyId: string;

  @ApiProperty({ description: 'Start date in YYYY-MM-DD format' })
  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @ApiProperty({ description: 'End date in YYYY-MM-DD format' })
  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @ApiPropertyOptional({ description: 'Filter by specific RouteGuide RoomType ID' })
  @IsOptional()
  @IsString()
  roomTypeId?: string;
}
