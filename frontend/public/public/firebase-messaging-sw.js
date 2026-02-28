importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBW1hmyujHvTfqQCgrXxdqNNAJlqlB8xUU",
    authDomain: "route-guide-1c9b0.firebaseapp.com",
    projectId: "route-guide-1c9b0",
    storageBucket: "route-guide-1c9b0.firebasestorage.app",
    messagingSenderId: "415345350429",
    appId: "1:415345350429:web:bbc902f5f2baf2d176b3f4",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
