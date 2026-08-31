import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsEmail,
} from 'class-validator';

export class ConnectivityGuestDto {
  @ApiProperty({ description: 'Guest first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Guest last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Guest email address', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Guest phone number', example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Guest country', example: 'IND' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateConnectivityReservationDto {
  @ApiProperty({ description: 'Oreedu Property ID or External Property ID', example: 'c39b81f2-...' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'External PMS / Channel Manager Reservation ID', example: 'EXT-RES-1001' })
  @IsString()
  @IsNotEmpty()
  externalReservationId: string;

  @ApiProperty({ description: 'External RoomType ID', example: 'DLX' })
  @IsString()
  @IsNotEmpty()
  externalRoomTypeId: string;

  @ApiPropertyOptional({ description: 'External RatePlan ID', example: 'BAR' })
  @IsOptional()
  @IsString()
  externalRatePlanId?: string;

  @ApiProperty({ description: 'Check-in Date (YYYY-MM-DD)', example: '2026-09-10' })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ description: 'Check-out Date (YYYY-MM-DD)', example: '2026-09-15' })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({ description: 'Number of adult guests', example: 2 })
  @IsNumber()
  @Min(1)
  adultsCount: number;

  @ApiPropertyOptional({ description: 'Number of child guests', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  childrenCount?: number;

  @ApiProperty({ description: 'Total booking amount', example: 15000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: ConnectivityGuestDto, description: 'Primary guest details' })
  @ValidateNested()
  @Type(() => ConnectivityGuestDto)
  guest: ConnectivityGuestDto;

  @ApiPropertyOptional({ description: 'Special requests / notes', example: 'High floor requested' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'External reservation status', example: 'CONFIRMED' })
  @IsOptional()
  @IsString()
  status?: string;
}
