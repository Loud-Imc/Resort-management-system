import { Module, Global } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';

@Global()
@Module({
    providers: [CurrenciesService],
    controllers: [CurrenciesController],
    exports: [CurrenciesService],
})
export class CurrenciesModule { }
