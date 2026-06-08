import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckOutDto {
    @ApiProperty({ example: '2026-06-08T12:00:00.000Z', required: false })
    @IsString()
    @IsOptional()
    checkedOutAt?: string;
}
