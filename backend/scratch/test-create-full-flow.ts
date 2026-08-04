import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  let createdPropertyId = '';
  let createdChannelId = '';

  try {
    // Step 1: Try to create a new property using the API Key
    console.log('Step 1: Attempting to create a NEW test property on Channex Staging...');
    const propPayload = {
      property: {
        title: 'Antigravity Diagnostic Property',
        country: 'US',
        currency: 'USD',
        timezone: 'America/New_York'
      }
    };

    const propRes = await fetch(`${baseUrl}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey
      },
      body: JSON.stringify(propPayload)
    });

    const propResText = await propRes.text();
    console.log('Property Creation Status:', propRes.status);
    if (!propRes.ok) {
      console.error('Failed to create test property:', propResText);
      return;
    }

    const propData = JSON.parse(propResText);
    createdPropertyId = propData.data.id;
    console.log(`Successfully created property! ID: "${createdPropertyId}"`);

    // Step 2: Try to create a Booking.com channel under this new property
    console.log('\nStep 2: Attempting to create Booking.com channel under new property...');
    const channelPayload = {
      channel: {
        property_id: createdPropertyId,
        ota_id: 'BookingCom',
        title: 'BookingCom diagnostic channel',
        is_active: true,
        settings: {
          hotel_id: '10485037',
          send_email_notifications: false
        }
      }
    };

    const channelRes = await fetch(`${baseUrl}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey
      },
      body: JSON.stringify(channelPayload)
    });

    const channelResText = await channelRes.text();
    console.log('Channel Creation Status:', channelRes.status);
    
    if (channelRes.ok) {
      const channelData = JSON.parse(channelResText);
      createdChannelId = channelData.data.id;
      console.log(`SUCCESS! Channel created successfully! ID: "${createdChannelId}"`);
    } else {
      console.log('FAILED to create channel:', channelResText);
    }

  } catch (err: any) {
    console.error('Error during flow:', err.message);
  } finally {
    // Step 3: Cleanup
    console.log('\nStep 3: Cleaning up resources...');
    if (createdChannelId) {
      console.log(`Deleting channel ${createdChannelId}...`);
      await fetch(`${baseUrl}/channels/${createdChannelId}`, {
        method: 'DELETE',
        headers: { 'user-api-key': userApiKey }
      });
    }
    if (createdPropertyId) {
      console.log(`Deleting property ${createdPropertyId}...`);
      await fetch(`${baseUrl}/properties/${createdPropertyId}`, {
        method: 'DELETE',
        headers: { 'user-api-key': userApiKey }
      });
    }
    console.log('Cleanup completed.');
  }
}

main();
