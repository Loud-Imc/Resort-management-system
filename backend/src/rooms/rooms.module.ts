import { Module, forwardRef } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AuditModule } from '../audit/audit.module';
import { ChannelsModule } from '../channels/channels.module';
import { ConnectivityModule } from '../connectivity/connectivity.module';

@Module({
    imports: [
        AuditModule,
        forwardRef(() => ChannelsModule),
        forwardRef(() => ConnectivityModule),
    ],
    controllers: [RoomsController],
    providers: [RoomsService],
    exports: [RoomsService],
})
export class RoomsModule { }
