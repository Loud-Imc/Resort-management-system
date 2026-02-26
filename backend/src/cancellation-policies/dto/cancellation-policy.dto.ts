import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CancellationRuleDto {
    @ApiProperty({ description: 'Number of hours before check-in' })
    @IsNumber()
    @Min(0)
    hoursBeforeCheckIn: number;

    @ApiProperty({ description: 'Percentage of the amount to be refunded (0-100)' })
    @IsNumber()
    @Min(0)
    @Max(100)
    refundPercentage: number;
}

export class CreateCancellationPolicyDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    propertyId: string;

    @ApiProperty({ type: [CancellationRuleDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CancellationRuleDto)
    rules: CancellationRuleDto[];

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}

export class UpdateCancellationPolicyDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ type: [CancellationRuleDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CancellationRuleDto)
    rules?: CancellationRuleDto[];

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}
