import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionRequestDto {
  @ApiProperty({ enum: PromotionType, description: 'Placement type' })
  @IsEnum(PromotionType)
  @IsNotEmpty()
  type: PromotionType;

  @ApiProperty({ description: 'Target campaign start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Target campaign end date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class ApprovePromotionDto {
  @ApiProperty({ description: 'Manually quoted price by the admin for this seasonal booking' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;
}

export class PromotionQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;
}

export class VerifyPromotionPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
