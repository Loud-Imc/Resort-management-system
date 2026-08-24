import { IsNotEmpty, IsString, IsISO8601, IsOptional, IsInt, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RestrictionUpdateItemDto {
  @ApiProperty({ description: 'External RoomType ID or RouteGuide RoomType ID' })
  @IsNotEmpty()
  @IsString()
  externalRoomTypeId: string;

  @ApiProperty({ description: 'Start date in YYYY-MM-DD format' })
  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @ApiProperty({ description: 'End date in YYYY-MM-DD format' })
  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @ApiPropertyOptional({ description: 'Minimum stay requirement on arrival date' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minStayArrival?: number;

  @ApiPropertyOptional({ description: 'Minimum stay requirement on any date during stay' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minStayThrough?: number;

  @ApiPropertyOptional({ description: 'Maximum stay limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStay?: number;

  @ApiPropertyOptional({ description: 'Closed to Arrival flag' })
  @IsOptional()
  @IsBoolean()
  closedToArrival?: boolean;

  @ApiPropertyOptional({ description: 'Closed to Departure flag' })
  @IsOptional()
  @IsBoolean()
  closedToDeparture?: boolean;
}

export class UpdateRestrictionsDto {
  @ApiProperty({ description: 'Internal RouteGuide Property ID or External Property ID' })
  @IsNotEmpty()
  @IsString()
  propertyId: string;

  @ApiProperty({ type: [RestrictionUpdateItemDto], description: 'Array of date-range restriction updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestrictionUpdateItemDto)
  restrictions: RestrictionUpdateItemDto[];
}
