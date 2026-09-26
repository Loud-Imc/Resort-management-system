import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: 'user@example.com or +919876543210' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'admin', required: false })
  @IsOptional()
  @IsString()
  portal?: string;
}
