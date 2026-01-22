import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ type: [String], description: 'Array of permission names (e.g. "users.view")' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}
