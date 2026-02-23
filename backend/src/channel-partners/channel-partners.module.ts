import { Module } from '@nestjs/common';
import { ChannelPartnersController } from './channel-partners.controller';
import { ChannelPartnersService } from './channel-partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [ChannelPartnersController],
    providers: [ChannelPartnersService],
    exports: [ChannelPartnersService],
})
export class ChannelPartnersModule { }
