/* eslint-disable react-hooks/exhaustive-deps */
'use client';

// Core
import { useEffect } from 'react';
import { initialize, isFirebaseSupported, hasFirebaseMessagingConfig, firebaseOptions } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';

// Context

// Components
import AppTopbar from '@/lib/ui/screen-components/protected/layout/super-admin-layout/app-bar';
import SuperAdminSidebar from '@/lib/ui/screen-components/protected/layout/super-admin-layout/side-bar';

// Interface
import { IProvider } from '@/lib/utils/interfaces';

// Hooks
import { useUserContext } from '@/lib/hooks/useUser';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// GraphQl
import { UPLOAD_TOKEN } from '@/lib/api/graphql/queries/token';
import { useApolloClient } from '@apollo/client';

const Layout = ({ children }: IProvider) => {
  // Context

  // Hooks
  const client = useApolloClient();
  const { user } = useUserContext();
  const {
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_KEY,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MSG_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID,
    FIREBASE_VAPID_KEY,
  } = useConfiguration();

  // Push is optional and can only start once configuration has loaded.
  useEffect(() => {
    const config = {
      FIREBASE_AUTH_DOMAIN, FIREBASE_KEY, FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET, FIREBASE_MSG_SENDER_ID, FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID,
    };
    if (!user || !hasFirebaseMessagingConfig(config) || !FIREBASE_VAPID_KEY?.trim()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const initializeFirebase = async () => {
      if (!(await isFirebaseSupported()) || cancelled) return;
      const messaging = initialize(config);
      if (!messaging) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted' || cancelled) return;

      // Use the configured project and a separate scope so FCM cannot replace
      // the PWA worker registered at the app root.
      const workerUrl = '/firebase-messaging-sw.js?config=' +
        encodeURIComponent(JSON.stringify(firebaseOptions(config)));
      const registration = await navigator.serviceWorker.register(workerUrl, {
        scope: '/firebase-cloud-messaging-push-scope',
      });
      if (cancelled) return;
      const token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (cancelled) return;
      if (token) {
        localStorage.setItem('messaging-token', token);
        await client.mutate({
          mutation: UPLOAD_TOKEN,
          variables: { id: user.userId, pushToken: token },
        });
      }
      if (cancelled) return;
      unsubscribe = onMessage(messaging, (payload) => {
        if (!payload.notification) return;
        const { title, body } = payload.notification;
        const notification = new Notification(title ?? '', { body });
        notification.onclick = () => window.open('/home', '_blank');
      });
    };
    void initializeFirebase().catch((error) => {
      if (!cancelled) console.error('Push notification setup failed:', error);
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [user, client, FIREBASE_AUTH_DOMAIN, FIREBASE_KEY, FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET, FIREBASE_MSG_SENDER_ID, FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID, FIREBASE_VAPID_KEY]);

  return (
    <div className="layout-main bg-white dark:bg-dark-950 dark:text-white">
      <div className="layout-top-container">
        <AppTopbar />
      </div>
      <div className="layout-main-container">
        <div className="layout-sidebar relative left-0 z-50">
          <SuperAdminSidebar />
        </div>
        <div className="layout-content dark:bg-dark-950">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
