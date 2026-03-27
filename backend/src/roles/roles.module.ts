import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SeedService } from './seed.service';

@Module({
    imports: [PrismaModule],
    controllers: [RolesController],
    providers: [RolesService, SeedService],
    exports: [RolesService],
})
export class RolesModule { }
