import fetch from 'node-fetch';

async function main() {
  console.log('Sending valid mock webhook request to local PMS backend...');

  const payload = {
    event: 'booking_new',
    data: {
      id: 'LOCAL-VALID-TEST-' + Math.floor(1000 + Math.random() * 9000),
      property_id: 'ebdff081-640f-4df8-8231-7b1ee84f232c',
      status: 'new',
      rooms: [
        {
          room_type_id: '2416240b-f8ef-4648-af31-3624ad9948f7', // Standard Heritage Room Channex ID
          check_in: '2026-08-10',
          check_out: '2026-08-12',
          amount: 9450,
          occupancy: {
            adults: 2,
            children: 0
          }
        }
      ],
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '+919999999999'
      },
      channel_name: 'Booking.com'
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/channels/webhook/CHANNEX', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response Status:', response.status);
    const text = await response.text();
    console.log('Response Content:', text);
  } catch (err: any) {
    console.error('Error during fetch:', err.message);
  }
}

main();
