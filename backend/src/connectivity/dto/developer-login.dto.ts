import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class DeveloperLoginDto {
  @ApiProperty({ example: 'developer@acmepms.com', description: 'Developer account contact email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd2026', description: 'Developer portal password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
