import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  let createdPropertyId = '';

  try {
    // 1. Create temporary property
    console.log('Creating temporary test property...');
    const propRes = await fetch(`${baseUrl}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey
      },
      body: JSON.stringify({
        property: {
          title: 'Antigravity Multi-OTA Test',
          country: 'US',
          currency: 'USD',
          timezone: 'America/New_York'
        }
      })
    });

    if (!propRes.ok) {
      console.error('Failed to create property:', await propRes.text());
      return;
    }
    const propData = await propRes.json();
    createdPropertyId = propData.data.id;
    console.log(`Created Property ID: ${createdPropertyId}`);

    // 2. Fetch OTAs from catalog to verify their codes
    const catalogRes = await fetch(`${baseUrl}/channels/list`, {
      headers: { 'user-api-key': userApiKey }
    });
    const catalogData = await catalogRes.json();

    // Let's test a few common ones
    const otasToTest = [
      { code: 'Agoda', title: 'Agoda', settings: { hotel_id: '12345' } },
      { code: 'Expedia', title: 'ExpediaQuickConnect', settings: { hotel_id: '12345' } },
      { code: 'Google', title: 'Google', settings: { hotel_id: '12345' } },
      { code: 'Airbnb', title: 'Airbnb', settings: {} },
      { code: 'BookingCom', title: 'Booking.com', settings: { hotel_id: '10485037' } }
    ];

    for (const ota of otasToTest) {
      console.log(`\n-------------------------------------------`);
      console.log(`Testing OTA: ${ota.title} (${ota.code})`);
      console.log(`-------------------------------------------`);

      const payload = {
        channel: {
          property_id: createdPropertyId,
          ota_id: ota.code,
          title: `${ota.title} Test Link`,
          is_active: true,
          settings: ota.settings
        }
      };

      const response = await fetch(`${baseUrl}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      console.log('Status:', response.status);
      try {
        const parsed = JSON.parse(resText);
        if (response.ok) {
          console.log('SUCCESS! Channel ID:', parsed.data.id);
          // Delete it right away
          await fetch(`${baseUrl}/channels/${parsed.data.id}`, {
            method: 'DELETE',
            headers: { 'user-api-key': userApiKey }
          });
        } else {
          console.log('FAILED. Errors:', JSON.stringify(parsed.errors, null, 2));
        }
      } catch {
        console.log('Raw Response:', resText);
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    if (createdPropertyId) {
      console.log('\nCleaning up property...');
      await fetch(`${baseUrl}/properties/${createdPropertyId}`, {
        method: 'DELETE',
        headers: { 'user-api-key': userApiKey }
      });
      console.log('Cleanup completed.');
    }
  }
}

main();
