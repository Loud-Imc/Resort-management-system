import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackBookingDto {
    @ApiProperty({ example: 'BK-123456' })
    @IsString()
    @IsNotEmpty()
    bookingNumber: string;

    @ApiProperty({ example: 'guest@example.com' })
    @IsString()
    @IsNotEmpty()
    emailOrPhone: string;
}
