import fetch from 'node-fetch';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';
const BOOKING_ID = 'adf3ff13-3d33-4501-ac19-77e23981e3eb';

async function main() {
  console.log(`Fetching full details for Booking ID: ${BOOKING_ID}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/bookings/${BOOKING_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
    });

    const data = await response.json();
    const attributes = data.data?.attributes || {};
    
    console.log('\n=== Customer Object in attributes ===');
    console.log(JSON.stringify(attributes.customer, null, 2));

    console.log('\n=== All attributes of the Booking ===');
    console.log(JSON.stringify(attributes, null, 2));

  } catch (err: any) {
    console.error('Error fetching booking details:', err.message);
  }
}

main();
