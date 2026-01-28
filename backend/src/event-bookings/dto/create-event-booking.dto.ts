import { IsString, IsNotEmpty, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventBookingDto {
    @ApiProperty({ example: 'event-uuid-123' })
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @ApiProperty({ example: 'John Doe', required: false })
    @IsString()
    @IsOptional()
    guestName?: string;

    @ApiProperty({ example: 'john@example.com', required: false })
    @IsEmail()
    @IsOptional()
    guestEmail?: string;

    @ApiProperty({ example: '+919876543210', required: false })
    @IsPhoneNumber()
    @IsOptional()
    guestPhone?: string;
}
