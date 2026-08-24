import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CancelConnectivityReservationDto {
  @ApiPropertyOptional({ description: 'Cancellation reason', example: 'Guest requested cancellation via external PMS' })
  @IsOptional()
  @IsString()
  reason?: string;
}
