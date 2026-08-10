import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';
  
  // Property ID that we verified is in your account (Serene Lake Homestay)
  const propertyId = '16442678-4d88-46c6-ae2a-9cca53ef31f1';
  // Group ID from the property relationships
  const groupId = '40fb70ac-c58b-49e8-b37e-47ce60cd91fc';

  try {
    console.log('Testing channel creation WITH group_id in payload...');

    // Prepare payload to create the channel
    const payload = {
      channel: {
        property_id: propertyId,
        group_id: groupId, // Explicitly pass the group ID
        ota_id: 'BookingCom',
        title: 'BookingCom Group Test',
        is_active: true,
        settings: {
          hotel_id: '10485037',
          send_email_notifications: false
        }
      }
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${baseUrl}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey
      },
      body: JSON.stringify(payload)
    });

    const resText = await response.text();
    console.log('\nResponse Status:', response.status);
    try {
      console.log('Response Body:', JSON.stringify(JSON.parse(resText), null, 2));
    } catch {
      console.log('Response Body:', resText);
    }

  } catch (err: any) {
    console.error('Error running test script:', err.message);
  }
}

main();
