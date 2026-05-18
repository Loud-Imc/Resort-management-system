import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHeroContentDto {
    @IsString()
    @IsOptional()
    tagline?: string;

    @IsString()
    heading: string;

    @IsString()
    @IsOptional()
    subheading?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
