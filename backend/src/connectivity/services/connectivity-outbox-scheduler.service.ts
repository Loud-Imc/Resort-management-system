import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConnectivityOutboxProcessorService } from './connectivity-outbox-processor.service';

@Injectable()
export class ConnectivityOutboxSchedulerService {
  private readonly logger = new Logger(ConnectivityOutboxSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly processorService: ConnectivityOutboxProcessorService,
  ) {}

  /**
   * Background polling worker for outbound webhooks
   * Executes every 5 seconds using NestJS Schedule cron infrastructure
   */
  @Cron('*/5 * * * * *')
  async processOutboxCron(): Promise<number> {
    if (this.isProcessing) {
      this.logger.debug('Outbox scheduler cycle already in progress, skipping tick.');
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const claimedIds = await this.processorService.claimNextBatch(10);
      if (claimedIds && claimedIds.length > 0) {
        this.logger.log(`Outbox scheduler claimed ${claimedIds.length} records for delivery processing.`);

        for (const id of claimedIds) {
          try {
            await this.processorService.processOutboxRecord(id);
            processedCount++;
          } catch (err: any) {
            this.logger.error(`Error processing outbox record ${id}: ${err.message}`, err.stack);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error during outbox scheduler polling cycle: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
