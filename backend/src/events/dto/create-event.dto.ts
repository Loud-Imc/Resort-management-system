import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EventOrganizerType {
    PROPERTY = 'PROPERTY',
    EXTERNAL = 'EXTERNAL',
}

export class CreateEventDto {
    @ApiProperty({ example: 'Weekend Wellness Retreat' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Join us for 3 days of rejuvenating yoga...', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: '2026-03-15T10:00:00Z' })
    @IsDate()
    @Type(() => Date)
    date: Date;

    @ApiProperty({ example: 'Yoga Pavilion' })
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiProperty({ example: '$299', required: false })
    @IsString()
    @IsOptional()
    price?: string;

    @ApiProperty({ example: ['https://example.com/event1.jpg'], type: [String] })
    @IsArray()
    @IsString({ each: true })
    images: string[];

    @ApiProperty({ enum: EventOrganizerType, example: EventOrganizerType.PROPERTY })
    @IsEnum(EventOrganizerType)
    organizerType: EventOrganizerType;

    @ApiProperty({ example: 'uuid-of-property', required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;
}
