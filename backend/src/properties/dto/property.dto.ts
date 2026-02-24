import { IsString, IsOptional, IsEnum, IsEmail, IsArray, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PropertyStatus } from '@prisma/client';

export enum PropertyType {
    RESORT = 'RESORT',
    HOMESTAY = 'HOMESTAY',
    HOTEL = 'HOTEL',
    VILLA = 'VILLA',
    OTHER = 'OTHER',
}

export class CreatePropertyDto {
    @ApiProperty({ example: 'Route Guide Resort' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'RESORT', enum: PropertyType })
    @IsEnum(PropertyType)
    type: PropertyType;

    @ApiProperty({ example: 'A beautiful resort near Banasura Sagar Dam' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'Banasura Hills Road' })
    @IsString()
    address: string;

    @ApiProperty({ example: 'Wayanad' })
    @IsString()
    city: string;

    @ApiProperty({ example: 'Kerala' })
    @IsString()
    state: string;

    @ApiProperty({ example: 'India' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiProperty({ example: '673123' })
    @IsOptional()
    @IsString()
    pincode?: string;

    @ApiProperty({ example: 11.6892 })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiProperty({ example: 76.0432 })
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiProperty({ example: 'contact@routeguide.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '+91 98765 43210' })
    @IsString()
    phone: string;

    @ApiProperty({ example: '+91 98765 43210' })
    @IsOptional()
    @IsString()
    whatsappNumber?: string;

    @ApiProperty({ example: ['WiFi', 'Pool', 'Restaurant'] })
    @IsOptional()
    @IsArray()
    amenities?: string[];

    @ApiProperty({ example: ['https://example.com/image1.jpg'] })
    @IsOptional()
    @IsArray()
    images?: string[];

    @ApiProperty({ example: 'https://example.com/cover.jpg' })
    @IsOptional()
    @IsString()
    coverImage?: string;

    @ApiProperty({ example: { checkIn: '14:00', checkOut: '11:00' } })
    @IsOptional()
    policies?: Record<string, any>;

    @ApiProperty({ example: 'user-uuid-123', description: 'ID of the marketing staff who added this property' })
    @IsOptional()
    @IsString()
    addedById?: string;

    @ApiProperty({ example: 1000.00, description: 'Commission amount for the marketing staff' })
    @IsOptional()
    @IsNumber()
    marketingCommission?: number;

    @ApiProperty({ example: 10.00, description: 'Commission percentage for the platform' })
    @IsOptional()
    @IsNumber()
    platformCommission?: number;

    @ApiProperty({ example: 'user-uuid-123', description: 'ID of the user who will own this property' })
    @IsOptional()
    @IsString()
    ownerId?: string;

    @ApiProperty({ example: false, description: 'Whether this property is featured on the homepage' })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiProperty({ example: 'category-uuid-123' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiProperty({ example: 12.0, description: 'Tax rate for this property (5, 12, or 18)' })
    @IsOptional()
    @IsNumber()
    taxRate?: number;
}

export class UpdatePropertyDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(PropertyType)
    type?: PropertyType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    pincode?: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    whatsappNumber?: string;

    @IsOptional()
    @IsArray()
    amenities?: string[];

    @IsOptional()
    @IsArray()
    images?: string[];

    @IsOptional()
    @IsString()
    coverImage?: string;

    @IsOptional()
    policies?: Record<string, any>;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @IsOptional()
    @IsEnum(['PENDING', 'PAID', 'CANCELLED'])
    commissionStatus?: 'PENDING' | 'PAID' | 'CANCELLED';

    @ApiProperty({ description: 'ID of the user who owns this property (Admin only)' })
    @IsOptional()
    @IsString()
    ownerId?: string;

    @ApiProperty({ description: 'ID of the marketing staff who added this property' })
    @IsOptional()
    @IsString()
    addedById?: string;

    @ApiProperty({ description: 'Commission amount for the marketing staff' })
    @IsOptional()
    @IsNumber()
    marketingCommission?: number;

    @ApiProperty({ description: 'Commission percentage for the platform' })
    @IsOptional()
    @IsNumber()
    platformCommission?: number;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    taxRate?: number;
}

export class PropertyQueryDto {
    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsEnum(PropertyType)
    type?: PropertyType;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    maxPrice?: number;

    @IsOptional()
    @IsArray()
    amenities?: string[];

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    longitude?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    radius?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isFeatured?: boolean;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isVerified?: boolean;

    @IsOptional()
    @IsEnum(PropertyStatus)
    status?: PropertyStatus;
}

