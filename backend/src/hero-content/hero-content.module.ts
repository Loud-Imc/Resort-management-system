import { Module } from '@nestjs/common';
import { HeroContentService } from './hero-content.service';
import { HeroContentController } from './hero-content.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [HeroContentController],
    providers: [HeroContentService],
    exports: [HeroContentService],
})
export class HeroContentModule {}
