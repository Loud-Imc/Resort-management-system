import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsCronService } from './promotions-cron.service';

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionsCronService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
