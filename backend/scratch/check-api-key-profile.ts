import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  const endpoints = [
    '/profile',
    '/me',
    '/users/me',
    '/api_keys',
    '/companies'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n-------------------------------------------`);
      console.log(`Fetching: ${baseUrl}${endpoint}`);
      console.log(`-------------------------------------------`);
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: { 'user-api-key': userApiKey }
      });
      console.log('Status:', res.status);
      const text = await res.text();
      try {
        console.log(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        console.log(text);
      }
    } catch (err: any) {
      console.error('Error fetching endpoint:', err.message);
    }
  }
}

main();
