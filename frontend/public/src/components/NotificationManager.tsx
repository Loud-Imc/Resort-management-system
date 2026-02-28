import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function NotificationManager() {
    useEffect(() => {
        const setupNotifications = async () => {
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (!user || !token) return;

            try {
                // Request permission
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Get FCM Token
                    const fcmToken = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // User needs to provide this
                    });

                    if (fcmToken) {
                        // Send to backend
                        await axios.patch(`${API_URL}/users/profile`, { fcmToken }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        console.log('FCM Token registered successfully');
                    }
                }
            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupNotifications();

        // Listen for foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            toast(payload.notification?.body || 'New notification', {
                icon: '🔔',
                duration: 5000,
            });
        });

        return () => unsubscribe();
    }, []);

    return null;
}
