import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [RoomsController],
    providers: [RoomsService],
    exports: [RoomsService],
})
export class RoomsModule { }
