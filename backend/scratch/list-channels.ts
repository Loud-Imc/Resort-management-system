import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';
  const propertyId = '16442678-4d88-46c6-ae2a-9cca53ef31f1'; // Serene Lake Homestay

  try {
    console.log(`Fetching connected channels for property: ${propertyId}...`);
    const response = await fetch(`${baseUrl}/channels?filter[property_id]=${propertyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
    });

    const data = await response.json();
    console.log('Channex API Response Status:', response.status);
    console.log('Connected Channels list:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error fetching channels:', err.message);
  }
}

main();
