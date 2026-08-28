import { Module, forwardRef } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { RoomTypesController } from './room-types.controller';
import { ChannelsModule } from '../channels/channels.module';
import { ConnectivityModule } from '../connectivity/connectivity.module';

@Module({
    imports: [
        forwardRef(() => ChannelsModule),
        forwardRef(() => ConnectivityModule),
    ],
    controllers: [RoomTypesController],
    providers: [RoomTypesService],
    exports: [RoomTypesService],
})
export class RoomTypesModule { }
