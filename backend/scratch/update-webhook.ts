import fetch from 'node-fetch';
import * as readline from 'readline';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = 'ebdff081-640f-4df8-8231-7b1ee84f232c'; // Varkala Cliff Edge Homestay
const WEBHOOK_ID = '6c52ea79-e2ab-4deb-b7da-d1c601c4a0a2'; // Existing webhook ID for this property

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('=== Channex Webhook Sync tool ===');
  console.log(`Property: Varkala Cliff Edge Homestay (${PROPERTY_ID})`);
  console.log(`Current Webhook ID: ${WEBHOOK_ID}\n`);

  const ngrokUrlInput = await askQuestion('Please enter your current active ngrok URL (e.g. https://abcd-12-34.ngrok-free.app): ');
  rl.close();

  if (!ngrokUrlInput.trim().startsWith('http')) {
    console.error('Invalid URL entered. Must start with http or https.');
    return;
  }

  // Ensure url ends without trailing slash and clean it up
  let cleanNgrokUrl = ngrokUrlInput.trim().replace(/\/$/, '');
  const callbackUrl = `${cleanNgrokUrl}/api/channels/webhook/CHANNEX`;

  console.log(`Setting callback URL to: ${callbackUrl}`);
  console.log(`Setting webhook to ACTIVE...\n`);

  const payload = {
    webhook: {
      property_id: PROPERTY_ID,
      callback_url: callbackUrl,
      event_mask: '*',
      is_active: true
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/webhooks/${WEBHOOK_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    console.log('Channex API Response Status:', response.status);
    console.log('Response Body:');
    console.log(JSON.stringify(resData, null, 2));

    if (response.status === 200) {
      console.log('\nSuccess! Webhook is now ACTIVE and pointing to your local environment.');
      console.log('Channex will now route all booking actions directly to your local PMS.');
    }
  } catch (err: any) {
    console.error('Error updating webhook:', err.message);
  }
}

main();
