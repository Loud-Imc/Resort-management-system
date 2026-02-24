require('dotenv').config();
const admin = require('firebase-admin');

async function testFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('Private Key length:', privateKey?.length || 0);

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing configuration variables');
        process.exit(1);
    }

    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log('Successfully initialized Firebase Admin app');

        // Try to get auth instance
        const auth = app.auth();
        console.log('Successfully retrieved Auth instance');

        process.exit(0);
    } catch (err) {
        console.error('Initialization Error:', err.message);
        process.exit(1);
    }
}

testFirebase();
