import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  try {
    const response = await fetch(`${baseUrl}/channels/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
    });

    const data = await response.json();
    const bookingOta = data.data.find((item: any) => 
      item.title.toLowerCase().includes('booking.com') || item.code === 'BookingCom'
    );

    console.log('Booking.com Catalog Item details:');
    console.log(JSON.stringify(bookingOta, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
