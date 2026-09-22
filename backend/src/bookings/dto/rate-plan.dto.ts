import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';
import { MealPlan, RatePlanPricingType } from '@prisma/client';

export enum AcType {
  AC = 'AC',
  NON_AC = 'NON_AC',
  DEFAULT = 'DEFAULT',
}

export class CreateRatePlanDto {
  @IsString()
  @IsNotEmpty()
  roomTypeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsEnum(MealPlan)
  mealPlan: MealPlan;

  @IsOptional()
  @IsEnum(AcType)
  acType?: AcType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(RatePlanPricingType)
  pricingType?: RatePlanPricingType;

  @IsOptional()
  @IsString()
  derivedFromId?: string;

  @IsOptional()
  @IsNumber()
  derivedAmount?: number;

  @IsOptional()
  @IsNumber()
  derivedPercentage?: number;

  @IsNumber()
  basePrice: number;

  @IsNumber()
  extraAdultPrice: number;

  @IsNumber()
  extraChildPrice: number;

  @IsOptional()
  @IsString()
  cancellationPolicyId?: string;
}

export class UpdateRatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(MealPlan)
  mealPlan?: MealPlan;

  @IsOptional()
  @IsEnum(AcType)
  acType?: AcType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(RatePlanPricingType)
  pricingType?: RatePlanPricingType;

  @IsOptional()
  @IsString()
  derivedFromId?: string;

  @IsOptional()
  @IsNumber()
  derivedAmount?: number;

  @IsOptional()
  @IsNumber()
  derivedPercentage?: number;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  extraAdultPrice?: number;

  @IsOptional()
  @IsNumber()
  extraChildPrice?: number;

  @IsOptional()
  @IsString()
  cancellationPolicyId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkPricingRuleDto {
  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  daysOfWeek?: number[]; // [1,2,3,4] or [5,6,0]

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isFestivalRule?: boolean;

  @IsOptional()
  @IsString()
  festivalName?: string;
}

export class CreateCalendarEventMarkerDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @IsString()
  colorTag?: string;
}
