import fetch from 'node-fetch';

async function main() {
  console.log('Sending mock ARI changes webhook request to local PMS backend...');

  const payload = {
    event: 'ari_changes',
    property_id: 'ebdff081-640f-4df8-8231-7b1ee84f232c',
    data: [
      {
        room_type_id: '2416240b-f8ef-4648-af31-3624ad9948f7',
        date: '2026-08-01',
        availability: 2
      }
    ]
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
