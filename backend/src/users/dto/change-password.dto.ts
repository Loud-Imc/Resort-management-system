import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'New password must be at least 6 characters long' })
    newPassword: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    confirmPassword: string;
}
