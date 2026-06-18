import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
    @ApiProperty({ example: 5000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    amount: number;

    @ApiProperty({ example: 'Monthly electricity bill' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 'expense-category-uuid' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: '2026-01-15', required: false })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiProperty({ example: ['receipt1.pdf', 'receipt2.jpg'], required: false })
    @IsOptional()
    receipts?: string[];

    @ApiProperty({ example: 'property-uuid', required: false })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @ApiProperty({ example: 'UPI', required: false })
    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @ApiProperty({ example: ['booking-uuid-1', 'booking-uuid-2'], required: false })
    @IsOptional()
    @IsString({ each: true })
    bookingIds?: string[];
}

export class UpdateExpenseDto {
    @ApiProperty({ example: 5500, required: false })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    amount?: number;

    @ApiProperty({ example: 'Updated description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'expense-category-uuid', required: false })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ example: '2026-01-15', required: false })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiProperty({ example: ['receipt1.pdf'], required: false })
    @IsOptional()
    receipts?: string[];

    @ApiProperty({ example: 'property-uuid', required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @ApiProperty({ example: 'UPI', required: false })
    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @ApiProperty({ example: ['booking-uuid-1', 'booking-uuid-2'], required: false })
    @IsOptional()
    @IsString({ each: true })
    bookingIds?: string[];
}

export class CreateExpenseCategoryDto {
    @ApiProperty({ example: 'Utilities' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Electricity, water, gas bills', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'property-uuid', required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;
}
