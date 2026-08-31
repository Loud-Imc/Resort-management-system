import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ConnectivityCredentialEnv } from '@prisma/client';

export class CreateCredentialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ConnectivityCredentialEnv)
  @IsOptional()
  environment?: ConnectivityCredentialEnv;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  adminBypass?: boolean;
}
