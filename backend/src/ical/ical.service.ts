import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ical from 'node-ical';
import { ICalCalendar } from 'ical-generator';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AvailabilityService } from '../bookings/availability.service';

@Injectable()
export class IcalService {
  private readonly logger = new Logger(IcalService.name);

  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
  ) { }

  /**
   * Sync all active iCal feeds for all properties
   */
  @Cron('0 */15 * * * *')  // Every 15 minutes
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
    // 1. Atomic Lock Acquisition
    const lock = await this.prisma.propertyIcal.updateMany({
      where: {
        id: syncId,
        status: { not: 'SYNCING' }
      },
      data: { status: 'SYNCING' }
    });

    if (lock.count === 0) {
      this.logger.warn(`Sync already in progress or not found for ID ${syncId}. Aborting.`);
      return { success: false, message: 'Sync already in progress' };
    }

    let finalStatus: 'ACTIVE' | 'FAILED' = 'ACTIVE';

    try {
      const sync = await this.prisma.propertyIcal.findUnique({
        where: { id: syncId },
        include: {
          property: true,
          bookingSource: true,
          roomType: true
        }
      });

      if (!sync) throw new Error('Sync configuration not found');

      const data = await ical.fromURL(sync.icalUrl);
      const events = Object.values(data).filter(ev => ev && ev.type === 'VEVENT');

      // Clear existing blocks from THIS specific sync to avoid duplicates
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

        const checkIn = new Date(event.start);
        const checkOut = new Date(event.end);

        // Common logic: find a room that is truly available (no bookings, no other blocks)
        const rooms = await this.prisma.room.findMany({
          where: {
            propertyId: sync.propertyId,
            ...(sync.roomTypeId && { roomTypeId: sync.roomTypeId }),
            isEnabled: true
          },
          orderBy: { blocks: { _count: 'asc' } }  // Priority to rooms with fewer existing blocks
        });

        let blocked = false;
        for (const room of rooms) {
          const isAvailable = await this.availabilityService.isRoomAvailable(room.id, checkIn, checkOut);

          if (isAvailable) {
            await this.prisma.roomBlock.create({
              data: {
                roomId: room.id,
                startDate: checkIn,
                endDate: checkOut,
                reason: `External Booking (${sync.bookingSource?.name || sync.platformName})`,
                notes: `${syncIdentifier} | UID: ${event.uid || 'N/A'}`,
                createdById: sync.property.ownerId
              }
            });
            blocked = true;
            break; // Found a room, move to next event
          }
        }

        if (!blocked) {
          const context = sync.roomTypeId ? `type ${sync.roomType?.name || sync.roomTypeId}` : 'any type';
          this.logger.warn(`No available room of ${context} for event ${event.uid || 'N/A'} in property ${sync.propertyId}`);
        }
      }

      return { success: true, eventCount: events.length };
    } catch (error) {
      finalStatus = 'FAILED';
      this.logger.error(`Sync failed for ID ${syncId}: ${error.message}`);
      throw error;
    } finally {
      // 3. Always release the lock and update lastSyncedAt
      await this.prisma.propertyIcal.update({
        where: { id: syncId },
        data: {
          status: finalStatus,
          lastSyncedAt: new Date()
        }
      });
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
  async addSyncLink(propertyId: string, data: { icalUrl: string; platformName: string; bookingSourceId?: string; roomTypeId?: string }) {
    return this.prisma.propertyIcal.create({
      data: {
        propertyId,
        icalUrl: data.icalUrl,
        platformName: data.platformName,
        bookingSourceId: data.bookingSourceId,
        roomTypeId: data.roomTypeId
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
