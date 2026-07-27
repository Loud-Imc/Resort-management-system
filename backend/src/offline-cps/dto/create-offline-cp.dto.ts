import { IsString, IsOptional, IsNumber, IsEmail, Min, Max } from 'class-validator';

export class CreateOfflineCpDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    defaultCommission?: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsString()
    propertyId: string;
}
