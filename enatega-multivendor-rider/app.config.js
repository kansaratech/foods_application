// Google Maps key. Restrict it by Android app signature + iOS bundle id and by
// API in the Google Cloud console — Maps SDK keys always ship inside the app
// binary, so a literal fallback here is safe and guarantees the native
// AndroidManifest / Info.plist always gets a key even when .env is absent
// (e.g. on EAS Build servers).
const DEFAULT_GOOGLE_MAPS_KEY = 'AIzaSyByQslS8CFpwauY6LgcfOqdhWUohLRYN-Q'
const iosGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ||
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  DEFAULT_GOOGLE_MAPS_KEY
const androidGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.ANDROID_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  DEFAULT_GOOGLE_MAPS_KEY

module.exports = {
  expo: {
    name: 'LocalSell Rider',
    description:
      'LocalSell Rider — the delivery partner app for LocalSell. Shop Local. Find More.',
    version: '1.1.87',
    slug: 'food-delivery-rider-multivendor',
    orientation: 'portrait',
    icon: './lib/assets/images/icon.png',
    assetBundlePatterns: ['lib/assets/**/*'],
    scheme: 'com.enatega.multirider',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          // Solid per-theme background, no visible logo. The plugin requires an
          // image to generate the native splashscreen_logo drawable, so we pass
          // a 1x1 transparent PNG — only the background color shows. The animated
          // pin / wordmark is drawn by the JS AnimatedSplash component, whose
          // first frame uses these same colors so the handoff shows no flash.
          backgroundColor: '#16293f', // light (LocalSell navy)
          image: './lib/assets/images/splashTransparent.png',
          imageWidth: 1,
          resizeMode: 'contain',
          dark: {
            backgroundColor: '#0e1b2b', // dark
            image: './lib/assets/images/splashTransparent.png'
          }
        }
      ],
      // Sentry Expo plugin removed: it forces a source-map upload during the
      // release build which needs SENTRY_AUTH_TOKEN (org "ninjas-code" — not
      // ours). Runtime Sentry init in app/_layout.tsx stays and no-ops when
      // unconfigured.
      [
        'expo-image-picker',
        {
          photosPermission:
            'The app accesses your photos for license, vehicle plate and profile image. Please allow these to continue using the app.'
        }
      ],
      'expo-font',
      'expo-secure-store'
    ],
    platforms: ['ios', 'android', 'web'],
    web: {
      bundler: 'metro'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.enatega.multirider',
      config: {
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {})
      },
      icon: './lib/assets/images/icon.png',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '$(PRODUCT_NAME) uses your location for features like finding orders nearby and tracking customer orders!',
        UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      versionCode: 87,
      googleServicesFile: './google-services.json',
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      config: {
        googleMaps: {
          ...(androidGoogleMapsApiKey ? { apiKey: androidGoogleMapsApiKey } : {})
        }
      },
      package: 'com.enatega.multirider',
      icon: './lib/assets/images/appIcon.png',
      adaptiveIcon: {
        foregroundImage: './lib/assets/images/appIcon.png',
        backgroundColor: '#FFFFFF'
      }
    },
    owner: 'kkansara21',
    extra: {
      eas: {
        projectId: 'b7634414-d235-4610-8dad-13ff2bca9b2d'
      }
    },
    experiments: {
      typedRoutes: true
    }
  }
}
