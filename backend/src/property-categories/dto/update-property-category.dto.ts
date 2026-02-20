import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyCategoryDto } from './create-property-category.dto';

export class UpdatePropertyCategoryDto extends PartialType(CreatePropertyCategoryDto) { }
