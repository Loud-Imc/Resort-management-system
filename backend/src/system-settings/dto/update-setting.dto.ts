import { IsString, IsNotEmpty, IsOptional, IsJSON } from 'class-validator';

export class UpdateSettingDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsNotEmpty()
    value: any;

    @IsString()
    @IsOptional()
    description?: string;
}
