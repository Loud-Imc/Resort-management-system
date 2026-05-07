import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestChangePasswordOtpDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    currentPassword: string;
}

export class ConfirmChangePasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'New password must be at least 6 characters long' })
    newPassword: string;
}
