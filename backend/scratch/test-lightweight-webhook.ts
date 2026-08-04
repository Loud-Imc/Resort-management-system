import fetch from 'node-fetch';

async function main() {
  console.log('Sending mock lightweight Channex booking webhook payload...');

  const payload = {
    event: 'booking',
    payload: {
      booking_id: '9e96166b-500f-4b05-b692-73a64608e45c', // Real test booking ID on your Channex account
      property_id: 'ebdff081-640f-4df8-8231-7b1ee84f232c' // Varkala Cliff Edge Homestay
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
