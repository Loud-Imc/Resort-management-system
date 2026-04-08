import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';
import api from '../services/api';
import toast from 'react-hot-toast';


export default function NotificationManager() {
    const location = useLocation();
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        const handleStorage = () => {
            setToken(localStorage.getItem('token'));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        const setupNotifications = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr || !token || !messaging) return; // Skip if messaging not supported

            try {
                // Request permission
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Get FCM Token
                    const fcmToken = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                    });

                    if (fcmToken) {
                        // Send to backend
                        await api.patch('/users/me', { fcmToken });
                        console.log('FCM Token registered successfully');
                    }
                }
            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupNotifications();

        // Listen for foreground messages (only if messaging is supported)
        if (!messaging) return;
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            toast(payload.notification?.body || 'New notification', {
                icon: '🔔',
                duration: 5000,
            });
        });

        return () => unsubscribe();
    }, [token, location.pathname]);

    return null;
}
