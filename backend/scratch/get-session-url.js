const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

async function run() {
  const apiKey = process.env.CHANNEX_USER_API_KEY || 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
  const baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';
  const externalPropertyId = '16442678-4d88-46c6-ae2a-9cca53ef31f1';

  try {
    const response = await axios.post(`${baseUrl}/auth/one_time_token`, {
      one_time_token: {
        property_id: externalPropertyId,
        username: 'ResortAdmin',
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': apiKey,
      },
    });

    const token = response.data.data.token;
    const url = `https://staging.channex.io/auth/exchange?oauth_session_key=${token}&app_mode=headless&redirect_to=/channels&property_id=${externalPropertyId}`;
    console.log('EXCHANGE_URL:', url);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

run();
