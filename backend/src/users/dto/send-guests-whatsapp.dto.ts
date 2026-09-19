import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendGuestsWhatsappDto {
    @ApiProperty({ description: 'Array of guest user IDs to send WhatsApp message to', type: [String] })
    @IsArray()
    @IsNotEmpty()
    userIds: string[];

    @ApiProperty({ description: 'The text message to be sent via WhatsApp' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ required: false, description: 'Optional property ID context' })
    @IsString()
    @IsOptional()
    propertyId?: string;
}
