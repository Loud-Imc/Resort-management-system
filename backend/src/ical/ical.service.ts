import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ical from 'node-ical';
import { ICalCalendar } from 'ical-generator';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IcalService {
  private readonly logger = new Logger(IcalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync all active iCal feeds for all properties
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncAllCalendars() {
    this.logger.log('Starting scheduled iCal synchronization...');
    const activeSyncs = await this.prisma.propertyIcal.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const sync of activeSyncs) {
      try {
        await this.syncPropertyIcal(sync.id);
      } catch (error) {
        this.logger.error(`Scheduled sync failed for ID ${sync.id}: ${error.message}`);
      }
    }
  }

  /**
   * Sync a specific iCal feed
   */
  async syncPropertyIcal(syncId: string) {
    const sync = await this.prisma.propertyIcal.findUnique({
      where: { id: syncId },
      include: { 
        property: true,
        bookingSource: true
      }
    });

    if (!sync) throw new Error('Sync configuration not found');

    try {
      const data = await ical.fromURL(sync.icalUrl);
      const events = Object.values(data).filter(ev => ev && ev.type === 'VEVENT');

      // 1. Clear existing blocks from THIS specific sync to avoid duplicates
      // We'll use the notes field to identify blocks from this sync
      const syncIdentifier = `iCal-Sync-${sync.id}`;
      
      await this.prisma.roomBlock.deleteMany({
        where: {
          notes: { contains: syncIdentifier },
          room: { propertyId: sync.propertyId }
        }
      });

      // 2. Create new blocks for each event
      for (const event of events as any[]) {
        if (!event.start || !event.end) continue;

        // For simplicity in this version, we block ALL rooms in the property
        // In a more advanced version, we would map specific RoomTypes
        const rooms = await this.prisma.room.findMany({
          where: { propertyId: sync.propertyId, isEnabled: true }
        });

        for (const room of rooms) {
          await this.prisma.roomBlock.create({
            data: {
              roomId: room.id,
              startDate: new Date(event.start),
              endDate: new Date(event.end),
              reason: `External Booking (${sync.bookingSource?.name || sync.platformName})`,
              notes: `${syncIdentifier} | UID: ${event.uid || 'N/A'}`,
              createdById: sync.property.ownerId
            }
          });
        }
      }

      await this.prisma.propertyIcal.update({
        where: { id: syncId },
        data: { lastSyncedAt: new Date(), status: 'ACTIVE' }
      });

      return { success: true, eventCount: events.length };
    } catch (error) {
      await this.prisma.propertyIcal.update({
        where: { id: syncId },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }

  /**
   * Generate an ICS feed for a property
   */
  async generateExportFeed(slug: string): Promise<string> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkOutDate: { gte: new Date() }
          }
        }
      }
    });

    if (!property) throw new Error('Property not found');

    const calendar = new ICalCalendar({
      name: `${property.name} - Availability`,
      prodId: { company: 'Route Guide', product: 'Resort Management' }
    });

    for (const booking of property.bookings) {
      calendar.createEvent({
        start: booking.checkInDate,
        end: booking.checkOutDate,
        summary: 'Reserved',
        description: `Booking #${booking.bookingNumber}`,
        id: `booking-${booking.id}@routeguide.imcloud.in`
      });
    }

    return calendar.toString();
  }

  /**
   * Add a new iCal sync link
   */
  async addSyncLink(propertyId: string, data: { icalUrl: string; platformName: string; bookingSourceId?: string }) {
    return this.prisma.propertyIcal.create({
      data: {
        propertyId,
        icalUrl: data.icalUrl,
        platformName: data.platformName,
        bookingSourceId: data.bookingSourceId
      }
    });
  }

  /**
   * Remove a sync link and its associated blocks
   */
  async removeSyncLink(syncId: string) {
    const syncIdentifier = `iCal-Sync-${syncId}`;
    
    // Cleanup blocks first
    await this.prisma.roomBlock.deleteMany({
      where: { notes: { contains: syncIdentifier } }
    });

    return this.prisma.propertyIcal.delete({
      where: { id: syncId }
    });
  }

  async getSyncLinks(propertyId: string) {
    return this.prisma.propertyIcal.findMany({
      where: { propertyId }
    });
  }
}
