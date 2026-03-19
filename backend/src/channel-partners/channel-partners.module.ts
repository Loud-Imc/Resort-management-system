import { Module } from '@nestjs/common';
import { ChannelPartnersController } from './channel-partners.controller';
import { ChannelPartnersService } from './channel-partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ReferralAbuseService } from '../common/services/referral-abuse.service';
import { InMemoryReferralAbuseStore } from '../common/services/in-memory-referral-abuse.store';
import { REFERRAL_ABUSE_STORE } from '../common/services/referral-abuse-store.interface';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [ChannelPartnersController],
    providers: [
        ChannelPartnersService,
        ReferralAbuseService,
        // To swap to Redis: change useClass to RedisReferralAbuseStore
        { provide: REFERRAL_ABUSE_STORE, useClass: InMemoryReferralAbuseStore },
    ],
    exports: [ChannelPartnersService, ReferralAbuseService],
})
export class ChannelPartnersModule { }
