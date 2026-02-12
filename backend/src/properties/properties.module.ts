import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyStaffController } from './property-staff.controller';
import { PropertyStaffService } from './property-staff.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PropertiesController, PropertyStaffController],
    providers: [PropertiesService, PropertyStaffService],
    exports: [PropertiesService, PropertyStaffService],
})
export class PropertiesModule { }
