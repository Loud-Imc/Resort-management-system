import fetch from 'node-fetch';

async function main() {
  console.log('Fetching recent requests from local ngrok API...');
  
  try {
    const response = await fetch('http://localhost:4040/api/requests/http?limit=10');
    
    if (response.status !== 200) {
      console.log(`Failed to fetch from ngrok API: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const requests = data.requests || [];
    
    console.log(`Found ${requests.length} request(s) in ngrok history:\n`);
    
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      console.log(`=== Request #${i + 1} ===`);
      console.log(`Method: ${r.method}`);
      console.log(`URI: ${r.uri}`);
      console.log(`Status: ${r.resp?.status || 'N/A'}`);
      console.log(`Time: ${r.start}`);
      
      // Parse and display raw request body
      if (r.req?.body) {
        try {
          const rawBody = Buffer.from(r.req.body, 'base64').toString('utf-8');
          console.log('Raw Payload (JSON):');
          console.log(JSON.stringify(JSON.parse(rawBody), null, 2));
        } catch (e) {
          const rawBody = Buffer.from(r.req.body, 'base64').toString('utf-8');
          console.log('Raw Payload (Text):', rawBody);
        }
      }
      console.log('\n');
    }
  } catch (err: any) {
    console.error('Error connecting to ngrok API:', err.message);
    console.log('Make sure ngrok is running and accessible at http://localhost:4040');
  }
}

main();
