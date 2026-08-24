import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  externalPropertyId: string;
}
