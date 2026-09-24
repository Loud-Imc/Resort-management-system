import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsNotEmpty, Min } from 'class-validator';
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
  propertyId?: string;

  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;

  @IsOptional()
  @IsString()
  channelId?: string; // e.g. "ALL", or specific OTA ID/name

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  daysOfWeek?: number[]; // [1,2,3,4] or [5,6,0]

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isFestivalRule?: boolean;

  @IsOptional()
  @IsString()
  festivalName?: string;

  @IsOptional()
  @IsNumber()
  minStayArrival?: number;

  @IsOptional()
  @IsNumber()
  minStayThrough?: number;

  @IsOptional()
  @IsNumber()
  maxStay?: number;

  @IsOptional()
  @IsBoolean()
  stopSell?: boolean;

  @IsOptional()
  @IsBoolean()
  closedToArrival?: boolean;

  @IsOptional()
  @IsBoolean()
  closedToDeparture?: boolean;

  @IsOptional()
  @IsNumber()
  allottedQuantity?: number;
}

export class ApplyRestrictionsDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @IsNumber()
  minStayArrival?: number;

  @IsOptional()
  @IsNumber()
  minStayThrough?: number;

  @IsOptional()
  @IsNumber()
  maxStay?: number;

  @IsOptional()
  @IsBoolean()
  stopSell?: boolean;

  @IsOptional()
  @IsBoolean()
  closedToArrival?: boolean;

  @IsOptional()
  @IsBoolean()
  closedToDeparture?: boolean;
}

export class SetInventoryOverrideDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  roomTypeId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @Min(0)
  allocatedQuantity: number;

  @IsOptional()
  @IsString()
  channelId?: string; // 'ALL', specific channel ID, or 'PMS_ONLY'
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
