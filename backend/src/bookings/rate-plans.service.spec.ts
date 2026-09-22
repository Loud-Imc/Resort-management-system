import { Test, TestingModule } from '@nestjs/testing';
import { RatePlansService } from './services/rate-plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { MealPlan, RatePlanPricingType } from '@prisma/client';

describe('RatePlansService Unit Tests', () => {
  let service: RatePlansService;
  let prisma: PrismaService;

  const mockPrismaService = {
    ratePlan: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    roomType: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    pricingRule: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    calendarEventMarker: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatePlansService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RatePlansService>(RatePlansService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should auto-seed default primary EP rate plan if none exists', async () => {
    mockPrismaService.ratePlan.findFirst.mockResolvedValue(null);
    mockPrismaService.roomType.findUnique.mockResolvedValue({
      id: 'rt-1',
      name: 'Deluxe Suite',
      basePrice: 3000,
      extraAdultPrice: 500,
      extraChildPrice: 250,
    });
    mockPrismaService.ratePlan.create.mockResolvedValue({
      id: 'rp-ep-1',
      roomTypeId: 'rt-1',
      name: 'Deluxe Suite EP (Room Only)',
      mealPlan: MealPlan.EP,
      isPrimary: true,
      basePrice: 3000,
    });

    const result = await service.ensureDefaultRatePlan('rt-1');
    expect(result.id).toBe('rp-ep-1');
    expect(mockPrismaService.ratePlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mealPlan: MealPlan.EP,
          isPrimary: true,
        }),
      })
    );
  });

  it('should create a custom CP rate plan', async () => {
    mockPrismaService.roomType.findUnique.mockResolvedValue({ id: 'rt-1' });
    mockPrismaService.ratePlan.create.mockResolvedValue({
      id: 'rp-cp-1',
      roomTypeId: 'rt-1',
      name: 'Deluxe Suite CP (Breakfast)',
      mealPlan: MealPlan.CP,
      basePrice: 3600,
    });

    const result = await service.createRatePlan({
      roomTypeId: 'rt-1',
      name: 'Deluxe Suite CP (Breakfast)',
      mealPlan: MealPlan.CP,
      basePrice: 3600,
      extraAdultPrice: 600,
      extraChildPrice: 300,
    });

    expect(result.id).toBe('rp-cp-1');
    expect(result.mealPlan).toBe(MealPlan.CP);
  });

  it('should create a bulk weekend pricing rule with daysOfWeek = [5, 6, 0]', async () => {
    mockPrismaService.ratePlan.findFirst.mockResolvedValue({ id: 'rp-1' });
    mockPrismaService.pricingRule.create.mockResolvedValue({
      id: 'rule-1',
      daysOfWeek: [5, 6, 0],
      adjustmentValue: 4500,
    });

    const result = await service.applyBulkPricingRule({
      roomTypeId: 'rt-1',
      ratePlanId: 'rp-1',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      daysOfWeek: [5, 6, 0], // Fri, Sat, Sun
      price: 4500,
    });

    expect(result.id).toBe('rule-1');
    expect(mockPrismaService.pricingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          daysOfWeek: [5, 6, 0],
          adjustmentValue: 4500,
        }),
      })
    );
  });

  it('should create a festival calendar event marker', async () => {
    mockPrismaService.calendarEventMarker.create.mockResolvedValue({
      id: 'event-1',
      title: 'Diwali Festival Peak',
      colorTag: '#EF4444',
    });

    const result = await service.createCalendarEventMarker({
      propertyId: 'prop-1',
      title: 'Diwali Festival Peak',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
    });

    expect(result.id).toBe('event-1');
    expect(result.title).toBe('Diwali Festival Peak');
  });
});
