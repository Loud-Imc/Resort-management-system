import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BookingsService } from './src/bookings/bookings.service';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookingsService = app.get(BookingsService);
  
  try {
    // Get a valid booking ID first. We will just get the first one.
    const prisma = app.get('PrismaService'); // assuming PrismaService is available
    const booking = await prisma.booking.findFirst({
        where: {
            status: { not: 'CANCELLED' }
        },
        include: {
            property: true,
            user: true,
            roomType: true,
            room: { include: { property: true } }
        }
    });

    if (!booking) {
        console.log('No booking found to test with.');
        process.exit(0);
    }

    console.log(`Testing with booking ID: ${booking.id}`);
    const pdfBuffer = await bookingsService.generateInvoice(booking.id, 'GUEST');
    
    fs.writeFileSync('test-invoice.pdf', pdfBuffer);
    console.log('PDF generated successfully: test-invoice.pdf');
  } catch (err) {
    console.error('PDF Generation Failed:', err);
  } finally {
    await app.close();
  }
}
bootstrap();
