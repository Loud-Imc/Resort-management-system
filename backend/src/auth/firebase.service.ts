import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private firebaseApp: admin.app.App;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            console.warn('Firebase configuration missing. Phone login will not work.');
            return;
        }

        this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }

    async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
        if (!this.firebaseApp) {
            console.error('Firebase verifyToken called but app not initialized');
            throw new Error('Firebase not initialized');
        }
        try {
            return await this.firebaseApp.auth().verifyIdToken(token);
        } catch (err) {
            console.error('Firebase Admin SDK verifyIdToken failed:', err.message);
            if (err.code) console.error('Error Code:', err.code);
            throw err;
        }
    }
}
