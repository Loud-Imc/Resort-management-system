import api from './api';

export type MealPlan = 'EP' | 'CP' | 'MAP' | 'AP';
export type RatePlanPricingType = 'ABSOLUTE' | 'DERIVED';
export type AcType = 'AC' | 'NON_AC' | 'DEFAULT';

export interface RoomTypeRatePlanPrice {
  id?: string;
  ratePlanId?: string;
  roomTypeId: string;
  basePrice: number;
  extraAdultPrice?: number;
  extraChildPrice?: number;
  basePriceAc?: number | null;
  extraAdultPriceAc?: number | null;
  extraChildPriceAc?: number | null;
  roomType?: {
    id: string;
    name: string;
    acOption?: 'AC_ONLY' | 'NON_AC_ONLY' | 'BOTH';
    basePrice?: number;
    basePriceAc?: number | null;
  };
}

export interface RatePlan {
  id: string;
  propertyId?: string;
  roomTypeId?: string;
  name: string;
  code?: string;
  mealPlan: MealPlan;
  acType?: AcType;
  isPrimary: boolean;
  pricingType: RatePlanPricingType;
  derivedFromId?: string;
  derivedAmount?: number;
  derivedPercentage?: number;
  basePrice: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  cancellationPolicyId?: string;
  pricingRules?: any[];
  roomTypePrices?: RoomTypeRatePlanPrice[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roomType?: {
    id: string;
    name: string;
  };
}

export interface CreateRatePlanDto {
  propertyId?: string;
  roomTypeId?: string;
  name: string;
  code?: string;
  mealPlan: MealPlan;
  acType?: AcType;
  isPrimary?: boolean;
  pricingType?: RatePlanPricingType;
  derivedFromId?: string;
  derivedAmount?: number;
  derivedPercentage?: number;
  basePrice?: number;
  extraAdultPrice?: number;
  extraChildPrice?: number;
  cancellationPolicyId?: string;
  roomTypePrices?: {
    roomTypeId: string;
    basePrice: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
    basePriceAc?: number | null;
    extraAdultPriceAc?: number | null;
    extraChildPriceAc?: number | null;
  }[];
}

export interface BulkPricingRuleDto {
  propertyId?: string;
  roomTypeId?: string;
  ratePlanId?: string;
  channelId?: string;
  startDate: string;
  endDate: string;
  daysOfWeek?: number[]; // [1,2,3,4] for Mon-Thu, [5,6,0] for Fri-Sun
  price?: number;
  isFestivalRule?: boolean;
  festivalName?: string;
  minStayArrival?: number;
  minStayThrough?: number;
  maxStay?: number;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  allottedQuantity?: number;
}

export interface ApplyRestrictionsDto {
  propertyId: string;
  roomTypeId?: string;
  startDate: string;
  endDate: string;
  minStayArrival?: number;
  minStayThrough?: number;
  maxStay?: number;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
}

export interface SetInventoryOverrideDto {
  propertyId: string;
  roomTypeId: string;
  date: string;
  allocatedQuantity: number;
  channelId?: string;
}

export interface DailyInventoryData {
  totalRooms: number;
  bookedCount: number;
  availableCount: number;
  manualOverride?: number;
  isStopSell: boolean;
}

export interface DailyRestrictionData {
  minStayArrival?: number | null;
  minStayThrough?: number | null;
  maxStay?: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
}

export interface PropertyMatrixData {
  roomTypes: any[];
  ratePlans: RatePlan[];
  inventory: Record<string, Record<string, DailyInventoryData>>;
  restrictions: Record<string, Record<string, DailyRestrictionData>>;
  eventMarkers: CalendarEventMarker[];
}

export interface CalendarEventMarker {
  id: string;
  propertyId?: string;
  title: string;
  startDate: string;
  endDate: string;
  colorTag: string;
}

export const ratePlansService = {
  getPropertyRateMatrix: async (
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PropertyMatrixData> => {
    const res = await api.get(`/rate-plans/matrix/${propertyId}`, {
      params: { startDate, endDate },
    });
    return res.data;
  },

  getRatePlansForRoomType: async (roomTypeId: string): Promise<RatePlan[]> => {
    const res = await api.get(`/rate-plans/room-type/${roomTypeId}`);
    return res.data;
  },

  getRatePlansForProperty: async (propertyId: string): Promise<RatePlan[]> => {
    const res = await api.get(`/rate-plans/property/${propertyId}`);
    return res.data;
  },

  resetPropertyRatePlans: async (propertyId: string): Promise<RatePlan[]> => {
    const res = await api.post(`/rate-plans/reset-defaults/${propertyId}`);
    return res.data;
  },

  createRatePlan: async (dto: CreateRatePlanDto): Promise<RatePlan> => {
    const res = await api.post('/rate-plans', dto);
    return res.data;
  },

  updateRatePlan: async (id: string, dto: Partial<CreateRatePlanDto>): Promise<RatePlan> => {
    const res = await api.put(`/rate-plans/${id}`, dto);
    return res.data;
  },

  updateRoomTypePrices: async (id: string, roomTypePrices: any[]): Promise<{ success: boolean; count: number }> => {
    const res = await api.put(`/rate-plans/${id}/room-type-prices`, { roomTypePrices });
    return res.data;
  },

  deleteRatePlan: async (id: string): Promise<RatePlan> => {
    const res = await api.delete(`/rate-plans/${id}`);
    return res.data;
  },

  applyBulkPricingRule: async (dto: BulkPricingRuleDto) => {
    const res = await api.post('/rate-plans/bulk-rule', dto);
    return res.data;
  },

  applyRestrictions: async (dto: ApplyRestrictionsDto) => {
    const res = await api.post('/rate-plans/restrictions', dto);
    return res.data;
  },

  setInventoryOverride: async (dto: SetInventoryOverrideDto) => {
    const res = await api.post('/rate-plans/inventory-override', dto);
    return res.data;
  },

  getCalendarEventMarkers: async (propertyId: string, startDate?: string, endDate?: string): Promise<CalendarEventMarker[]> => {
    const res = await api.get(`/rate-plans/events/${propertyId}`, {
      params: { startDate, endDate },
    });
    return res.data;
  },

  createCalendarEventMarker: async (dto: { propertyId?: string; title: string; startDate: string; endDate: string; colorTag?: string }): Promise<CalendarEventMarker> => {
    const res = await api.post('/rate-plans/events', dto);
    return res.data;
  },

  deleteCalendarEventMarker: async (id: string): Promise<void> => {
    await api.delete(`/rate-plans/events/${id}`);
  },
};
