import * as fs from 'fs';

const filePath = 'C:/Users/kamar/.gemini/antigravity-ide/brain/2aea07e2-0808-4d79-b31b-79f4ff80ef19/.system_generated/steps/462/content.md';
const fileContent = fs.readFileSync(filePath, 'utf8');

const jsonStartIndex = fileContent.indexOf('{"info"');
const jsonString = fileContent.substring(jsonStartIndex);
const collection = JSON.parse(jsonString);

console.log('Searching for "channel" or "ota" or "provider" inside Postman collection...');

function search(item: any, pathStr = '') {
  if (Array.isArray(item)) {
    item.forEach((child) => search(child, pathStr));
  } else if (typeof item === 'object' && item !== null) {
    const currentName = item.name || '';
    const newPath = pathStr ? `${pathStr} > ${currentName}` : currentName;

    // Check if item is a request
    if (item.request) {
      const urlStr = typeof item.request.url === 'string' ? item.request.url : item.request.url.raw || '';
      const matches = 
        currentName.toLowerCase().includes('channel') || 
        currentName.toLowerCase().includes('ota') ||
        currentName.toLowerCase().includes('provider') ||
        urlStr.toLowerCase().includes('channel') ||
        urlStr.toLowerCase().includes('ota') ||
        urlStr.toLowerCase().includes('provider');

      if (matches) {
        console.log(`- MATCH: ${newPath} [${item.request.method}]: ${urlStr}`);
      }
    }

    // Traverse children
    if (item.item) {
      search(item.item, newPath);
    }
  }
}

search(collection.item);
