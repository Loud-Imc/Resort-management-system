import * as fs from 'fs';

async function main() {
  const filePath = 'C:/Users/kamar/.gemini/antigravity-ide/brain/2aea07e2-0808-4d79-b31b-79f4ff80ef19/.system_generated/steps/462/content.md';
  if (!fs.existsSync(filePath)) {
    console.error('Postman file not found at:', filePath);
    return;
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const jsonStartIndex = fileContent.indexOf('{"info"');
  if (jsonStartIndex === -1) {
    console.error('Could not find JSON start in content.');
    return;
  }
  const jsonString = fileContent.substring(jsonStartIndex);
  const collection = JSON.parse(jsonString);

  console.log('Inspecting channel-related requests inside Postman collection...');

  function search(item: any, pathStr = '') {
    if (Array.isArray(item)) {
      item.forEach((child) => search(child, pathStr));
    } else if (typeof item === 'object' && item !== null) {
      const currentName = item.name || '';
      const newPath = pathStr ? `${pathStr} > ${currentName}` : currentName;

      if (item.request) {
        const urlStr = typeof item.request.url === 'string' ? item.request.url : item.request.url.raw || '';
        const matches = 
          currentName.toLowerCase().includes('channel') || 
          urlStr.toLowerCase().includes('channel');

        if (matches) {
          console.log(`\n===========================================`);
          console.log(`Path: ${newPath}`);
          console.log(`Method: ${item.request.method}`);
          console.log(`URL: ${urlStr}`);
          if (item.request.body) {
            console.log(`Body Mode: ${item.request.body.mode}`);
            console.log(`Body Raw Content:`);
            console.log(item.request.body.raw);
          }
          console.log(`===========================================`);
        }
      }

      if (item.item) {
        search(item.item, newPath);
      }
    }
  }

  search(collection.item);
}

main();
