import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Submit a review for a property/room' })
    create(@Request() req, @Body() dto: {
        propertyId: string;
        roomTypeId?: string;
        rating: number;
        comment?: string;
    }) {
        return this.reviewsService.create(req.user.id, dto);
    }

    @Get('property/:propertyId')
    @ApiOperation({ summary: 'Get reviews for a property' })
    getForProperty(@Param('propertyId') propertyId: string) {
        return this.reviewsService.getForProperty(propertyId);
    }

    @Get('room-type/:roomTypeId')
    @ApiOperation({ summary: 'Get reviews for a room type' })
    getForRoomType(@Param('roomTypeId') roomTypeId: string) {
        return this.reviewsService.getForRoomType(roomTypeId);
    }

    @Get('stats/:propertyId')
    @ApiOperation({ summary: 'Get review statistics for a property' })
    getStats(@Param('propertyId') propertyId: string) {
        return this.reviewsService.getStats(propertyId);
    }
}
