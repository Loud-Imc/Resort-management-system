import { Module } from '@nestjs/common';
import { IncomeService } from './income.service';
import { IncomeController } from './income.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [IncomeController],
    providers: [IncomeService],
    exports: [IncomeService],
})
export class IncomeModule { }
