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

export class UpdateAvailabilityItemDto {
  @ApiProperty({ description: 'External RoomType ID', example: 'DLX' })
  @IsString()
  @IsNotEmpty()
  externalRoomTypeId: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-09-10' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-09-15' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'External sellable allocation cap. Set null to remove override cap.',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellableQuantity?: number | null;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ description: 'Oreedu Property ID', example: 'c39b81f2-...' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ type: [UpdateAvailabilityItemDto], description: 'List of availability allocation updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAvailabilityItemDto)
  availability: UpdateAvailabilityItemDto[];
}
