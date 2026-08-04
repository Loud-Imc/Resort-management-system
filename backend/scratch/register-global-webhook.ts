import fetch from 'node-fetch';
import * as readline from 'readline';

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';

async function main() {
  console.log('=== Channex Global Webhook Setup Tool ===');
  
  // Read ngrok URL from command-line arguments if provided
  let ngrokUrlInput = process.argv[2];

  if (!ngrokUrlInput) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const askQuestion = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));
    ngrokUrlInput = await askQuestion('Please enter your current active ngrok URL (e.g. https://abcd-12-34.ngrok-free.app): ');
    rl.close();
  }

  if (!ngrokUrlInput || !ngrokUrlInput.trim().startsWith('http')) {
    console.error('Invalid URL entered. Must start with http or https.');
    console.error('Usage: npx ts-node scratch/register-global-webhook.ts <your-ngrok-url>');
    return;
  }

  const cleanNgrokUrl = ngrokUrlInput.trim().replace(/\/$/, '');
  const callbackUrl = `${cleanNgrokUrl}/api/channels/webhook/CHANNEX`;

  try {
    // 1. Fetch all existing webhooks
    console.log('\nStep 1: Fetching existing webhooks...');
    const listRes = await fetch(`${BASE_URL}/webhooks`, {
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      }
    });
    const listData = await listRes.json();
    const existingWebhooks = listData.data || [];

    // 2. Delete existing webhooks so we don't get duplicate deliveries
    if (existingWebhooks.length > 0) {
      console.log(`Found ${existingWebhooks.length} existing webhook(s). Deleting them to avoid duplicates...`);
      for (const wh of existingWebhooks) {
        console.log(`- Deleting webhook ${wh.id} (${wh.attributes.callback_url})`);
        await fetch(`${BASE_URL}/webhooks/${wh.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'user-api-key': USER_API_KEY,
          }
        });
      }
      console.log('All old webhooks deleted successfully.');
    } else {
      console.log('No old webhooks found.');
    }

    // 3. Create a single Global Webhook
    console.log(`\nStep 2: Creating a new Global Webhook targeting: ${callbackUrl}`);
    const payload = {
      webhook: {
        callback_url: callbackUrl,
        event_mask: '*',
        is_active: true,
        is_global: true // This flag makes it account-wide!
      }
    };

    const createRes = await fetch(`${BASE_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY,
      },
      body: JSON.stringify(payload)
    });

    const createData = await createRes.json();
    console.log('\nChannex API Response Status:', createRes.status);
    console.log('Response Body:');
    console.log(JSON.stringify(createData, null, 2));

    if (createRes.status === 201 || createRes.status === 200) {
      console.log('\n🎉 SUCCESS! You have registered a single GLOBAL Webhook.');
      console.log('Channex will now route reservations for ALL properties in this account to your local environment.');
    } else {
      console.error('\n❌ Failed to register global webhook.');
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
