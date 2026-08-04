import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Channex Webhook Duplicate Booking Protection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let property: any;
  let roomType: any;
  let room: any;
  let propertyMapping: any;
  let roomMapping: any;

  const externalBookingId = `ch-test-duplicate-${Date.now()}`;
  const externalPropertyId = `ext-prop-${Date.now()}`;
  const externalRoomTypeId = `ext-room-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Create a dummy owner
    let owner = await prisma.user.findFirst({
      where: { email: 'owner@test.com' },
    });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          email: 'owner@test.com',
          password: 'password',
          firstName: 'Owner',
          lastName: 'Test',
        },
      });
    }

    // 2. Create Property
    property = await prisma.property.create({
      data: {
        name: 'Test Property - Channex Duplicates',
        slug: `test-property-channex-duplicates-${Date.now()}`,
        description: 'Channex Integration Test Property',
        ownerId: owner.id,
        address: '123 Test Street',
        city: 'Goa',
        state: 'Goa',
        country: 'India',
        pincode: '403001',
        type: 'RESORT',
        email: 'channex-test@loudimc.com',
        phone: '9876543210',
      },
    });

    // 3. Create Room Type
    roomType = await prisma.roomType.create({
      data: {
        name: 'Deluxe Suite',
        propertyId: property.id,
        basePrice: 5000,
        extraAdultPrice: 1000,
        extraChildPrice: 500,
        maxAdults: 2,
        maxChildren: 1,
      },
    });

    // 4. Create Physical Room
    room = await prisma.room.create({
      data: {
        roomNumber: `CH-301`,
        propertyId: property.id,
        roomTypeId: roomType.id,
        status: 'AVAILABLE',
      },
    });

    // 5. Create Channel Property Mapping
    propertyMapping = await prisma.channelPropertyMapping.create({
      data: {
        propertyId: property.id,
        channelName: 'CHANNEX',
        externalPropertyId,
        isActive: true,
      },
    });

    // 6. Create Channel Room Type Mapping
    roomMapping = await prisma.channelRoomTypeMapping.create({
      data: {
        propertyMappingId: propertyMapping.id,
        roomTypeId: roomType.id,
        externalRoomTypeId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup records in reverse order
    await prisma.booking.deleteMany({
      where: { externalBookingId },
    });
    await prisma.channelRoomTypeMapping.deleteMany({
      where: { propertyMappingId: propertyMapping.id },
    });
    await prisma.channelPropertyMapping.deleteMany({
      where: { id: propertyMapping.id },
    });
    await prisma.room.deleteMany({
      where: { id: room.id },
    });
    await prisma.roomType.deleteMany({
      where: { id: roomType.id },
    });
    await prisma.property.deleteMany({
      where: { id: property.id },
    });

    await app.close();
  });

  it('should successfully create a new booking on the first webhook call', async () => {
    const payload = {
      event: 'booking_new',
      data: {
        id: externalBookingId,
        property_id: externalPropertyId,
        status: 'new',
        channel_name: 'Booking CRS',
        total_amount: 20000,
        rooms: [
          {
            room_type_id: externalRoomTypeId,
            checkin_date: '2026-11-21',
            checkout_date: '2026-11-25',
            amount: 20000,
            occupancy: {
              adults: 2,
              children: 0,
            },
          },
        ],
        customer: {
          name: 'Duplicate',
          surname: 'Tester',
          mail: 'tester.dup@ota.channel',
          phone: '+919999999999',
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/channels/webhook/CHANNEX')
      .send(payload)
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.bookingNumber).toBeDefined();
    expect(response.body.success).toBe(true);

    // Verify booking in database
    const booking = await prisma.booking.findUnique({
      where: { externalBookingId },
    });
    expect(booking).toBeDefined();
    expect(booking?.status).toBe('CONFIRMED');
    expect(Number(booking?.totalAmount)).toBe(20000);
  });

  it('should not create a duplicate booking on receiving the same webhook payload a second time', async () => {
    const payload = {
      event: 'booking_new',
      data: {
        id: externalBookingId,
        property_id: externalPropertyId,
        status: 'new',
        channel_name: 'Booking CRS',
        total_amount: 20000,
        rooms: [
          {
            room_type_id: externalRoomTypeId,
            checkin_date: '2026-11-21',
            checkout_date: '2026-11-25',
            amount: 20000,
            occupancy: {
              adults: 2,
              children: 0,
            },
          },
        ],
        customer: {
          name: 'Duplicate',
          surname: 'Tester',
          mail: 'tester.dup@ota.channel',
          phone: '+919999999999',
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/channels/webhook/CHANNEX')
      .send(payload)
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('UPDATED');

    // Count bookings with externalBookingId
    const count = await prisma.booking.count({
      where: { externalBookingId },
    });
    // Ensure only 1 exists
    expect(count).toBe(1);
  });
});
