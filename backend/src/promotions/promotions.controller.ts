import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PromotionsService } from './promotions.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreatePromotionRequestDto,
  ApprovePromotionDto,
  PromotionQueryDto,
  VerifyPromotionPaymentDto,
} from './dto/promotion-request.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('requests/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new campaign promotion request from property portal' })
  submitRequest(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreatePromotionRequestDto,
  ) {
    return this.promotionsService.submitRequest(propertyId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List promotion campaigns matching query' })
  findAll(@Query() query: PromotionQueryDto) {
    return this.promotionsService.findAll(query);
  }

  @Get('availability/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current featured slots availability in properties district' })
  getRegionalAvailability(@Param('propertyId') propertyId: string) {
    return this.promotionsService.getRegionalAvailability(propertyId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'SuperAdmin', 'Marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin approves the request and sets dynamic seasonal price' })
  approveRequest(
    @Param('id') id: string,
    @Body() dto: ApprovePromotionDto,
  ) {
    return this.promotionsService.approveRequest(id, dto.price);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'SuperAdmin', 'Marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin rejects a promotion request' })
  rejectRequest(@Param('id') id: string) {
    return this.promotionsService.rejectRequest(id);
  }

  @Post(':id/initiate-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a real Razorpay order for campaign activation' })
  initiatePayment(@Param('id') id: string) {
    return this.promotionsService.initiatePayment(id);
  }

  @Post(':id/verify-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay payment signature and activate promotion' })
  verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPromotionPaymentDto,
  ) {
    return this.promotionsService.verifyPayment(id, dto);
  }
}
