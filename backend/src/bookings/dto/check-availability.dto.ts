import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
    @ApiProperty({ example: 'room-type-uuid' })
    @IsString()
    @IsNotEmpty()
    roomTypeId: string;

    @ApiProperty({ example: '2026-02-01' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;
}
