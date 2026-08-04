import fetch from 'node-fetch';

async function main() {
  console.log('Fetching webhook requests from local ngrok API...');
  
  try {
    const response = await fetch('http://127.0.0.1:4040/api/requests/http?limit=50');
    
    if (response.status !== 200) {
      console.log(`Failed to fetch from ngrok API: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const requests = data.requests || [];
    
    // Filter requests that went to our webhook endpoint
    const webhookReqs = requests.filter((r: any) => r.path && r.path.includes('webhook'));
    
    console.log(`Found ${webhookReqs.length} webhook request(s) in ngrok history:\n`);
    
    for (let i = 0; i < webhookReqs.length; i++) {
      const r = webhookReqs[i];
      console.log(`=== Webhook Request #${i + 1} ===`);
      console.log(`Method: ${r.method}`);
      console.log(`Path: ${r.path}`);
      console.log(`Status Code Returned: ${r.resp?.status || 'N/A'}`);
      console.log(`Time: ${r.start}`);
      
      if (r.req?.body) {
        try {
          const rawBody = Buffer.from(r.req.body, 'base64').toString('utf-8');
          console.log('Raw Request Body:');
          console.log(JSON.stringify(JSON.parse(rawBody), null, 2));
        } catch (e) {
          const rawBody = Buffer.from(r.req.body, 'base64').toString('utf-8');
          console.log('Raw Request Body (text):', rawBody);
        }
      }
      console.log('\n');
    }
  } catch (err: any) {
    console.error('Error connecting to ngrok API:', err.message);
  }
}

main();
