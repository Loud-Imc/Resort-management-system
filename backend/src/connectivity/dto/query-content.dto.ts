import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryContentDto {
  @ApiPropertyOptional({ description: 'External Property ID registered in connection mapping' })
  @IsOptional()
  @IsString()
  externalPropertyId?: string;

  @ApiPropertyOptional({ description: 'Oreedu Property ID registered in connection mapping' })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
