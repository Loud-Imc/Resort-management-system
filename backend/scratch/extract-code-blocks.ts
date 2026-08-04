import * as fs from 'fs';
import * as path from 'path';

const filePath = 'C:\\Users\\kamar\\.gemini\\antigravity-ide\\brain\\2aea07e2-0808-4d79-b31b-79f4ff80ef19\\.system_generated\\steps\\1129\\content.md';

function main() {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // A simple regex to find JSON structures or code snippets
  // Since it is HTML content, let's look for tags or text inside code blocks
  console.log('Extracting plain text code snippet blocks...');
  
  // We can look for patterns of code blocks, e.g. `<code` or `<pre`
  const codeRegex = /<pre[\s\S]*?>([\s\S]*?)<\/pre>/gi;
  let match;
  let count = 0;
  
  while ((match = codeRegex.exec(content)) !== null) {
    count++;
    console.log(`\n--- Code Block ${count} ---`);
    // Strip HTML tags to make it clean readable JSON/text
    const rawHtml = match[1];
    const cleanText = rawHtml
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
      
    // Print the first 1000 characters of the block
    console.log(cleanText.substring(0, 1000));
  }
}

main();
