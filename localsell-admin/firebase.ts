import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';
import { IFirebaseConfig } from './lib/utils/interfaces';

export const hasFirebaseMessagingConfig = (config: IFirebaseConfig): boolean =>
  [config.FIREBASE_KEY, config.FIREBASE_PROJECT_ID, config.FIREBASE_MSG_SENDER_ID, config.FIREBASE_APP_ID]
    .every((value) => Boolean(value?.trim()));

export const firebaseOptions = (config: IFirebaseConfig) => ({
  apiKey: config.FIREBASE_KEY,
  authDomain: config.FIREBASE_AUTH_DOMAIN,
  projectId: config.FIREBASE_PROJECT_ID,
  storageBucket: config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.FIREBASE_MSG_SENDER_ID,
  appId: config.FIREBASE_APP_ID,
  measurementId: config.FIREBASE_MEASUREMENT_ID,
});

export const initialize = (config: IFirebaseConfig): Messaging | null => {
  // Configuration loads asynchronously; unconfigured push is optional.
  if (!hasFirebaseMessagingConfig(config)) return null;

  try {
    // Check if Firebase App is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return getMessaging(existingApps[0]); // Use the first initialized app
    }

    const firebaseConfig = firebaseOptions(config);

    // Initialize Firebase
    const app: FirebaseApp = initializeApp(firebaseConfig);
    return getMessaging(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
};

export const isFirebaseSupported = async (): Promise<boolean> => {
  return await isSupported();
};
