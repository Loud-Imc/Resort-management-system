import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrenciesService } from './currencies.service';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrenciesController {
    constructor(private readonly currenciesService: CurrenciesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active currencies' })
    getAll() {
        return this.currenciesService.getAll();
    }

    @Post(':code/rate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update exchange rate (Admin)' })
    updateRate(
        @Param('code') code: string,
        @Body('rateToINR') rateToINR: number,
    ) {
        return this.currenciesService.updateRate(code, rateToINR);
    }
}
