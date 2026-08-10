import fetch from 'node-fetch';

async function main() {
  const userApiKey = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = 'https://staging.channex.io/api/v1';

  try {
    const response = await fetch(`${baseUrl}/channels/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
    });

    const data = await response.json();
    console.log('Channex Channels Catalog:');
    const matches = data.data.filter((item: any) => 
      item.title.toLowerCase().includes('booking') || 
      item.code.toLowerCase().includes('booking')
    );
    console.log(JSON.stringify(matches, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
