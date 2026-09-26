import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com or +919876543210' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'admin', required: false })
  @IsOptional()
  @IsString()
  portal?: string;
}
