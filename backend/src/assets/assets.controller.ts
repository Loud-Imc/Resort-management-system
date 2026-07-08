import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AssetOwnership, AssetCondition } from '@prisma/client';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: any) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(
    @Query('propertyId') propertyId: string,
    @Query('ownership') ownership?: AssetOwnership,
    @Query('condition') condition?: AssetCondition,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.assetsService.findAll({ propertyId, ownership, condition, categoryId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetDto: any) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
