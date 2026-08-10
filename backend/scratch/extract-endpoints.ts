import * as fs from 'fs';
import * as path from 'path';

// Read the saved Postman JSON file
const filePath = 'C:/Users/kamar/.gemini/antigravity-ide/brain/2aea07e2-0808-4d79-b31b-79f4ff80ef19/.system_generated/steps/462/content.md';
const fileContent = fs.readFileSync(filePath, 'utf8');

const jsonStartIndex = fileContent.indexOf('{"info"');
if (jsonStartIndex === -1) {
  console.error('Could not find JSON start in content.md');
  process.exit(1);
}

const jsonString = fileContent.substring(jsonStartIndex);
const collection = JSON.parse(jsonString);

function traverse(item: any) {
  if (Array.isArray(item)) {
    item.forEach(traverse);
  } else if (item.item) {
    console.log(`\nFolder: ${item.name}`);
    traverse(item.item);
  } else {
    const req = item.request;
    if (req) {
      const urlStr = typeof req.url === 'string' ? req.url : req.url.raw || '';
      console.log(`  - ${item.name} [${req.method}]: ${urlStr}`);
    }
  }
}

traverse(collection.item);
