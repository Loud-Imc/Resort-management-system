import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import { IcalService } from './ical.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('iCal Sync')
@Controller('ical')
export class IcalController {
  constructor(private readonly icalService: IcalService) {}

  @Get('export/:slug.ics')
  @ApiOperation({ summary: 'Export property availability as iCal (Public)' })
  async exportCalendar(@Param('slug') slug: string, @Res() res: Response) {
    const ics = await this.icalService.generateExportFeed(slug);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
    return res.send(ics);
  }

  @Post('sync/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger manual sync for a specific link' })
  async triggerSync(@Param('id') syncId: string) {
    return this.icalService.syncPropertyIcal(syncId);
  }

  @Get('settings/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sync links for a property' })
  async getLinks(@Param('propertyId') propertyId: string) {
    return this.icalService.getSyncLinks(propertyId);
  }

  @Post('settings/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new iCal sync link' })
  async addLink(
    @Param('propertyId') propertyId: string,
    @Body() data: { icalUrl: string; platformName: string; bookingSourceId?: string }
  ) {
    return this.icalService.addSyncLink(propertyId, data);
  }

  @Delete('settings/:syncId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a sync link' })
  async removeLink(@Param('syncId') syncId: string) {
    return this.icalService.removeSyncLink(syncId);
  }
}
