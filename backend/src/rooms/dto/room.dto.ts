import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomDto {
    @ApiProperty({ example: '101' })
    @IsString()
    @IsNotEmpty()
    roomNumber: string;

    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(0)
    @Type(() => Number)
    floor: number;

    @ApiProperty({ example: 'room-type-uuid' })
    @IsString()
    @IsNotEmpty()
    roomTypeId: string;

    @ApiProperty({ example: 'Corner room with city view', required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;
}

export class UpdateRoomDto {
    @ApiProperty({ example: '101A', required: false })
    @IsString()
    @IsOptional()
    roomNumber?: string;

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    floor?: number;

    @ApiProperty({ example: 'AVAILABLE', required: false })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ example: 'Renovated', required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;

    @ApiProperty({ example: 'room-type-uuid', required: false })
    @IsString()
    @IsOptional()
    roomTypeId?: string;
}

export class BlockRoomDto {
    @ApiProperty({ example: '2026-02-01' })
    @IsString()
    @IsNotEmpty()
    startDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsString()
    @IsNotEmpty()
    endDate: string;

    @ApiProperty({ example: 'Maintenance' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({ example: 'AC repair scheduled', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
