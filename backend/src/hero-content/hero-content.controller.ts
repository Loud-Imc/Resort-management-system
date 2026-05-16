import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HeroContentService } from './hero-content.service';
import { CreateHeroContentDto } from './dto/create-hero-content.dto';
import { UpdateHeroContentDto } from './dto/update-hero-content.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('hero-content')
export class HeroContentController {
    constructor(private readonly heroContentService: HeroContentService) {}

    @Get('random')
    findRandom() {
        return this.heroContentService.findRandom();
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    create(@Body() createHeroContentDto: CreateHeroContentDto) {
        return this.heroContentService.create(createHeroContentDto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    findAll() {
        return this.heroContentService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    findOne(@Param('id') id: string) {
        return this.heroContentService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    update(@Param('id') id: string, @Body() updateHeroContentDto: UpdateHeroContentDto) {
        return this.heroContentService.update(id, updateHeroContentDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    remove(@Param('id') id: string) {
        return this.heroContentService.remove(id);
    }
}
