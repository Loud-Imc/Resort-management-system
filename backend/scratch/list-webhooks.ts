import fetch from 'node-fetch';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';

async function main() {
  console.log('Fetching registered webhooks from Channex Staging...');

  try {
    const response = await fetch(`${BASE_URL}/webhooks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
    });

    const data = await response.json();
    console.log('Channex API Response Status:', response.status);
    console.log('Webhooks list:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error fetching webhooks:', err.message);
  }
}

main();
