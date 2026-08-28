import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoomMappingDto {
  @IsString()
  @IsNotEmpty()
  roomTypeId: string;

  @IsString()
  @IsNotEmpty()
  externalRoomTypeId: string;

  @IsString()
  @IsOptional()
  externalRatePlanId?: string;
}
