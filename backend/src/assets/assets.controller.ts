import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { AssetOwnership, AssetCondition } from '@prisma/client';

@Controller('assets')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Permissions(PERMISSIONS.ASSETS.CREATE)
  create(@Body() createAssetDto: any) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @Permissions(PERMISSIONS.ASSETS.READ)
  findAll(
    @Query('propertyId') propertyId: string,
    @Query('ownership') ownership?: AssetOwnership,
    @Query('condition') condition?: AssetCondition,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.assetsService.findAll({ propertyId, ownership, condition, categoryId });
  }

  @Get('report/pdf')
  @Permissions(PERMISSIONS.ASSETS.READ)
  async downloadPdfReport(
    @Query('propertyId') propertyId: string,
    @Query('ownership') ownership: AssetOwnership,
    @Query('condition') condition: AssetCondition,
    @Query('categoryId') categoryId: string,
    @Res() res
  ) {
    const buffer = await this.assetsService.generatePdfReport({ propertyId, ownership, condition, categoryId });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Assets_Report.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ASSETS.READ)
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ASSETS.UPDATE)
  update(@Param('id') id: string, @Body() updateAssetDto: any) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ASSETS.DELETE)
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
