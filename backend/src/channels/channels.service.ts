import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { IChannelAdapter, InventoryUpdateDto, RateUpdateDto } from './interfaces/channel-adapter.interface';
import { ChannexAdapter } from './adapters/channex.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { format, addDays } from 'date-fns';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);
  private adapters: Map<string, IChannelAdapter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly channexAdapter: ChannexAdapter,
    private readonly mockAdapter: MockAdapter,
  ) {
    this.registerAdapter(this.channexAdapter);
    this.registerAdapter(this.mockAdapter);
  }

  private registerAdapter(adapter: IChannelAdapter) {
    this.adapters.set(adapter.channelName.toUpperCase(), adapter);
  }

  getAdapter(channelName: string): IChannelAdapter {
    const adapter = this.adapters.get(channelName.toUpperCase());
    if (!adapter) {
      throw new BadRequestException(`No channel adapter registered for '${channelName}'`);
    }
    return adapter;
  }

  /**
   * Returns the complete schema and catalog of global travel channels supported by the Channex 2-Way REST API Engine.
   * Provides exact required parameters for each OTA so frontend forms dynamically render exact inputs without hardcoding.
   */
  async getAvailableChannelsCatalog() {
    return [
      {
        key: 'makemytrip',
        title: 'MakeMyTrip (India Top Leader - IngoMMT)',
        category: 'Regional Leader',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'MakeMyTrip / Ingo-MMT Property ID', type: 'text', required: true, placeholder: 'e.g. MMT-8891' },
          { key: 'accessToken', label: 'Connection Security Token (from Extranet settings)', type: 'password', required: true, placeholder: 'Enter Connection Token' },
          { key: 'pricingType', label: 'Pricing Scheme', type: 'select', options: ['Standard (Per Room)', 'Occupancy Based Scheme'], default: 'Standard (Per Room)' },
          { key: 'syncB2B', label: 'Sync B2B Rates & Corporate Discounts', type: 'boolean', default: true }
        ]
      },
      {
        key: 'goibibo',
        title: 'Goibibo (India Partner Network - IngoMMT)',
        category: 'Regional Leader',
        color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'Goibibo / Ingo-MMT Property ID', type: 'text', required: true, placeholder: 'e.g. GO-7712' },
          { key: 'accessToken', label: 'Connection Security Token (from Extranet settings)', type: 'password', required: true, placeholder: 'Enter Connection Token' },
          { key: 'pricingType', label: 'Pricing Scheme', type: 'select', options: ['Standard (Per Room)', 'Occupancy Based Scheme'], default: 'Standard (Per Room)' },
          { key: 'syncB2B', label: 'Sync Corporate & B2B Discounts', type: 'boolean', default: true }
        ]
      },
      {
        key: 'bookingcom',
        title: 'Booking.com (Global Leader)',
        category: 'Global Leader',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'Booking.com Property ID', type: 'text', required: true, placeholder: 'e.g. 1234567' },
          { key: 'pricingType', label: 'Pricing Scheme', type: 'select', options: ['Standard (Per Room)', 'Occupancy Based Scheme'], default: 'Standard (Per Room)' },
          { key: 'sendEmail', label: 'Receive Direct Guest Emails', type: 'boolean', default: true }
        ]
      },
      {
        key: 'agoda',
        title: 'Agoda (APAC & Southeast Asia Leader)',
        category: 'Global Leader',
        color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'Agoda Property ID', type: 'text', required: true, placeholder: 'e.g. AGODA-9021' },
          { key: 'accessToken', label: 'Connection Security Token (from Agoda settings)', type: 'password', required: true, placeholder: 'Enter Security Token' },
          { key: 'totalType', label: 'Amount Calculation Method', type: 'select', options: ['Payout Amount (Net after Commission)', 'Sell Rate (Gross Guest Price)'], default: 'Payout Amount (Net after Commission)' }
        ]
      },
      {
        key: 'airbnb',
        title: 'Airbnb (Vacation & Homestay Leader)',
        category: 'Global Leader',
        color: 'from-rose-500/10 to-red-500/10 border-rose-500/30',
        fields: [
          { key: 'oauthConnect', label: 'Connection Method', type: 'info', description: 'Connects directly to your official Airbnb host dashboard with one click authorization.' },
          { key: 'minStayType', label: 'Minimum Stay Rule', type: 'select', options: ['Arrival (Check-in day rule)', 'Both (Every day check)'], default: 'Arrival (Check-in day rule)' },
          { key: 'lessCoHost', label: 'Exclude Co-Host Commission', type: 'boolean', default: false }
        ]
      },
      {
        key: 'expedia',
        title: 'Expedia Group (Hotels.com / Vrbo / Orbitz)',
        category: 'Global Leader',
        color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30',
        fields: [
          { key: 'hotelId', label: 'Expedia Property ID', type: 'text', required: true, placeholder: 'e.g. EXP-8821' },
          { key: 'accessToken', label: 'Connection Security Password', type: 'password', required: true, placeholder: 'Enter Connection Password' },
          { key: 'pricingType', label: 'Pricing Scheme', type: 'select', options: ['Standard (Per Room)', 'Occupancy Based Scheme'], default: 'Standard (Per Room)' }
        ]
      },
      {
        key: 'tripcom',
        title: 'Trip.com / Ctrip (China & APAC Leader)',
        category: 'Global Leader',
        color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'Trip.com / Ctrip Property ID', type: 'text', required: true, placeholder: 'e.g. TRIP-ID-991' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Connection Token' },
          { key: 'totalType', label: 'Amount Calculation Method', type: 'select', options: ['Payout Amount (Net)', 'Sell Rate (Gross)'], default: 'Payout Amount (Net)' }
        ]
      },
      {
        key: 'easemytrip',
        title: 'EaseMyTrip (India & Regional)',
        category: 'Regional Leader',
        color: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30',
        fields: [
          { key: 'hotelId', label: 'EaseMyTrip Property ID', type: 'text', required: true, placeholder: 'e.g. EMT-HOTEL-551' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Connection Token' },
          { key: 'syncB2B', label: 'Sync Corporate & B2B Rates', type: 'boolean', default: true }
        ]
      },
      {
        key: 'googlehotels',
        title: 'Google Hotel Ads (Direct Search Bookings)',
        category: 'Metasearch & Direct',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/30',
        fields: [
          { key: 'hotelId', label: 'Google Business Profile / Property ID', type: 'text', required: true, placeholder: 'e.g. GOOG-HOTEL-771' },
          { key: 'currency', label: 'Default Currency Code', type: 'text', required: true, placeholder: 'e.g. INR or USD' },
          { key: 'landingPageUrl', label: 'Resort Direct Booking Website Link', type: 'text', required: true, placeholder: 'https://yourresort.com/book' }
        ]
      },
      {
        key: 'vrbo',
        title: 'VRBO / HomeAway (Vacation Rental Network)',
        category: 'Vacation Rentals',
        color: 'from-blue-600/10 to-indigo-600/10 border-blue-600/30',
        fields: [
          { key: 'hotelId', label: 'VRBO Property ID', type: 'text', required: true, placeholder: 'e.g. VRBO-8812' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' },
          { key: 'advertiserId', label: 'Advertiser Account ID', type: 'text', required: true, placeholder: 'e.g. ADV-9910' }
        ]
      },
      {
        key: 'yatra',
        title: 'Yatra.com (India & Regional Portal)',
        category: 'Regional Leader',
        color: 'from-red-500/10 to-orange-500/10 border-red-500/30',
        fields: [
          { key: 'hotelId', label: 'Yatra Property ID', type: 'text', required: true, placeholder: 'e.g. YATRA-4491' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' },
          { key: 'syncB2B', label: 'Sync Corporate B2B Rates', type: 'boolean', default: true }
        ]
      },
      {
        key: 'cleartrip',
        title: 'ClearTrip (India & Middle East)',
        category: 'Regional Leader',
        color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
        fields: [
          { key: 'hotelId', label: 'ClearTrip Property ID', type: 'text', required: true, placeholder: 'e.g. CT-9912' },
          { key: 'accessToken', label: 'Connection Security Key / Password', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'hostelworld',
        title: 'Hostelworld (Backpackers & Hostels)',
        category: 'Hostels & Budget',
        color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30',
        fields: [
          { key: 'hotelId', label: 'Hostelworld Property ID', type: 'text', required: true, placeholder: 'e.g. HW-3321' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' },
          { key: 'pricingType', label: 'Rate Scheme', type: 'select', options: ['Standard (Per Bed/Room)', 'Non-Refundable Discount Scheme'], default: 'Standard (Per Bed/Room)' }
        ]
      },
      {
        key: 'hotelbeds',
        title: 'Hotelbeds (Global Wholesaler Network)',
        category: 'Wholesalers & B2B',
        color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'Hotelbeds Property ID', type: 'text', required: true, placeholder: 'e.g. HB-9021' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' },
          { key: 'contractName', label: 'Contract / Rate Code Name', type: 'text', required: true, placeholder: 'e.g. BAR_DIRECT' }
        ]
      },
      {
        key: 'webbeds',
        title: 'WebBeds / JacTravel (B2B Distribution)',
        category: 'Wholesalers & B2B',
        color: 'from-orange-500/10 to-red-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'WebBeds Property ID', type: 'text', required: true, placeholder: 'e.g. WEB-4421' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'traveloka',
        title: 'Traveloka (Southeast Asia Leader)',
        category: 'Regional Leader',
        color: 'from-sky-500/10 to-cyan-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'Traveloka Property ID', type: 'text', required: true, placeholder: 'e.g. TVL-5521' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' }
        ]
      },
      {
        key: 'despegar',
        title: 'Despegar / Decolar (Latin America Leader)',
        category: 'Regional Leader',
        color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'Despegar Property ID', type: 'text', required: true, placeholder: 'e.g. DESP-881' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'dida',
        title: 'DidaTravel (Global Wholesaler Network)',
        category: 'Wholesalers & B2B',
        color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'Dida Property ID', type: 'text', required: true, placeholder: 'e.g. DIDA-112' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' }
        ]
      },
      {
        key: 'hyperguest',
        title: 'HyperGuest (Direct B2B Marketplace Engine)',
        category: 'Wholesalers & B2B',
        color: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/30',
        fields: [
          { key: 'hotelId', label: 'HyperGuest Property ID', type: 'text', required: true, placeholder: 'e.g. HG-8841' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' }
        ]
      },
      {
        key: 'mrchub',
        title: 'Mr & Mrs Smith (Luxury Boutique Collection)',
        category: 'Luxury & Boutique',
        color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30',
        fields: [
          { key: 'hotelId', label: 'Mr & Mrs Smith Property ID', type: 'text', required: true, placeholder: 'e.g. MMS-901' },
          { key: 'accessToken', label: 'Connection Security Password', type: 'password', required: true, placeholder: 'Enter Security Password' }
        ]
      },
      {
        key: 'agoda_homes',
        title: 'Agoda Homes (Apartments & Villas)',
        category: 'Vacation Rentals',
        color: 'from-pink-500/10 to-rose-500/10 border-pink-500/30',
        fields: [
          { key: 'hotelId', label: 'Agoda Homes Property ID', type: 'text', required: true, placeholder: 'e.g. AGH-771' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'tiketi',
        title: 'Tiketi.com (Regional Online Travel Network)',
        category: 'Regional Leader',
        color: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30',
        fields: [
          { key: 'hotelId', label: 'Tiketi Property ID', type: 'text', required: true, placeholder: 'e.g. TIK-331' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'ostrovok',
        title: 'Ostrovok / Emerging Travel Group',
        category: 'European & Specialized',
        color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30',
        fields: [
          { key: 'hotelId', label: 'Ostrovok Hotel ID', type: 'text', required: true, placeholder: 'e.g. OST-4491' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'tui',
        title: 'TUI / TUI Musement (Global Holiday Network)',
        category: 'European & Specialized',
        color: 'from-red-500/10 to-blue-500/10 border-red-500/30',
        fields: [
          { key: 'hotelId', label: 'TUI Property / Hotel ID', type: 'text', required: true, placeholder: 'e.g. TUI-8812' },
          { key: 'accessToken', label: 'Connection Security Token', type: 'password', required: true, placeholder: 'Enter Security Token' }
        ]
      },
      {
        key: 'hrs',
        title: 'HRS - Hotel Reservation Service (Corporate & B2B)',
        category: 'European & Specialized',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'HRS Hotel ID', type: 'text', required: true, placeholder: 'e.g. HRS-9012' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'hotelspecials',
        title: 'HotelSpecials (Benelux & Europe)',
        category: 'European & Specialized',
        color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'HotelSpecials Property ID', type: 'text', required: true, placeholder: 'e.g. HS-1123' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'keytel',
        title: 'KeyTel / Hotusa Group',
        category: 'European & Specialized',
        color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'KeyTel Property ID', type: 'text', required: true, placeholder: 'e.g. KEY-5541' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'pegas',
        title: 'Pegas Touristik (CIS & Resort Network)',
        category: 'European & Specialized',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'Pegas Property ID', type: 'text', required: true, placeholder: 'e.g. PEG-3321' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'smyrooms',
        title: 'Smyrooms / Logitravel (European Wholesaler)',
        category: 'Wholesalers & B2B',
        color: 'from-purple-500/10 to-violet-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'Smyrooms Property ID', type: 'text', required: true, placeholder: 'e.g. SMY-7712' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'sunweb',
        title: 'Sunweb Group (European Holiday Packages)',
        category: 'European & Specialized',
        color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30',
        fields: [
          { key: 'hotelId', label: 'Sunweb Property ID', type: 'text', required: true, placeholder: 'e.g. SUN-9021' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'otsglobe',
        title: 'OTS Globe (Global Destination Management)',
        category: 'Wholesalers & B2B',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
        fields: [
          { key: 'hotelId', label: 'OTS Globe Property ID', type: 'text', required: true, placeholder: 'e.g. OTS-6651' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'roibos',
        title: 'Roibos (B2B Hotel Distribution Platform)',
        category: 'Wholesalers & B2B',
        color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30',
        fields: [
          { key: 'hotelId', label: 'Roibos Property ID', type: 'text', required: true, placeholder: 'e.g. ROI-8831' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'welcomebeds',
        title: 'Welcomebeds (Global Accommodation Network)',
        category: 'Wholesalers & B2B',
        color: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/30',
        fields: [
          { key: 'hotelId', label: 'Welcomebeds Property ID', type: 'text', required: true, placeholder: 'e.g. WB-2241' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'peakwork',
        title: 'Peakwork (Dynamic Holiday Packaging Engine)',
        category: 'European & Specialized',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/30',
        fields: [
          { key: 'hotelId', label: 'Peakwork Property ID', type: 'text', required: true, placeholder: 'e.g. PKW-901' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'jumio',
        title: 'Jumio Travel Network',
        category: 'European & Specialized',
        color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30',
        fields: [
          { key: 'hotelId', label: 'Jumio Property ID', type: 'text', required: true, placeholder: 'e.g. JUM-114' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'wakanow',
        title: 'Wakanow (Africa & Regional Travel Leader)',
        category: 'Regional Leader',
        color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'Wakanow Property ID', type: 'text', required: true, placeholder: 'e.g. WAK-772' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'hotelston',
        title: 'Hotelston (B2B Accommodation Wholesaler)',
        category: 'Wholesalers & B2B',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'Hotelston Property ID', type: 'text', required: true, placeholder: 'e.g. HST-993' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'stuba',
        title: 'Stuba (Global Curated B2B Accommodation)',
        category: 'Wholesalers & B2B',
        color: 'from-rose-500/10 to-red-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'Stuba Property ID', type: 'text', required: true, placeholder: 'e.g. STB-441' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'intui',
        title: 'Intui Travel & Transfers Network',
        category: 'European & Specialized',
        color: 'from-teal-500/10 to-green-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'Intui Property ID', type: 'text', required: true, placeholder: 'e.g. INT-882' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'goglobal',
        title: 'GoGlobal Travel (B2B Bedbank Network)',
        category: 'Wholesalers & B2B',
        color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'GoGlobal Property ID', type: 'text', required: true, placeholder: 'e.g. GGT-331' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'travco',
        title: 'Travco (International B2B Hotel Wholesaler)',
        category: 'Wholesalers & B2B',
        color: 'from-sky-500/10 to-indigo-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'Travco Property ID', type: 'text', required: true, placeholder: 'e.g. TRV-661' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'bedsline',
        title: 'Bedsline (Global Hotel Reservation Network)',
        category: 'Wholesalers & B2B',
        color: 'from-amber-500/10 to-red-500/10 border-amber-500/30',
        fields: [
          { key: 'hotelId', label: 'Bedsline Property ID', type: 'text', required: true, placeholder: 'e.g. BDL-118' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'tripadvisor',
        title: 'Tripadvisor Instant Book & Plus',
        category: 'Metasearch & Direct',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/30',
        fields: [
          { key: 'hotelId', label: 'Tripadvisor Property ID', type: 'text', required: true, placeholder: 'e.g. TA-8821' },
          { key: 'accessToken', label: 'Instant Book Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'trivago',
        title: 'Trivago Express Booking Network',
        category: 'Metasearch & Direct',
        color: 'from-blue-500/10 to-red-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'Trivago Hotel ID', type: 'text', required: true, placeholder: 'e.g. TRV-9012' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'kayak',
        title: 'Kayak Direct Booking Engine',
        category: 'Metasearch & Direct',
        color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'Kayak Property ID', type: 'text', required: true, placeholder: 'e.g. KYK-1142' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'skyscanner',
        title: 'SkyScanner Hotels & Resorts Portal',
        category: 'Metasearch & Direct',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'SkyScanner Property ID', type: 'text', required: true, placeholder: 'e.g. SKY-5531' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'hoteltonight',
        title: 'HotelTonight (Last-Minute Boutique Deals)',
        category: 'Luxury & Boutique',
        color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'HotelTonight Property ID', type: 'text', required: true, placeholder: 'e.g. HT-7712' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'plumguide',
        title: 'Plum Guide (Curated Luxury Vacation Rentals)',
        category: 'Luxury & Boutique',
        color: 'from-stone-500/10 to-amber-500/10 border-stone-500/30',
        fields: [
          { key: 'hotelId', label: 'Plum Guide Property ID', type: 'text', required: true, placeholder: 'e.g. PLUM-882' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'sonder',
        title: 'Sonder Apartment & Hospitality Network',
        category: 'Vacation Rentals',
        color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'Sonder Property ID', type: 'text', required: true, placeholder: 'e.g. SND-331' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'marriott_homes',
        title: 'Marriott Bonvoy Homes & Villas',
        category: 'Vacation Rentals',
        color: 'from-rose-500/10 to-red-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'Marriott Bonvoy Property ID', type: 'text', required: true, placeholder: 'e.g. MB-9011' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'accor',
        title: 'Accor Allaways Partner Distribution Network',
        category: 'Global Leader',
        color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30',
        fields: [
          { key: 'hotelId', label: 'Accor Partner ID', type: 'text', required: true, placeholder: 'e.g. ACC-441' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'radisson',
        title: 'Radisson Rewards Partner Network',
        category: 'Global Leader',
        color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
        fields: [
          { key: 'hotelId', label: 'Radisson Partner ID', type: 'text', required: true, placeholder: 'e.g. RAD-221' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'choice',
        title: 'Choice Hotels Global Distribution System',
        category: 'Global Leader',
        color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30',
        fields: [
          { key: 'hotelId', label: 'Choice Hotels Property ID', type: 'text', required: true, placeholder: 'e.g. CH-889' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'wyndham',
        title: 'Wyndham Hotels & Resorts Network',
        category: 'Global Leader',
        color: 'from-blue-600/10 to-indigo-600/10 border-blue-600/30',
        fields: [
          { key: 'hotelId', label: 'Wyndham Property ID', type: 'text', required: true, placeholder: 'e.g. WYN-771' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'bestwestern',
        title: 'Best Western Partner Distribution Portal',
        category: 'Global Leader',
        color: 'from-red-600/10 to-rose-600/10 border-red-600/30',
        fields: [
          { key: 'hotelId', label: 'Best Western Property ID', type: 'text', required: true, placeholder: 'e.g. BW-119' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'rakuten',
        title: 'Rakuten Travel (Japan & East Asia Leader)',
        category: 'Regional Leader',
        color: 'from-red-500/10 to-pink-500/10 border-red-500/30',
        fields: [
          { key: 'hotelId', label: 'Rakuten Property ID', type: 'text', required: true, placeholder: 'e.g. RAK-882' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'jalan',
        title: 'Jalan.net (Japan Domestic Travel Network)',
        category: 'Regional Leader',
        color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'Jalan Property ID', type: 'text', required: true, placeholder: 'e.g. JAL-441' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'ikyu',
        title: 'Ikyu.com (Japan Luxury Boutique Collection)',
        category: 'Luxury & Boutique',
        color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30',
        fields: [
          { key: 'hotelId', label: 'Ikyu Property ID', type: 'text', required: true, placeholder: 'e.g. IKY-901' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'fliggy',
        title: 'Fliggy / Alibaba Travel (China & APAC Leader)',
        category: 'Regional Leader',
        color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30',
        fields: [
          { key: 'hotelId', label: 'Fliggy Property ID', type: 'text', required: true, placeholder: 'e.g. FLG-331' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'meituan',
        title: 'Meituan Hotel Network (China Domestic Leader)',
        category: 'Regional Leader',
        color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30',
        fields: [
          { key: 'hotelId', label: 'Meituan Property ID', type: 'text', required: true, placeholder: 'e.g. MEI-662' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'qunar',
        title: 'Qunar / Elong Travel Platform (APAC Leader)',
        category: 'Regional Leader',
        color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'Qunar Property ID', type: 'text', required: true, placeholder: 'e.g. QUN-771' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'mmt_mybiz',
        title: 'MakeMyTrip MyBiz (Corporate & B2B Travel)',
        category: 'Wholesalers & B2B',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'MyBiz Corporate ID', type: 'text', required: true, placeholder: 'e.g. MYBIZ-881' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'happyeasygo',
        title: 'HappyEasyGo (India & APAC Online Portal)',
        category: 'Regional Leader',
        color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'HappyEasyGo Property ID', type: 'text', required: true, placeholder: 'e.g. HEG-221' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'ixigo',
        title: 'Ixigo Hotels & Holiday Network (India)',
        category: 'Regional Leader',
        color: 'from-rose-500/10 to-red-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'Ixigo Property ID', type: 'text', required: true, placeholder: 'e.g. IXI-554' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'viacom',
        title: 'Via.com / EbixCash (India & Middle East B2B)',
        category: 'Wholesalers & B2B',
        color: 'from-sky-500/10 to-cyan-500/10 border-sky-500/30',
        fields: [
          { key: 'hotelId', label: 'Via.com Property ID', type: 'text', required: true, placeholder: 'e.g. VIA-883' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'thomascook',
        title: 'Thomas Cook India & Global Holidays Network',
        category: 'Wholesalers & B2B',
        color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30',
        fields: [
          { key: 'hotelId', label: 'Thomas Cook Property ID', type: 'text', required: true, placeholder: 'e.g. TC-991' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'sotc',
        title: 'SOTC Travel Network (Holiday Packages & Tours)',
        category: 'Wholesalers & B2B',
        color: 'from-red-500/10 to-orange-500/10 border-red-500/30',
        fields: [
          { key: 'hotelId', label: 'SOTC Property ID', type: 'text', required: true, placeholder: 'e.g. SOTC-332' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'coxandkings',
        title: 'Cox & Kings Holidays & Resorts Network',
        category: 'Wholesalers & B2B',
        color: 'from-stone-500/10 to-amber-500/10 border-stone-500/30',
        fields: [
          { key: 'hotelId', label: 'Cox & Kings Property ID', type: 'text', required: true, placeholder: 'e.g. CK-118' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'akbartravels',
        title: 'Akbar Travels (Middle East & India B2B Network)',
        category: 'Wholesalers & B2B',
        color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30',
        fields: [
          { key: 'hotelId', label: 'Akbar Travels Property ID', type: 'text', required: true, placeholder: 'e.g. AKB-662' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'riyatravel',
        title: 'Riya Travel & Tours (B2B Global Distribution)',
        category: 'Wholesalers & B2B',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
        fields: [
          { key: 'hotelId', label: 'Riya Travel Property ID', type: 'text', required: true, placeholder: 'e.g. RIYA-771' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'tbo',
        title: 'TBO Holidays (Travel Boutique Online B2B Leader)',
        category: 'Wholesalers & B2B',
        color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
        fields: [
          { key: 'hotelId', label: 'TBO Property ID', type: 'text', required: true, placeholder: 'e.g. TBO-901' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'tourico',
        title: 'Tourico Holidays (International Wholesaler)',
        category: 'Wholesalers & B2B',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
        fields: [
          { key: 'hotelId', label: 'Tourico Property ID', type: 'text', required: true, placeholder: 'e.g. TOU-441' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'gta',
        title: 'GTA (Gullivers Travel Associates Bedbank)',
        category: 'Wholesalers & B2B',
        color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30',
        fields: [
          { key: 'hotelId', label: 'GTA Property ID', type: 'text', required: true, placeholder: 'e.g. GTA-882' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'alliedtpro',
        title: 'AlliedTPro Destination Management Network',
        category: 'Wholesalers & B2B',
        color: 'from-teal-500/10 to-green-500/10 border-teal-500/30',
        fields: [
          { key: 'hotelId', label: 'AlliedTPro Property ID', type: 'text', required: true, placeholder: 'e.g. ATP-331' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'amex_gbt',
        title: 'American Express Global Business Travel (Corporate)',
        category: 'Wholesalers & B2B',
        color: 'from-blue-600/10 to-sky-600/10 border-blue-600/30',
        fields: [
          { key: 'hotelId', label: 'Amex GBT Property ID', type: 'text', required: true, placeholder: 'e.g. AMEX-551' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'bcd_travel',
        title: 'BCD Travel Corporate Solutions (Global Business)',
        category: 'Wholesalers & B2B',
        color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30',
        fields: [
          { key: 'hotelId', label: 'BCD Travel Property ID', type: 'text', required: true, placeholder: 'e.g. BCD-881' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'cwt',
        title: 'CWT (Carlson Wagonlit Travel Corporate Network)',
        category: 'Wholesalers & B2B',
        color: 'from-orange-500/10 to-red-500/10 border-orange-500/30',
        fields: [
          { key: 'hotelId', label: 'CWT Property ID', type: 'text', required: true, placeholder: 'e.g. CWT-119' },
          { key: 'accessToken', label: 'Connection Security Key', type: 'password', required: true, placeholder: 'Enter Security Key' }
        ]
      },
      {
        key: 'custom_ota',
        title: 'Other Supported Travel Portal (Custom Connect)',

        category: 'Generic / Custom',
        color: 'from-primary/10 to-blue-500/10 border-primary/30',
        fields: [
          { key: 'hotelId', label: 'Property / Hotel ID (from your portal settings)', type: 'text', required: true, placeholder: 'e.g. 109283' },
          { key: 'accessToken', label: 'Security / Connection Key', type: 'password', required: true, placeholder: 'Enter your Security Key' },
          {
            key: 'channelType',
            label: 'Select Travel Portal Name',
            type: 'select',
            required: true,
            options: [
              'Ostrovok / Emerging Travel (`ostrovok`)',
              'TUI / TUI Musement (`tui`)',
              'HRS - Hotel Reservation Service (`hrs`)',
              'HotelSpecials (`hotelspecials`)',
              'KeyTel / Hotusa (`keytel`)',
              'Pegas Touristik (`pegas`)',
              'Smyrooms / Logitravel (`smyrooms`)',
              'Sunweb Group (`sunweb`)',
              'OTS Globe (`otsglobe`)',
              'Roibos (`roibos`)',
              'Welcomebeds (`welcomebeds`)',
              'Peakwork (`peakwork`)',
              'Jumio (`jumio`)',
              'Wakanow (`wakanow`)',
              'Hotelston (`hotelston`)',
              'Stuba (`stuba`)',
              'Intui Travel (`intui`)',
              'GoGlobal Travel (`goglobal`)',
              'Travco (`travco`)',
              'Bedsline (`bedsline`)',
              'Other / Custom Travel Portal Code'
            ],
            default: 'Ostrovok / Emerging Travel (`ostrovok`)'
          }
        ]
      }
    ];
  }

  /**
   * Programmatically enable Channel Sync for any property in the PMS without leaving the dashboard!
   * Automatically creates the property and room types in the remote Channel Manager API (Channex/STAAH) and stores the IDs.
   */
  async enableChannelSyncForProperty(propertyId: string, channelName = 'CHANNEX') {
    const adapter = this.getAdapter(channelName);

    // 1. Check if mapping already exists
    let existingMapping = await this.prisma.channelPropertyMapping.findUnique({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      include: { roomMappings: true },
    });

    // 2. Fetch full property with room types
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          include: { rooms: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found.`);
    }

    // 3. Create remote property if adapter supports it and we don't have an external ID yet
    let externalPropertyId = existingMapping?.externalPropertyId;
    if (!externalPropertyId) {
      if (!adapter.createRemoteProperty) {
        throw new BadRequestException(`Adapter '${channelName}' does not support automatic programmatic property creation.`);
      }
      this.logger.log(`Calling auto-create on adapter '${channelName}' for property '${property.name}'`);
      const remoteProp = await adapter.createRemoteProperty(property);
      externalPropertyId = remoteProp.externalPropertyId;
    }

    // 4. Save property mapping
    const propertyMapping = await this.prisma.channelPropertyMapping.upsert({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      update: { externalPropertyId, isActive: true },
      create: {
        propertyId,
        channelName: channelName.toUpperCase(),
        externalPropertyId,
        apiKey: process.env.CHANNEX_USER_API_KEY,
        isActive: true,
      },
    });

    // 5. Create remote room types if adapter supports it
    if (adapter.createRemoteRoomType && property.roomTypes) {
      for (const roomType of property.roomTypes) {
        const existingRoomMap = await this.prisma.channelRoomTypeMapping.findUnique({
          where: {
            propertyMappingId_roomTypeId: { propertyMappingId: propertyMapping.id, roomTypeId: roomType.id },
          },
        });

        if (!existingRoomMap) {
          const remoteRoom = await adapter.createRemoteRoomType(externalPropertyId, roomType);
          await this.prisma.channelRoomTypeMapping.create({
            data: {
              propertyMappingId: propertyMapping.id,
              roomTypeId: roomType.id,
              externalRoomTypeId: remoteRoom.externalRoomTypeId,
              externalRatePlanId: remoteRoom.externalRatePlanId || null,
            },
          });
        }
      }
    }

    // 6. Automatically pre-seed primary OTA sources into BookingSources so they appear immediately right now upon enabling Channel Sync!
    const defaultOtaSources = [
      { name: 'MakeMyTrip', description: 'Automated 2-Way OTA Channel Sync via MakeMyTrip', commission: 18 },
      { name: 'Booking.com', description: 'Automated 2-Way OTA Channel Sync via Booking.com', commission: 15 },
      { name: 'Agoda', description: 'Automated 2-Way OTA Channel Sync via Agoda', commission: 18 },
      { name: 'Airbnb', description: 'Automated 2-Way OTA Channel Sync via Airbnb', commission: 15 },
    ];
    for (const ota of defaultOtaSources) {
      const existingOta = await this.prisma.bookingSource.findFirst({
        where: { name: { equals: ota.name, mode: 'insensitive' } },
      });
      if (!existingOta) {
        await this.prisma.bookingSource.create({
          data: { name: ota.name, description: ota.description, commission: ota.commission, isActive: true },
        });
      }
    }

    this.logger.log(`Successfully enabled 100% automated channel sync for Property [${property.name}]! Triggering initial ARI push...`);
    await this.pushAriForProperty(propertyId, 60);

    const webhookUrl = process.env.CHANNEX_WEBHOOK_URL?.trim() || (process.env.APP_PUBLIC_URL?.trim() ? `${process.env.APP_PUBLIC_URL.trim()}/api/channels/webhook/CHANNEX` : null);
    if (webhookUrl && adapter.registerWebhook && propertyMapping.externalPropertyId) {
      await adapter.registerWebhook(propertyMapping.externalPropertyId, webhookUrl);
    } else {
      this.logger.log(`[Webhook Setup] Note: CHANNEX_WEBHOOK_URL or APP_PUBLIC_URL is not set in .env. To receive live reservation webhooks locally on localhost, use ngrok and point your Channex Webhook to: https://YOUR_NGROK_DOMAIN/api/channels/webhook/CHANNEX`);
    }

    return this.getPropertyMappings(propertyId);
  }

  /**
   * Disable/Pause channel synchronization for a property
   */
  async disableChannelSyncForProperty(propertyId: string, channelName = 'CHANNEX') {
    const updated = await this.prisma.channelPropertyMapping.updateMany({
      where: { propertyId, channelName: channelName.toUpperCase() },
      data: { isActive: false },
    });
    this.logger.log(`Disabled channel sync (${channelName}) for property ${propertyId}`);
    return { success: true, count: updated.count };
  }

  /**
   * Calculate and push full Availability & Inventory for a property across all active mapped channels
   */
  async pushAriForProperty(propertyId: string, daysToSync = 60): Promise<void> {
    const mappings = await this.prisma.channelPropertyMapping.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomMappings: {
          include: { roomType: true },
        },
      },
    });

    if (mappings.length === 0) {
      this.logger.debug(`No active channel mappings found for Property [${propertyId}]`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const mapping of mappings) {
      const adapter = this.getAdapter(mapping.channelName);
      const inventoryUpdates: InventoryUpdateDto[] = [];
      const rateUpdates: RateUpdateDto[] = [];

      let currentRoomMappings = mapping.roomMappings;
      if (currentRoomMappings.length === 0 && adapter.createRemoteRoomType) {
        this.logger.log(`[Self-Healing] No room mappings found for property ${propertyId} on ${mapping.channelName}. Auto-creating missing remote room types...`);
        const fullProp = await this.prisma.property.findUnique({
          where: { id: propertyId },
          include: { roomTypes: { include: { rooms: true } } },
        });
        if (fullProp?.roomTypes) {
          for (const roomType of fullProp.roomTypes) {
            const existingRmMap = await this.prisma.channelRoomTypeMapping.findUnique({
              where: { propertyMappingId_roomTypeId: { propertyMappingId: mapping.id, roomTypeId: roomType.id } },
            });
            if (!existingRmMap) {
              const remoteRm = await adapter.createRemoteRoomType(mapping.externalPropertyId, roomType);
              await this.prisma.channelRoomTypeMapping.create({
                data: {
                  propertyMappingId: mapping.id,
                  roomTypeId: roomType.id,
                  externalRoomTypeId: remoteRm.externalRoomTypeId,
                  externalRatePlanId: remoteRm.externalRatePlanId || null,
                },
              });
            }
          }
        }
        currentRoomMappings = await this.prisma.channelRoomTypeMapping.findMany({
          where: { propertyMappingId: mapping.id },
          include: { roomType: true },
        });
      }

      for (const roomMapping of currentRoomMappings) {
        // Calculate daily inventory for each date
        for (let i = 0; i < daysToSync; i++) {
          const checkIn = addDays(today, i);
          const checkOut = addDays(checkIn, 1);
          const dateStr = format(checkIn, 'yyyy-MM-dd');

          // Count available physical rooms for this roomTypeId
          const availableRoomsList = await this.availabilityService.getAvailableRooms(
            roomMapping.roomTypeId,
            checkIn,
            checkOut,
          );

          inventoryUpdates.push({
            date: dateStr,
            roomTypeId: roomMapping.roomTypeId,
            externalRoomTypeId: roomMapping.externalRoomTypeId,
            availableRooms: availableRoomsList.length,
          });

          // Push rate if base price is available
          if (roomMapping.roomType?.basePrice) {
            rateUpdates.push({
              date: dateStr,
              roomTypeId: roomMapping.roomTypeId,
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              price: Number(roomMapping.roomType.basePrice),
            });
          }
        }
      }

      // Push to adapter
      await adapter.pushInventory(mapping, inventoryUpdates);
      if (rateUpdates.length > 0) {
        await adapter.pushRates(mapping, rateUpdates);
      }
    }
  }

  /**
   * Push batched delta updates (Single/Multi date rates, inventory, min stay, stop sell, restrictions) directly to Channex.
   * Required for Channex Certification Tests 2, 3, 4, 5, 6, 7, 8, 9, 10 without doing a full timer sync.
   */
  async pushDeltaAri(
    propertyId: string,
    inventoryUpdates: InventoryUpdateDto[] = [],
    rateUpdates: RateUpdateDto[] = [],
  ): Promise<boolean> {
    const mappings = await this.prisma.channelPropertyMapping.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomMappings: { include: { roomType: true } },
      },
    });

    if (mappings.length === 0) {
      this.logger.debug(`No active channel mappings found for delta push on Property [${propertyId}]`);
      return false;
    }

    let success = true;
    for (const mapping of mappings) {
      const adapter = this.getAdapter(mapping.channelName);
      if (inventoryUpdates && inventoryUpdates.length > 0) {
        const invOk = await adapter.pushInventory(mapping, inventoryUpdates);
        if (!invOk) success = false;
      }
      if (rateUpdates && rateUpdates.length > 0) {
        const rateOk = await adapter.pushRates(mapping, rateUpdates);
        if (!rateOk) success = false;
      }
    }
    return success;
  }

  /**
   * Handle incoming reservation webhook from an OTA / Channel Manager (e.g. Channex)
   */
  async handleIncomingReservation(channelName: string, payload: any, headers?: Record<string, any>) {
    const adapter = this.getAdapter(channelName);
    const res = await adapter.parseIncomingReservation(payload, headers);

    this.logger.log(`[Webhook] Received reservation ${res.externalBookingId} (${res.status}) from ${channelName}`);

    // Check if booking already exists
    const existingBooking = await this.prisma.booking.findUnique({
      where: { externalBookingId: res.externalBookingId },
      include: { room: true },
    });

    if (existingBooking) {
      if (res.status === 'CANCELLED' && existingBooking.status !== 'CANCELLED') {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        this.logger.log(`Cancelled existing external booking ${res.externalBookingId}`);
        // Push new available inventory outward across all channels
        if (existingBooking.propertyId) {
          await this.pushAriForProperty(existingBooking.propertyId, 60);
        }
      } else if (res.status === 'MODIFIED' || (res.checkInDate && res.checkOutDate && (res.checkInDate.getTime() !== existingBooking.checkInDate.getTime() || res.checkOutDate.getTime() !== existingBooking.checkOutDate.getTime() || res.totalAmount !== Number(existingBooking.totalAmount)))) {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInDate: res.checkInDate,
            checkOutDate: res.checkOutDate,
            totalAmount: res.totalAmount,
            status: 'CONFIRMED',
          },
        });
        this.logger.log(`Revised existing external booking ${res.externalBookingId} with new stay dates/amounts`);
        if (existingBooking.propertyId) {
          await this.pushAriForProperty(existingBooking.propertyId, 60);
        }
      }
      return { success: true, action: 'UPDATED', bookingNumber: existingBooking.bookingNumber };
    }

    if (res.status === 'CANCELLED') {
      return { success: true, action: 'IGNORED_ALREADY_CANCELLED' };
    }

    // Find the internal room mapping
    const roomMapping = await this.prisma.channelRoomTypeMapping.findFirst({
      where: {
        externalRoomTypeId: res.externalRoomTypeId,
        propertyMapping: {
          externalPropertyId: res.externalPropertyId,
          channelName: channelName.toUpperCase(),
        },
      },
      include: {
        roomType: true,
        propertyMapping: true,
      },
    });

    if (!roomMapping) {
      throw new NotFoundException(
        `No internal RoomType mapped for Channel [${channelName}], externalPropertyId [${res.externalPropertyId}], externalRoomTypeId [${res.externalRoomTypeId}]`,
      );
    }

    const propertyId = roomMapping.propertyMapping.propertyId;
    const roomTypeId = roomMapping.roomTypeId;

    // Find an available physical Room inside this RoomType
    const availableRooms = await this.availabilityService.getAvailableRooms(
      roomTypeId,
      res.checkInDate,
      res.checkOutDate,
    );

    if (availableRooms.length === 0) {
      this.logger.warn(
        `[OVERBOOKING WARNING] External reservation ${res.externalBookingId} arrived for ${roomMapping.roomType.name}, but 0 physical rooms available!`,
      );
    }

    // Assign first available room or fallback to any room in that type to prevent losing record
    let assignedRoom = availableRooms[0];
    if (!assignedRoom) {
      assignedRoom = await this.prisma.room.findFirst({
        where: { roomTypeId, propertyId },
      });
    }

    if (!assignedRoom) {
      throw new BadRequestException(
        `SETUP_REQUIRED: No physical room units configured for Room Type "${roomMapping.roomType?.name || roomTypeId}". Please go to Rooms Management and create at least 1 physical room first.`,
      );
    }

    // Find or create OTA User/Guest account (check both email and phone to prevent unique constraint errors)
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: res.guest.email || `guest.${res.externalBookingId}@ota.channel` },
          ...(res.guest.phone ? [{ phone: res.guest.phone }] : []),
        ],
      },
    });

    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
            firstName: res.guest.firstName,
            lastName: res.guest.lastName,
            phone: res.guest.phone || undefined,
          },
        });
      } catch (userErr: any) {
        if (userErr?.code === 'P2002' || userErr?.message?.includes('Unique constraint')) {
          this.logger.warn(`User creation collision during OTA import, linking to existing guest or fallback.`);
          if (res.guest.phone) {
            user = await this.prisma.user.findFirst({ where: { phone: res.guest.phone } });
          }
          if (!user) {
            user = await this.prisma.user.create({
              data: {
                email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
                firstName: res.guest.firstName,
                lastName: res.guest.lastName,
              },
            });
          }
        } else {
          throw userErr;
        }
      }
    }

    // Find matching exact OTA BookingSource (e.g. MakeMyTrip, Booking.com) or create it automatically
    const targetSourceName = res.sourceName || channelName;
    let bookingSource = await this.prisma.bookingSource.findFirst({
      where: { name: { equals: targetSourceName, mode: 'insensitive' } },
    });
    if (!bookingSource) {
      bookingSource = await this.prisma.bookingSource.create({
        data: { name: targetSourceName, description: `Automated OTA synchronization via ${targetSourceName}` },
      });
    }

    // Generate internal booking number
    const bookingNumber = `CM-${channelName.slice(0, 3)}-${Date.now()}`;

    // Create the booking in atomic transaction
    const newBooking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          bookingNumber,
          checkInDate: res.checkInDate,
          checkOutDate: res.checkOutDate,
          numberOfNights: res.numberOfNights,
          adultsCount: res.adultsCount,
          childrenCount: res.childrenCount,
          baseAmount: res.totalAmount,
          totalAmount: res.totalAmount,
          status: 'CONFIRMED',
          specialRequests: res.specialRequests,
          roomId: assignedRoom.id,
          roomTypeId,
          userId: user!.id,
          bookingSourceId: bookingSource?.id,
          propertyId,
          externalBookingId: res.externalBookingId,
          channelName: channelName.toUpperCase(),
          confirmedAt: new Date(),
          bookingCurrency: res.currency || 'INR',
          paymentStatus: 'FULL',
          paymentOption: 'FULL',
        },
      });

      // Create BookingRoom link
      await tx.bookingRoom.create({
        data: {
          bookingId: b.id,
          roomId: assignedRoom.id,
        },
      });

      // Create BookingGuest entry
      await tx.bookingGuest.create({
        data: {
          bookingId: b.id,
          firstName: res.guest.firstName,
          lastName: res.guest.lastName || '',
          email: res.guest.email,
          phone: res.guest.phone,
        },
      });

      return b;
    });

    this.logger.log(`Created internal booking #${newBooking.bookingNumber} for physical room ${assignedRoom.roomNumber}`);

    // Acknowledge back to channel
    await adapter.acknowledgeReservation(roomMapping.propertyMapping, res.externalBookingId, newBooking.bookingNumber);

    // Push updated inventory outward to block all other OTAs instantly
    await this.pushAriForProperty(propertyId, 60);

    return { success: true, action: 'CREATED', bookingNumber: newBooking.bookingNumber };
  }

  /**
   * CRUD Mappings
   */
  async getPropertyMappings(propertyId: string) {
    return this.prisma.channelPropertyMapping.findMany({
      where: { propertyId },
      include: {
        roomMappings: {
          include: { roomType: true },
        },
      },
    });
  }

  async savePropertyMapping(propertyId: string, channelName: string, externalPropertyId: string, apiKey?: string) {
    return this.prisma.channelPropertyMapping.upsert({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      update: { externalPropertyId, apiKey, isActive: true },
      create: { propertyId, channelName: channelName.toUpperCase(), externalPropertyId, apiKey, isActive: true },
    });
  }

  async saveRoomMapping(propertyMappingId: string, roomTypeId: string, externalRoomTypeId: string, externalRatePlanId?: string) {
    return this.prisma.channelRoomTypeMapping.upsert({
      where: {
        propertyMappingId_roomTypeId: { propertyMappingId, roomTypeId },
      },
      update: { externalRoomTypeId, externalRatePlanId },
      create: { propertyMappingId, roomTypeId, externalRoomTypeId, externalRatePlanId },
    });
  }

  /**
   * Simulate an incoming OTA reservation (e.g. MakeMyTrip, Booking.com) for staging & demo testing
   */
  async simulateIncomingOtaBooking(propertyId: string, otaName = 'MakeMyTrip') {
    const propertyMapping = await this.prisma.channelPropertyMapping.findFirst({
      where: { propertyId, isActive: true },
      include: { roomMappings: { include: { roomType: true } } },
    });

    if (!propertyMapping || !propertyMapping.roomMappings.length) {
      throw new BadRequestException(`Please enable 2-Way Channel Sync first so room types are mapped.`);
    }

    let roomMapping = propertyMapping.roomMappings[0];
    for (const rm of propertyMapping.roomMappings) {
      const count = await this.prisma.room.count({ where: { roomTypeId: rm.roomTypeId, propertyId } });
      if (count > 0) {
        roomMapping = rm;
        break;
      }
    }

    const roomCount = await this.prisma.room.count({ where: { roomTypeId: roomMapping.roomTypeId, propertyId } });
    if (roomCount === 0) {
      throw new BadRequestException(
        `SETUP_REQUIRED: No physical room units exist for Room Type "${roomMapping.roomType?.name || 'Assigned Room Type'}". Please go to your Rooms Management tab and create at least 1 physical room first.`
      );
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 2);
    const checkOutDate = new Date();
    checkOutDate.setDate(checkOutDate.getDate() + 4);

    const simulatedBookingId = `${otaName.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const simulatedPayload = {
      event: 'booking_new',
      data: {
        id: simulatedBookingId,
        property_id: propertyMapping.externalPropertyId || 'SIMULATED_PROP',
        channel_name: otaName,
        status: 'new',
        rooms: [
          {
            room_type_id: roomMapping.externalRoomTypeId || 'SIMULATED_ROOM_TYPE',
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0],
            amount: 14500,
          },
        ],
        customer: {
          firstName: `${otaName} Guest`,
          lastName: `(Simulated Reservation)`,
          email: `guest.${simulatedBookingId.toLowerCase()}@${otaName.toLowerCase().replace(/\./g, '')}.test`,
          phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
        },
      },
    };

    return this.handleIncomingReservation(propertyMapping.channelName || 'CHANNEX', simulatedPayload);
  }
}
