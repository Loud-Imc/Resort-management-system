import { IsString, IsOptional, IsEmail, IsObject, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCPProfileDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional()
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    // Payout Details
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    bankName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    accountHolderName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    ifscCode?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    upiId?: string;

    // Notifications
    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    notificationPrefs?: any;
}
