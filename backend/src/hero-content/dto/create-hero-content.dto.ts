import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHeroContentDto {
    @IsString()
    @IsOptional()
    tagline?: string;

    @IsString()
    heading: string;

    @IsString()
    subheading: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
