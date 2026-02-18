import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min, IsUrl, IsBoolean } from 'class-validator';

export class CreatePartnerLevelDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsInt()
    @Min(0)
    minPoints: number;

    @IsNumber()
    @Min(0)
    commissionRate: number;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdatePartnerLevelDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    minPoints?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    commissionRate?: number;

    @IsString()
    @IsOptional()
    description?: string;
}

export class CreateRewardDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(1)
    pointCost: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;
}

export class UpdateRewardDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    pointCost?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
