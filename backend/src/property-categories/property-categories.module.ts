import { Module } from '@nestjs/common';
import { PropertyCategoriesService } from './property-categories.service';
import { PropertyCategoriesController } from './property-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PropertyCategoriesController],
    providers: [PropertyCategoriesService],
    exports: [PropertyCategoriesService],
})
export class PropertyCategoriesModule { }
