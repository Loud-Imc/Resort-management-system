import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGlobalCapabilitiesDto {
  @IsBoolean()
  @IsOptional()
  contentEditing?: boolean;

  @IsBoolean()
  @IsOptional()
  availabilitySync?: boolean;

  @IsBoolean()
  @IsOptional()
  rateSync?: boolean;

  @IsBoolean()
  @IsOptional()
  restrictionSync?: boolean;

  @IsBoolean()
  @IsOptional()
  reservationSync?: boolean;
}
