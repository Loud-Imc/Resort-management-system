import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const apiKey = process.env.CHANNEX_USER_API_KEY;
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
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

run();
