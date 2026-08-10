import fetch from 'node-fetch';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = 'ebbdff08-1640-4df8-8231-7b1ee84f232c'; // Varkala Cliff Edge Homestay on Channex Staging

async function main() {
  console.log(`Checking Channex Room Types for Property ID: ${PROPERTY_ID}...`);
  
  const roomResponse = await fetch(`${BASE_URL}/room_types?filter[property_id]=${PROPERTY_ID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'user-api-key': USER_API_KEY,
    },
  });
  
  const roomData = await roomResponse.json();
  const rooms = roomData.data || [];
  console.log(`Found ${rooms.length} room types:`);
  for (const r of rooms) {
    console.log(`- Room Type: "${r.attributes.title}" (ID: ${r.attributes.id})`);
  }

  console.log('\nChecking Channex Rate Plans...');
  const rateResponse = await fetch(`${BASE_URL}/rate_plans?filter[property_id]=${PROPERTY_ID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'user-api-key': USER_API_KEY,
    },
  });
  
  const rateData = await rateResponse.json();
  const rates = rateData.data || [];
  console.log(`Found ${rates.length} rate plans:`);
  for (const r of rates) {
    console.log(`- Rate Plan: "${r.attributes.title}" (ID: ${r.attributes.id})`);
  }
}

main();
