import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';
  
  // All 8 properties from your staging list
  const properties = [
    { id: 'd1753592-fc61-4cd1-89e3-1f966043d22b', title: 'Beypore Marina Boutique Stay' },
    { id: 'd18270df-6d92-4588-93f9-6694f15e9686', title: 'Kadalundi Backwater Eco-Villa' },
    { id: 'f387ae5c-ad70-44d5-94f0-2dae54f46d7c', title: 'Poovar Island Floating Villa' },
    { id: '22721592-fddf-4851-8d3d-b7ca14c0087e', title: 'Royal Capital City Hotel' },
    { id: '16442678-4d88-46c6-ae2a-9cca53ef31f1', title: 'Serene Lake Homestay' },
    { id: '4fbc3de9-d85c-4e79-9c97-490b359bb0cc', title: 'Serene Lake Homestay (Dup)' },
    { id: '087a740d-b5a8-4921-831d-f4038b61a052', title: 'The Grand Heritage Resort' },
    { id: 'ebdff081-640f-4df8-8231-7b1ee84f232c', title: 'Varkala Cliff Edge Homestay' }
  ];

  try {
    for (const prop of properties) {
      console.log(`\n===========================================`);
      console.log(`Testing Property: "${prop.title}" (${prop.id})`);
      console.log(`===========================================`);

      // Prepare payload to create the channel
      const payload = {
        channel: {
          property_id: prop.id,
          ota_id: 'BookingCom',
          title: `BookingCom Test for ${prop.title}`,
          is_active: true,
          settings: {
            hotel_id: '10485037', // Valid test hotel ID on Channex Staging
            send_email_notifications: false
          }
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
      console.log('Response Status:', response.status);
      try {
        const parsed = JSON.parse(resText);
        if (response.ok) {
          console.log('SUCCESS! Channel Created. ID:', parsed.data.id);
          // Let's delete it right away to keep the test clean
          await fetch(`${baseUrl}/channels/${parsed.data.id}`, {
            method: 'DELETE',
            headers: { 'user-api-key': userApiKey }
          });
          console.log('Cleaned up / Deleted test channel successfully.');
        } else {
          console.log('FAILED. Errors:', JSON.stringify(parsed.errors, null, 2));
        }
      } catch {
        console.log('Raw Response:', resText);
      }
    }
  } catch (err: any) {
    console.error('Error running test script:', err.message);
  }
}

main();
