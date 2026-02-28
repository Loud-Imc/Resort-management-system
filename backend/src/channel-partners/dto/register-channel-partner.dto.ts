import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength, IsPhoneNumber } from 'class-validator';
import { PartnerType } from '@prisma/client';

export class RegisterChannelPartnerDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber()
    phone: string;

    @IsEnum(PartnerType)
    @IsNotEmpty()
    partnerType: PartnerType;

    // Organization fields (required if partnerType is ORGANIZATION)
    @IsString()
    @IsOptional()
    organizationName?: string;

    @IsString()
    @IsOptional()
    taxId?: string; // GST/PAN

    @IsString()
    @IsOptional()
    businessAddress?: string;

    @IsString()
    @IsOptional()
    authorizedPersonName?: string;

    @IsString()
    @IsOptional()
    aadhaarImage?: string;

    @IsString()
    @IsOptional()
    licenceImage?: string;
}
