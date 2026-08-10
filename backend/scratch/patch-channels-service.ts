import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../src/channels/channels.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'async getAvailableChannelsCatalog() {';
const endMarker = 'async enableChannelSyncForProperty(propertyId: string, channelName = \'CHANNEX\') {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Failed to locate markers in channels.service.ts');
  process.exit(1);
}

// Find the last closing brace and empty lines before enableChannelSyncForProperty
const textBeforeEnd = content.substring(startIndex, endIndex);
const lastClosingBraceIndex = textBeforeEnd.lastIndexOf('}');
if (lastClosingBraceIndex === -1) {
  console.error('Failed to find closing brace of getAvailableChannelsCatalog');
  process.exit(1);
}

const methodEndIndex = startIndex + lastClosingBraceIndex + 1;

const dynamicMethod = `async getAvailableChannelsCatalog() {
    const userApiKey = process.env.CHANNEX_USER_API_KEY;
    const baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';

    if (!userApiKey) {
      this.logger.warn('[Channels] CHANNEX_USER_API_KEY is not defined in environment. Falling back to empty catalog.');
      return [];
    }

    try {
      const response = await fetch(\`\${baseUrl}/channels/list\`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(\`[Channels] Failed to fetch channel list from Channex: \${response.status} \${errText}\`);
        return [];
      }

      const resData = await response.json();
      const rawChannels = resData.data || [];

      return rawChannels.map((item: any) => {
        const codeKey = item.code.toLowerCase();

        // 1. Determine premium visual features based on channel code
        let category = 'Supported Channel';
        let color = 'from-muted/40 to-muted/20 border-border/50';

        if (['makemytrip', 'goibibo', 'easemytrip', 'yatra', 'cleartrip'].includes(codeKey)) {
          category = 'Regional Leader';
        } else if (['bookingcom', 'agoda', 'airbnb', 'expedia', 'tripcom'].includes(codeKey)) {
          category = 'Global Leader';
        } else if (['googlehotels', 'googlehotelari'].includes(codeKey)) {
          category = 'Metasearch & Direct';
        } else if (['vrbo'].includes(codeKey)) {
          category = 'Vacation Rentals';
        }

        if (codeKey === 'makemytrip') {
          color = 'from-blue-500/10 to-indigo-500/10 border-blue-500/30';
        } else if (codeKey === 'goibibo') {
          color = 'from-orange-500/10 to-amber-500/10 border-orange-500/30';
        } else if (codeKey === 'bookingcom') {
          color = 'from-sky-500/10 to-blue-500/10 border-sky-500/30';
        } else if (codeKey === 'agoda') {
          color = 'from-purple-500/10 to-pink-500/10 border-purple-500/30';
        } else if (codeKey === 'airbnb') {
          color = 'from-rose-500/10 to-red-500/10 border-rose-500/30';
        } else if (codeKey === 'expedia') {
          color = 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30';
        } else if (codeKey === 'tripcom') {
          color = 'from-teal-500/10 to-cyan-500/10 border-teal-500/30';
        } else if (codeKey === 'easemytrip') {
          color = 'from-emerald-500/10 to-green-500/10 border-emerald-500/30';
        } else if (codeKey === 'googlehotelari' || codeKey === 'googlehotels') {
          color = 'from-green-500/10 to-emerald-500/10 border-green-500/30';
        } else if (codeKey === 'vrbo') {
          color = 'from-blue-600/10 to-indigo-600/10 border-blue-600/30';
        }

        // 2. Format connection settings fields dynamically
        const fields = Object.entries(item.params || {}).map(([key, fieldVal]: [string, any]) => {
          const isRequired = ['hotel_id', 'hotel_code', 'access_token', 'api_key', 'station_code', 'agent_id'].includes(key) || 
            fieldVal.rules?.some((r: any) => r.apply === 'required');

          return {
            key,
            label: fieldVal.title || key,
            type: fieldVal.type === 'select' ? 'select' : fieldVal.type === 'boolean' ? 'boolean' : fieldVal.type === 'password' ? 'password' : 'text',
            required: isRequired || false,
            placeholder: \`Enter \${fieldVal.title || key}\`,
            options: fieldVal.options || [],
            default: fieldVal.default,
            position: fieldVal.position || 0,
          };
        }).sort((a: any, b: any) => a.position - b.position);

        return {
          key: item.code,
          title: item.title,
          category,
          color,
          fields,
          payload: item.payload || null,
          mappingMode: item.mapping_mode || null,
        };
      });
    } catch (error: any) {
      this.logger.error(\`[Channels] Error fetching channel list: \${error.message}\`);
      return [];
    }
  }`;

const newContent = content.substring(0, startIndex) + dynamicMethod + content.substring(methodEndIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully replaced getAvailableChannelsCatalog with dynamic implementation!');
