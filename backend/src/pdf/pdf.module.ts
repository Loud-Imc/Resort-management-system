import { Module, Global } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Global()
@Module({
  imports: [SystemSettingsModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
