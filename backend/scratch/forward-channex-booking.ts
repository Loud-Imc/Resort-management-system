import fetch from 'node-fetch';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = 'ebdff081-640f-4df8-8231-7b1ee84f232c'; // Varkala Cliff Edge Homestay
const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/channels/webhook/CHANNEX';

async function main() {
  console.log(`Fetching latest bookings from Channex Staging for Property: ${PROPERTY_ID}...`);

  try {
    const response = await fetch(`${BASE_URL}/bookings?filter[property_id]=${PROPERTY_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
    });

    const resData = await response.json();
    const bookings = resData.data || [];

    if (bookings.length === 0) {
      console.log('No bookings found in this Channex account.');
      return;
    }

    console.log(`Found ${bookings.length} booking(s). Fetching details for the latest booking...`);
    
    // Get the latest booking
    const latestBookingRaw = bookings[0];
    const bookingId = latestBookingRaw.id;

    // Fetch the full details of this booking to get room types and customer data
    console.log(`Fetching full details for Booking ID: ${bookingId}...`);
    const detailResponse = await fetch(`${BASE_URL}/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
    });

    const detailData = await detailResponse.json();
    const fullBookingData = detailData.data;

    console.log('\nBooking Details:');
    console.log(`- Unique ID: ${fullBookingData.attributes.id || fullBookingData.id}`);
    console.log(`- Customer: ${fullBookingData.attributes.customer?.firstName} ${fullBookingData.attributes.customer?.lastName}`);
    console.log(`- Dates: ${fullBookingData.attributes.arrival_date} -> ${fullBookingData.attributes.departure_date}`);
    console.log(`- Status: ${fullBookingData.attributes.status}`);

    // Construct the webhook event payload
    const webhookPayload = {
      event: 'booking_new',
      data: {
        id: fullBookingData.id,
        property_id: fullBookingData.relationships?.property?.data?.id || PROPERTY_ID,
        status: fullBookingData.attributes.status,
        arrival_date: fullBookingData.attributes.arrival_date,
        departure_date: fullBookingData.attributes.departure_date,
        rooms: (fullBookingData.attributes.rooms || []).map((r: any) => ({
          id: r.id,
          room_type_id: r.room_type_id,
          rate_plan_id: r.rate_plan_id,
          check_in: r.checkin_date || fullBookingData.attributes.arrival_date,
          check_out: r.checkout_date || fullBookingData.attributes.departure_date,
          amount: r.amount || 0,
          occupancy: r.occupancy || { adults: 2, children: 0 }
        })),
        customer: fullBookingData.attributes.customer || {
          firstName: 'Channex',
          lastName: 'Guest'
        },
        channel_name: fullBookingData.attributes.channel_name || 'Booking.com'
      }
    };

    console.log('\nForwarding webhook payload to local PMS...');
    const localResponse = await fetch(LOCAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('Local Server Response Status:', localResponse.status);
    const localText = await localResponse.text();
    console.log('Local Server Response Content:', localText);

  } catch (err: any) {
    console.error('Error forwarding booking:', err.message);
  }
}

main();
