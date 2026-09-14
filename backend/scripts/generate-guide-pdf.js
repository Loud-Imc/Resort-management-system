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

const dartModelCode = `enum UpdateType { none, optional, force }

class AppUpdateConfig {
  final String platform;
  final String currentVersion;
  final String minimumSupportedVersion;
  final String latestVersion;
  final UpdateType updateType;
  final bool updateRequired;
  final String title;
  final String message;
  final String storeUrl;
  final int policyVersion;

  AppUpdateConfig({
    required this.platform,
    required this.currentVersion,
    required this.minimumSupportedVersion,
    required this.latestVersion,
    required this.updateType,
    required this.updateRequired,
    required this.title,
    required this.message,
    required this.storeUrl,
    required this.policyVersion,
  });

  factory AppUpdateConfig.fromJson(Map<String, dynamic> json) {
    UpdateType parseType(String? type) {
      switch (type?.toLowerCase()) {
        case 'force': return UpdateType.force;
        case 'optional': return UpdateType.optional;
        default: return UpdateType.none;
      }
    }

    return AppUpdateConfig(
      platform: json['platform'] ?? '',
      currentVersion: json['currentVersion'] ?? '',
      minimumSupportedVersion: json['minimumSupportedVersion'] ?? '1.0.0',
      latestVersion: json['latestVersion'] ?? '1.0.0',
      updateType: parseType(json['updateType']),
      updateRequired: json['updateRequired'] ?? false,
      title: json['title'] ?? 'Update Required',
      message: json['message'] ?? 'A new version of the app is available.',
      storeUrl: json['storeUrl'] ?? '',
      policyVersion: json['policyVersion'] ?? 1,
    );
  }
}`;

const storeLauncherCode = `import 'package:url_launcher/url_launcher.dart';

Future<void> openStore(String url) async {
  if (url.isEmpty) return;
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}`;

const docDefinition = {
  pageSize: 'A4',
  pageMargins: [40, 40, 40, 40],
  content: [
    // Header
    { text: 'Flutter Mobile Developer Handover Guide', style: 'mainTitle' },
    { text: 'Remote Mandatory & Optional App Update Integration', style: 'subTitle' },
    { text: 'Status: Implemented & Live on Dev Backend  |  API Version: v1', style: 'metaInfo' },
    
    // Callout Box
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'Core Architectural Principle: The backend owns and evaluates the update policy rules; the Flutter mobile application enforces and presents them. No minimum versions should be hard-coded in the mobile app binary. Operations and product teams remotely control version enforcement from the Admin Portal.',
              fillColor: '#EEF2FF',
              margin: [10, 8, 10, 8],
              fontSize: 9.5,
              color: '#3730A3',
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 8, 0, 14],
    },

    // Section 1
    { text: '1. Public API Endpoint (No Authentication Required)', style: 'sectionHeader' },
    { text: 'Call this endpoint during Flutter app startup and whenever the application resumes from the background:', style: 'body' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'GET /api/v1/app/update-config?platform=android&version=2.4.0\n(Alias: GET /api/app/update-config)',
              fillColor: '#0F172A',
              color: '#38BDF8',
              fontSize: 9.5,
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 4, 0, 8],
    },

    { text: 'Request Parameters:', style: 'subSectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['20%', '15%', '15%', '50%'],
        body: [
          [
            { text: 'Parameter', style: 'tableHeader' },
            { text: 'Type', style: 'tableHeader' },
            { text: 'Required', style: 'tableHeader' },
            { text: 'Description', style: 'tableHeader' },
          ],
          ['platform', 'string', 'Yes', 'Client operating system: "android" or "ios" (lowercase)'],
          ['version', 'string', 'Yes', 'Installed Flutter app SemVer string from package_info_plus (e.g. "2.4.0")'],
          ['appId', 'string', 'No', 'Application flavor or bundle identifier (e.g. "com.oreedu.app")'],
        ],
      },
      margin: [0, 0, 0, 12],
    },

    // Section 2
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
              fontSize: 8.5,
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 4, 0, 8],
    },

    { text: 'Understanding updateType Actions:', style: 'subSectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['18%', '18%', '64%'],
        body: [
          [
            { text: 'updateType', style: 'tableHeader' },
            { text: 'updateRequired', style: 'tableHeader' },
            { text: 'Flutter Client Action', style: 'tableHeader' },
          ],
          ['force', 'true', 'Block user completely. Display ForceUpdateScreen with back button disabled. Tapping "Update Now" opens storeUrl.'],
          ['optional', 'false', 'Display optional update popup with "Update" and "Later" buttons. Allow user to continue into app.'],
          ['none', 'false', 'Installed version is supported and up to date. Open normal application flow immediately.'],
        ],
      },
      margin: [0, 0, 0, 14],
    },

    // Section 3
    { text: '3. Flutter Client Implementation Requirements', style: 'sectionHeader' },
    {
      ol: [
        'Root Startup Gate: Execute update verification before displaying login or loading authenticated application routes.',
        'No Back-Button Bypass: Wrap ForceUpdateScreen in PopScope(canPop: false) (or WillPopScope) to prevent Android physical back button dismissal.',
        'Lifecycle Awareness (App Resume Check): Use WidgetsBindingObserver to detect AppLifecycleState.resumed. When the user returns from Google Play / App Store after updating, re-run the update check to automatically unlock the app.',
        'Fail-Open Safety Strategy: Set a 5-second HTTP timeout. If network is unavailable or backend times out, fallback to locally cached policy or allow normal entry (never leave user stuck on splash screen).',
        'Store Launching: Use url_launcher with LaunchMode.externalApplication to open the dynamic storeUrl returned in the response.',
        'Deep Link Protection: Ensure deep links (e.g. push notifications) pass through the update gate before rendering target screens.',
      ],
      fontSize: 9,
      lineHeight: 1.3,
      margin: [0, 0, 0, 14],
    },

    // Section 4 (Page break for clean code presentation)
    { text: '4. Complete Dart Data Model Snippet', style: 'sectionHeader', pageBreak: 'before' },
    { text: 'Recommended implementation file: lib/core/app_update/app_update_config.dart', style: 'body' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: dartModelCode,
              fillColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 8,
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 4, 0, 12],
    },

    // Section 5
    { text: '5. Store Launcher Helper', style: 'sectionHeader' },
    { text: 'Recommended implementation file: lib/core/app_update/store_launcher.dart', style: 'body' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: storeLauncherCode,
              fillColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 8,
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 4, 0, 12],
    },

    // Section 6
    { text: '6. Admin Portal Controls & Workflows', style: 'sectionHeader' },
    { text: 'The operations and release management teams control update policies via the Admin Portal at /mobile-updates:', style: 'body' },
    {
      ul: [
        'Platform-Specific Tabs: Android and iOS have completely independent version rules and store URLs.',
        'Version Management: Set Minimum Supported Version (e.g. 2.5.0) and Latest Released Version (e.g. 2.6.0).',
        'Enforcement Modes: Switch between None, Optional, and Force Update.',
        'Dynamic Messaging: Customize user-facing dialog title and description without code changes.',
        'Interactive Live Simulator: Built-in tester lets admins test any version number and preview the exact response and phone screen mockup.',
        'Safety Confirmation Prompt: Prevents accidental lockouts by requiring confirmation that new builds are live on store before publishing a force update.',
      ],
      fontSize: 9,
      lineHeight: 1.3,
      margin: [0, 0, 0, 12],
    },

    // Section 7
    { text: '7. Integration Checklist for Flutter Developer', style: 'sectionHeader' },
    {
      ul: [
        '[ ] Add package_info_plus and url_launcher dependencies in pubspec.yaml',
        '[ ] Implement AppUpdateConfig model and JSON parsing',
        '[ ] Create AppUpdateService to call GET /api/v1/app/update-config',
        '[ ] Build ForceUpdateScreen (back button disabled, "Update Now" button only)',
        '[ ] Build OptionalUpdateDialog ("Update" and "Later" buttons)',
        '[ ] Register WidgetsBindingObserver to re-evaluate policy on AppLifecycleState.resumed',
        '[ ] Implement 5-second timeout and offline fail-open fallback',
        '[ ] Test with ?platform=android&version=0.9.0 (verify Force Update screen triggers)',
        '[ ] Test with ?platform=android&version=2.6.0 (verify Allowed seamless entry)',
      ],
      fontSize: 9,
      lineHeight: 1.3,
      margin: [0, 0, 0, 10],
    },
  ],
  footer: (currentPage, pageCount) => {
    return {
      text: `Page ${currentPage} of ${pageCount}  |  Remote App Update Developer Handover Guide`,
      style: 'footerText',
      alignment: 'center',
      margin: [0, 10, 0, 0],
    };
  },
  styles: {
    mainTitle: {
      fontSize: 18,
      bold: true,
      color: '#0F172A',
      margin: [0, 0, 0, 2],
    },
    subTitle: {
      fontSize: 12,
      bold: true,
      color: '#4F46E5',
      margin: [0, 0, 0, 2],
    },
    metaInfo: {
      fontSize: 9,
      color: '#64748B',
      margin: [0, 0, 0, 6],
    },
    sectionHeader: {
      fontSize: 12,
      bold: true,
      color: '#0F172A',
      margin: [0, 10, 0, 4],
    },
    subSectionHeader: {
      fontSize: 9.5,
      bold: true,
      color: '#334155',
      margin: [0, 6, 0, 3],
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
    footerText: {
      fontSize: 8,
      color: '#94A3B8',
    },
  },
  defaultStyle: {
    font: 'Roboto',
    fontSize: 9,
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
    console.log('Complete PDF generated successfully at:', outputPath);
  });
  pdfDoc.end();
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
});
