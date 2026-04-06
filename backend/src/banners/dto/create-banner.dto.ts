import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, IsEnum } from 'class-validator';
import { BannerType } from '@prisma/client';

export class CreateBannerDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    imageUrl: string;

    @IsString()
    @IsOptional()
    linkUrl?: string;

    @IsString()
    @IsOptional()
    buttonText?: string;

    @IsString()
    @IsOptional()
    badgeText?: string;

    @IsEnum(BannerType)
    @IsOptional()
    type?: BannerType;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;
}
