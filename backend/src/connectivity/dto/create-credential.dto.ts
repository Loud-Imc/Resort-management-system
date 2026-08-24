import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ConnectivityCredentialEnv } from '@prisma/client';

export class CreateCredentialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ConnectivityCredentialEnv)
  @IsOptional()
  environment?: ConnectivityCredentialEnv;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
