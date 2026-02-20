import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength, IsPhoneNumber, IsArray, IsNumber } from 'class-validator';
import { PropertyType } from '@prisma/client';

export class RegisterPropertyDto {
    // Owner details
    @IsEmail()
    @IsNotEmpty()
    ownerEmail: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    ownerPassword: string;

    @IsString()
    @IsNotEmpty()
    ownerFirstName: string;

    @IsString()
    @IsNotEmpty()
    ownerLastName: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber()
    ownerPhone: string;

    // Property details
    @IsString()
    @IsNotEmpty()
    propertyName: string;

    @IsString()
    @IsNotEmpty()
    propertyDescription: string;

    @IsEnum(PropertyType)
    @IsNotEmpty()
    propertyType: PropertyType;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsNotEmpty()
    pincode: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber()
    propertyPhone: string;

    @IsEmail()
    @IsNotEmpty()
    propertyEmail: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];
}
