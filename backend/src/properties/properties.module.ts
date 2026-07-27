import { Module, forwardRef } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyStaffController } from './property-staff.controller';
import { PropertyStaffService } from './property-staff.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
    imports: [PrismaModule, AuditModule, SystemSettingsModule, forwardRef(() => BookingsModule)],
    controllers: [PropertiesController, PropertyStaffController],
    providers: [PropertiesService, PropertyStaffService],
    exports: [PropertiesService, PropertyStaffService],
})
export class PropertiesModule { }
