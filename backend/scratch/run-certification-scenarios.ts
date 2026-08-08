import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';

async function main() {
  console.log('Fetching test property mapping from database...');
  const property = await prisma.property.findFirst({
    where: { name: 'Test Property - RouteGuide' },
  });

  if (!property) {
    throw new Error('Property "Test Property - RouteGuide" not found. Please verify it was created.');
  }

  const mapping = await prisma.channelPropertyMapping.findUnique({
    where: {
      propertyId_channelName: { propertyId: property.id, channelName: 'CHANNEX' },
    },
    include: {
      roomMappings: {
        include: { roomType: true },
      },
    },
  });

  if (!mapping) {
    throw new Error('No active Channex mapping found for "Test Property - RouteGuide". Go to Calendar Sync and enable it first!');
  }

  const apiKey = mapping.apiKey || USER_API_KEY;
  const extPropId = mapping.externalPropertyId;

  // Resolve room mappings
  const twinBar = mapping.roomMappings.find((rm) => rm.roomType.name === 'Twin Room - BAR');
  const twinBnb = mapping.roomMappings.find((rm) => rm.roomType.name === 'Twin Room - B&B');
  const doubleBar = mapping.roomMappings.find((rm) => rm.roomType.name === 'Double Room - BAR');
  const doubleBnb = mapping.roomMappings.find((rm) => rm.roomType.name === 'Double Room - B&B');

  if (!twinBar || !twinBnb || !doubleBar || !doubleBnb) {
    throw new Error('Could not find all 4 room type mappings in the database. Please verify Step 2 was executed.');
  }

  console.log(`Found Property Mapping for Property ID: ${extPropId}`);
  console.log('Room Mappings resolved:');
  console.log(`- Twin BAR: ${twinBar.externalRoomTypeId} (${twinBar.externalRatePlanId})`);
  console.log(`- Twin B&B: ${twinBnb.externalRoomTypeId} (${twinBnb.externalRatePlanId})`);
  console.log(`- Double BAR: ${doubleBar.externalRoomTypeId} (${doubleBar.externalRatePlanId})`);
  console.log(`- Double B&B: ${doubleBnb.externalRoomTypeId} (${doubleBnb.externalRatePlanId})`);

  console.log('\n==================================================');
  console.log('RUNNING TEST SCENARIOS...');
  console.log('==================================================\n');

  // --- TEST 2: Single Date Update for Single Rate ---
  console.log('Running Test 2 (Single Date Update for Single Rate)...');
  const test2Payload = {
    values: [
      {
        property_id: extPropId,
        rate_plan_id: twinBar.externalRatePlanId,
        date_from: '2026-11-22',
        date_to: '2026-11-22',
        rate: 33300, // $333.00
      },
    ],
  };
  await sendRequest('/restrictions', test2Payload, apiKey, 'Test 2');

  // --- TEST 3: Single Date Update for Multiple Rates ---
  console.log('Running Test 3 (Single Date, Multiple Rates)...');
  const test3Payload = {
    values: [
      {
        property_id: extPropId,
        room_type_id: twinBar.externalRoomTypeId,
        rate_plan_id: twinBar.externalRatePlanId,
        date_from: '2026-11-21',
        date_to: '2026-11-21',
        rate: 33300, // $333.00
      },
      {
        property_id: extPropId,
        room_type_id: doubleBar.externalRoomTypeId,
        rate_plan_id: doubleBar.externalRatePlanId,
        date_from: '2026-11-25',
        date_to: '2026-11-25',
        rate: 44400, // $444.00
      },
      {
        property_id: extPropId,
        room_type_id: doubleBnb.externalRoomTypeId,
        rate_plan_id: doubleBnb.externalRatePlanId,
        date_from: '2026-11-29',
        date_to: '2026-11-29',
        rate: 45623, // $456.23
      },
    ],
  };
  await sendRequest('/restrictions', test3Payload, apiKey, 'Test 3');

  // --- TEST 4: Multiple Date Update for Multiple Rates ---
  console.log('\nRunning Test 4 (Multiple Dates, Multiple Rates)...');
  const test4Payload = {
    values: [
      {
        property_id: extPropId,
        room_type_id: twinBar.externalRoomTypeId,
        rate_plan_id: twinBar.externalRatePlanId,
        date_from: '2026-11-01',
        date_to: '2026-11-10',
        rate: 24100, // $241.00
      },
      {
        property_id: extPropId,
        room_type_id: doubleBar.externalRoomTypeId,
        rate_plan_id: doubleBar.externalRatePlanId,
        date_from: '2026-11-10',
        date_to: '2026-11-16',
        rate: 31266, // $312.66
      },
      {
        property_id: extPropId,
        room_type_id: doubleBnb.externalRoomTypeId,
        rate_plan_id: doubleBnb.externalRatePlanId,
        date_from: '2026-11-01',
        date_to: '2026-11-20',
        rate: 11100, // $111.00
      },
    ],
  };
  await sendRequest('/restrictions', test4Payload, apiKey, 'Test 4');

  // --- TEST 8: Half-year Update ---
  console.log('\nRunning Test 8 (Half-year Update)...');
  const test8Payload = {
    values: [
      {
        property_id: extPropId,
        rate_plan_id: twinBar.externalRatePlanId,
        date_from: '2026-12-01',
        date_to: '2027-05-01',
        rate: 12000, // $120.00
      },
      {
        property_id: extPropId,
        rate_plan_id: doubleBar.externalRatePlanId,
        date_from: '2026-12-01',
        date_to: '2027-05-01',
        rate: 12000, // $120.00
      },
    ],
  };
  await sendRequest('/restrictions', test8Payload, apiKey, 'Test 8');

  // --- TEST 9: Single Date Availability Update ---
  console.log('\nRunning Test 9 (Single Date Availability)...');
  const test9Payload = {
    values: [
      {
        property_id: extPropId,
        room_type_id: twinBar.externalRoomTypeId,
        date_from: '2026-11-21',
        date_to: '2026-11-21',
        availability: 7,
      },
      {
        property_id: extPropId,
        room_type_id: doubleBar.externalRoomTypeId,
        date_from: '2026-11-25',
        date_to: '2026-11-25',
        availability: 0,
      },
    ],
  };
  await sendRequest('/availability', test9Payload, apiKey, 'Test 9');

  // --- TEST 10: Multiple Date Availability Update ---
  console.log('\nRunning Test 10 (Multiple Date Availability)...');
  const test10Payload = {
    values: [
      {
        property_id: extPropId,
        room_type_id: twinBar.externalRoomTypeId,
        date_from: '2026-11-10',
        date_to: '2026-11-16',
        availability: 3,
      },
      {
        property_id: extPropId,
        room_type_id: doubleBar.externalRoomTypeId,
        date_from: '2026-11-17',
        date_to: '2026-11-24',
        availability: 4,
      },
    ],
  };
  await sendRequest('/availability', test10Payload, apiKey, 'Test 10');

  console.log('\nAll test scenario executions finished!');
}

async function sendRequest(endpoint: string, payload: any, apiKey: string, testName: string) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const resJson: any = await res.json();
    if (res.ok) {
      const taskId = resJson.data?.[0]?.id || 'Unknown';
      console.log(`✅ ${testName} Success! Task ID: ${taskId}`);
    } else {
      console.error(`❌ ${testName} Failed (HTTP ${res.status}):`, JSON.stringify(resJson, null, 2));
    }
  } catch (err: any) {
    console.error(`❌ ${testName} Network Error:`, err.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
