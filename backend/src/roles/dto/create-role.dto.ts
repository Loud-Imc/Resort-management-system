import { IsString, IsOptional, IsArray, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleCategory } from '@prisma/client';

export class CreateRoleDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: RoleCategory, required: false })
    @IsEnum(RoleCategory)
    @IsOptional()
    category?: RoleCategory;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;

    @ApiProperty({ type: [String], description: 'Array of permission names (e.g. "users.view")' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}
