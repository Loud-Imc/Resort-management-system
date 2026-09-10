const fs = require('fs');
const path = require('path');

// Simple .env parser to avoid external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
}

loadEnv();

const BASE_URL = process.env.CHANNEX_BASE_URL || 'https://app.channex.io/api/v1';
const USER_API_KEY = process.argv[2] || process.env.CHANNEX_USER_API_KEY;
const CALLBACK_URL = process.argv[3] || 'https://api.myoreedu.com/api/channels/webhook/CHANNEX';

async function registerProductionWebhook() {
  console.log('=====================================================');
  console.log('  Channex Production Global Webhook Registration Tool');
  console.log('=====================================================');
  console.log(`Channex Base URL : ${BASE_URL}`);
  console.log(`Callback URL     : ${CALLBACK_URL}`);
  console.log(`API Key Provided : ${USER_API_KEY ? `${USER_API_KEY.substring(0, 8)}...${USER_API_KEY.slice(-4)}` : 'MISSING'}`);
  console.log('-----------------------------------------------------');

  if (!USER_API_KEY) {
    console.error('\n❌ ERROR: CHANNEX_USER_API_KEY is not defined.');
    console.error('Usage:');
    console.error('  node scratch/register-production-webhook.js <CHANNEX_USER_API_KEY> [CALLBACK_URL]');
    console.error('or ensure CHANNEX_USER_API_KEY is set in backend/.env');
    process.exit(1);
  }

  try {
    // 1. Fetch current webhooks
    console.log('\n[Step 1] Fetching existing registered webhooks from Channex...');
    const listRes = await fetch(`${BASE_URL}/webhooks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY.trim(),
      },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error(`\n❌ Failed to connect to Channex (HTTP ${listRes.status}):`, errText);
      if (listRes.status === 401) {
        console.error('👉 Please double check that your API Key is valid for: ' + BASE_URL);
      }
      process.exit(1);
    }

    const listData = await listRes.json();
    const existingWebhooks = listData.data || [];
    console.log(`Found ${existingWebhooks.length} existing webhook(s).`);

    // 2. Clean up obsolete webhooks to avoid duplicates
    if (existingWebhooks.length > 0) {
      console.log('\n[Step 2] Cleaning up duplicate / old webhooks...');
      for (const wh of existingWebhooks) {
        const whUrl = wh.attributes?.callback_url;
        const whId = wh.id;
        console.log(`  - Deleting webhook ${whId} (${whUrl})...`);
        const delRes = await fetch(`${BASE_URL}/webhooks/${whId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'user-api-key': USER_API_KEY.trim(),
          },
        });
        if (delRes.ok) {
          console.log(`    ✓ Deleted webhook ID: ${whId}`);
        } else {
          console.warn(`    ⚠ Failed to delete webhook ID: ${whId}`);
        }
      }
    }

    // 3. Register the new Global Webhook
    console.log(`\n[Step 3] Registering Global Webhook -> ${CALLBACK_URL}`);
    const payload = {
      webhook: {
        callback_url: CALLBACK_URL,
        event_mask: '*',
        property_id: null,
        is_global: true,
        is_active: true,
        send_data: true,
      },
    };

    const createRes = await fetch(`${BASE_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY.trim(),
      },
      body: JSON.stringify(payload),
    });

    const createData = await createRes.json();

    if (createRes.status === 201 || createRes.status === 200) {
      const webhookId = createData.data?.id;
      console.log('\n=====================================================');
      console.log('🎉 SUCCESS! Global Webhook successfully registered!');
      console.log('=====================================================');
      console.log(`Webhook ID   : ${webhookId}`);
      console.log(`Callback URL : ${createData.data?.attributes?.callback_url}`);
      console.log(`Is Global    : ${createData.data?.attributes?.is_global}`);
      console.log(`Is Active    : ${createData.data?.attributes?.is_active}`);
      console.log(`Event Mask   : ${createData.data?.attributes?.event_mask}`);
      console.log(`Send Data    : ${createData.data?.attributes?.send_data}`);
      console.log('\nAll bookings and modifications from all properties in your Channex account will now be automatically pushed to:');
      console.log(`👉 ${CALLBACK_URL}`);
    } else {
      console.error('\n❌ Failed to create Global Webhook:', JSON.stringify(createData, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Unexpected Error:', error.message);
  }
}

registerProductionWebhook();
