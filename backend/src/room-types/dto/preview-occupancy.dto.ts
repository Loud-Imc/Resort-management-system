import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PreviewOccupancyDto {
    @ApiProperty({ example: 2, required: false, default: 2 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Type(() => Number)
    baseAdults?: number;

    @ApiProperty({ example: 0, required: false, default: 0 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    baseChildren?: number;

    @ApiProperty({ example: 4, required: false, default: 4 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Type(() => Number)
    maxPhysicalAdults?: number;

    @ApiProperty({ example: 2, required: false, default: 2 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    maxPhysicalChildren?: number;

    @ApiProperty({ example: 1, required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    maxPhysicalInfants?: number;
}
