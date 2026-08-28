import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsEmail,
} from 'class-validator';

export class UpdateConnectivityGuestDto {
  @ApiPropertyOptional({ description: 'Guest first name', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Guest last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Guest email address', example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Guest phone number', example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Guest country', example: 'IND' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateConnectivityReservationDto {
  @ApiPropertyOptional({ description: 'External RoomType ID', example: 'DLX' })
  @IsOptional()
  @IsString()
  externalRoomTypeId?: string;

  @ApiPropertyOptional({ description: 'External RatePlan ID', example: 'BAR' })
  @IsOptional()
  @IsString()
  externalRatePlanId?: string;

  @ApiPropertyOptional({ description: 'Check-in Date (YYYY-MM-DD)', example: '2026-09-12' })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({ description: 'Check-out Date (YYYY-MM-DD)', example: '2026-09-17' })
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @ApiPropertyOptional({ description: 'Number of adult guests', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  adultsCount?: number;

  @ApiPropertyOptional({ description: 'Number of child guests', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  childrenCount?: number;

  @ApiPropertyOptional({ description: 'Total booking amount', example: 18000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: UpdateConnectivityGuestDto, description: 'Updated primary guest details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConnectivityGuestDto)
  guest?: UpdateConnectivityGuestDto;

  @ApiPropertyOptional({ description: 'Special requests / notes', example: 'Late check-in requested' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'External reservation status', example: 'CONFIRMED' })
  @IsOptional()
  @IsString()
  status?: string;
}
