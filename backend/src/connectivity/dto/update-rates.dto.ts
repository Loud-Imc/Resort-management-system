import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class UpdateRateItemDto {
  @ApiProperty({ description: 'External RoomType ID', example: 'DLX' })
  @IsString()
  @IsNotEmpty()
  externalRoomTypeId: string;

  @ApiPropertyOptional({ description: 'External RatePlan ID', example: 'BAR' })
  @IsString()
  @IsOptional()
  externalRatePlanId?: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-09-10' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-09-15' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Target daily selling price', example: 6500.00 })
  @IsNumber()
  @Min(0.01)
  price: number;
}

export class UpdateRatesDto {
  @ApiProperty({ description: 'RouteGuide Property ID', example: 'c39b81f2-...' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ type: [UpdateRateItemDto], description: 'List of rate updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRateItemDto)
  rates: UpdateRateItemDto[];
}
