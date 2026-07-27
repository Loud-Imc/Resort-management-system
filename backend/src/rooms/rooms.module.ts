import { Module, forwardRef } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AuditModule } from '../audit/audit.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
    imports: [AuditModule, forwardRef(() => ChannelsModule)],
    controllers: [RoomsController],
    providers: [RoomsService],
    exports: [RoomsService],
})
export class RoomsModule { }
