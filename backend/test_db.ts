import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    console.log('--- Database Connection Diagnostic ---');
    console.log('CWD:', process.cwd());
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

    if (process.env.DATABASE_URL) {
        const url = process.env.DATABASE_URL;
        const maskedUrl = url.replace(/:([^@]+)@/, ':****@');
        console.log('DATABASE_URL (masked):', maskedUrl);
    }

    const prisma = new PrismaClient();
    try {
        console.log('Attempting to connect to database...');
        await prisma.$connect();
        console.log('✅ Success! Connected to database.');

        const userCount = await prisma.user.count();
        console.log('✅ Success! Found', userCount, 'users.');
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Code:', error.code);
        console.error('Message:', error.message);

        if (error.code === 'P1000') {
            console.log('\n--- Troubleshooting P1000 ---');
            console.log('1. Verify the password in .env matches the database.');
            console.log('2. Ensure special characters in password are percent-encoded.');
            console.log('3. Wrap the DATABASE_URL in double quotes in your .env file.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
