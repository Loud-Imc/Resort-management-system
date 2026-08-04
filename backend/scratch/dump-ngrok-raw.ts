import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/requests/http?limit=2');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(err.message);
  }
}

main();
