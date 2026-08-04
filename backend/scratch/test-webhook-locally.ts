import fetch from 'node-fetch';

async function main() {
  console.log('Sending mock webhook request to local PMS backend...');

  const payload = {
    event: 'booking_new',
    data: {
      id: 'LOCAL-TEST-123456',
      property_id: '16442678-4d88-46c6-ae2a-9cca53ef31f1',
      status: 'new',
      rooms: [
        {
          room_type_id: 'some-room-type',
          check_in: '2026-08-01',
          check_out: '2026-08-03',
          amount: 5000,
        }
      ]
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
