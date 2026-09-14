const fs = require('fs');
const path = require('path');

const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
let PdfPrinter;
let URLResolver;
let virtualFs;

try {
  PdfPrinter = require(path.join(pdfmakeDir, 'js', 'Printer')).default || require(path.join(pdfmakeDir, 'js', 'Printer'));
  URLResolver = require(path.join(pdfmakeDir, 'js', 'URLResolver')).default || require(path.join(pdfmakeDir, 'js', 'URLResolver'));
  virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
} catch {
  PdfPrinter = require(path.join(pdfmakeDir, 'js', 'printer')).default || require(path.join(pdfmakeDir, 'js', 'printer'));
  URLResolver = require(path.join(pdfmakeDir, 'js', 'urlresolver')).default || require(path.join(pdfmakeDir, 'js', 'urlresolver'));
  virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
}

const fontsPath = path.join(__dirname, '../node_modules/pdfmake/fonts/Roboto');

const fonts = {
  Roboto: {
    normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
    bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
    italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf'),
  },
};

const urlResolver = new URLResolver(virtualFs);
const printer = new PdfPrinter(fonts, virtualFs, urlResolver);

const docDefinition = {
  pageSize: 'A4',
  pageMargins: [40, 40, 40, 40],
  content: [
    { text: 'Remote App Update Integration Guide', style: 'header' },
    { text: 'Target: Flutter Mobile Developer  |  Status: Live on Dev Backend', style: 'subheader' },
    { text: ' ', margin: [0, 2, 0, 2] },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'Core Principle: The backend owns the update policy rules; Flutter enforces them. No minimum versions are hard-coded in Flutter. Admins control rollout and enforcement remotely from the admin dashboard.',
              fillColor: '#EEF2FF',
              margin: [10, 8, 10, 8],
              fontSize: 9.5,
              color: '#3730A3',
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12],
    },

    { text: '1. Public API Endpoint (No Auth Required)', style: 'sectionHeader' },
    { text: 'Call this endpoint during Flutter app startup and when returning to foreground:', style: 'body' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'GET /api/v1/app/update-config?platform=android&version=2.4.0',
              fillColor: '#0F172A',
              color: '#38BDF8',
              fontSize: 9.5,
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 2, 0, 8],
    },

    { text: 'Request Parameters:', style: 'subSectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['22%', '15%', '15%', '48%'],
        body: [
          [
            { text: 'Parameter', style: 'tableHeader' },
            { text: 'Type', style: 'tableHeader' },
            { text: 'Required', style: 'tableHeader' },
            { text: 'Description', style: 'tableHeader' },
          ],
          ['platform', 'string', 'Yes', 'Client platform: android or ios (lowercase)'],
          ['version', 'string', 'Yes', 'Installed app SemVer version (e.g. 2.4.0)'],
          ['appId', 'string', 'No', 'App flavor or identifier (e.g. com.oreedu.app)'],
        ],
      },
      margin: [0, 0, 0, 10],
    },

    { text: '2. JSON Response Contract', style: 'sectionHeader' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: JSON.stringify(
                {
                  platform: 'android',
                  currentVersion: '2.4.0',
                  minimumSupportedVersion: '2.5.0',
                  latestVersion: '2.6.0',
                  updateType: 'force',
                  updateRequired: true,
                  title: 'Update Required',
                  message: 'A new version of the app is required to continue using the service.',
                  storeUrl: 'https://play.google.com/store/apps/details?id=com.oreedu.app',
                  policyVersion: 2,
                  publishedAt: '2026-09-14T05:15:00.000Z',
                },
                null,
                2
              ),
              fillColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 8,
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 2, 0, 8],
    },

    { text: 'Understanding updateType Actions:', style: 'subSectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['20%', '20%', '60%'],
        body: [
          [
            { text: 'updateType', style: 'tableHeader' },
            { text: 'updateRequired', style: 'tableHeader' },
            { text: 'Flutter Client Action', style: 'tableHeader' },
          ],
          ['force', 'true', 'Block user with ForceUpdateScreen. Back button disabled. Only "Update Now" action.'],
          ['optional', 'false', 'Show optional update dialog ("Update" / "Later"). Allow user to continue.'],
          ['none', 'false', 'Installed version is up to date. Open normal app flow directly.'],
        ],
      },
      margin: [0, 0, 0, 10],
    },

    { text: '3. Flutter Client Implementation Requirements', style: 'sectionHeader' },
    {
      ul: [
        'Root Startup Gate: Check the endpoint before showing login or loading authenticated data.',
        'Back Button Disabled: Wrap ForceUpdateScreen in PopScope(canPop: false) to prevent bypassing.',
        'App Resume Re-check: Listen to AppLifecycleState.resumed to re-verify version when user returns from App Store.',
        'Fail-Open Fallback: Set a 5-second timeout. If network fails or offline, allow app entry without blocking.',
        'Store Redirect: Launch storeUrl using url_launcher with LaunchMode.externalApplication.',
      ],
      fontSize: 9,
      lineHeight: 1.25,
      margin: [0, 0, 0, 10],
    },

    { text: '4. Admin Management Portal', style: 'sectionHeader' },
    {
      ul: [
        'Accessible under Platform Settings -> App Updates (/mobile-updates).',
        'Independent version management for Android and iOS.',
        'Interactive live version tester with phone mockup simulator.',
        'Safety confirmation prompt before enabling Force Updates.',
      ],
      fontSize: 9,
      lineHeight: 1.25,
      margin: [0, 0, 0, 5],
    },
  ],
  styles: {
    header: {
      fontSize: 16,
      bold: true,
      color: '#0F172A',
      margin: [0, 0, 0, 3],
    },
    subheader: {
      fontSize: 9.5,
      color: '#64748B',
      margin: [0, 0, 0, 8],
    },
    sectionHeader: {
      fontSize: 11.5,
      bold: true,
      color: '#1E293B',
      margin: [0, 8, 0, 4],
    },
    subSectionHeader: {
      fontSize: 9.5,
      bold: true,
      color: '#334155',
      margin: [0, 4, 0, 3],
    },
    body: {
      fontSize: 9,
      color: '#334155',
      margin: [0, 0, 0, 3],
    },
    tableHeader: {
      bold: true,
      fontSize: 8.5,
      color: '#1E293B',
      fillColor: '#F1F5F9',
    },
  },
  defaultStyle: {
    font: 'Roboto',
    fontSize: 8.5,
  },
};

async function main() {
  const outputPath = path.join(__dirname, '../../docs/MOBILE_APP_UPDATE_DEVELOPER_GUIDE.pdf');
  const pdfDoc = await printer.createPdfKitDocument(docDefinition);

  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(outputPath, buffer);
    console.log('PDF generated successfully at:', outputPath);
  });
  pdfDoc.end();
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
});
