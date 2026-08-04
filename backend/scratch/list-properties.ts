import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  try {
    const response = await fetch(`${baseUrl}/properties`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
    });

    const data = await response.json();
    console.log('Channex API Response Status:', response.status);
    console.log('Registered Properties in your account:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error fetching properties:', err.message);
  }
}

main();
