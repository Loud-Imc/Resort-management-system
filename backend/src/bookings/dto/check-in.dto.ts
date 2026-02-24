import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GuestVerificationDto {
    @ApiProperty({ example: 'guest-uuid' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'AADHAR', required: false })
    @IsString()
    @IsOptional()
    idType?: string;

    @ApiProperty({ example: '1234 5678 9012', required: false })
    @IsString()
    @IsOptional()
    idNumber?: string;

    @ApiProperty({ example: 'https://example.com/id-image.jpg', required: false })
    @IsString()
    @IsOptional()
    idImage?: string;
}

export class CheckInDto {
    @ApiProperty({ type: [GuestVerificationDto], required: false })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => GuestVerificationDto)
    guests?: GuestVerificationDto[];
}
