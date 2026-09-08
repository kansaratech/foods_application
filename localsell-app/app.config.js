module.exports = () => {
  // Google Maps key. Maps SDK keys always ship inside the app binary, so restrict
  // the LocalSell key by Android package + signing SHA-1 and by iOS bundle id in
  // the Google Cloud console. Local release builds inject the real key via
  // `.env.production` (see APP_BUILD_PLAN.md §3); the placeholder below only keeps
  // `expo prebuild` from failing when no env is present.
  const DEFAULT_GOOGLE_MAPS_KEY = 'REPLACE_WITH_LOCALSELL_MAPS_KEY'
  const iosGoogleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS || DEFAULT_GOOGLE_MAPS_KEY
  const androidGoogleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || DEFAULT_GOOGLE_MAPS_KEY
  const reversedGoogleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID

  const fallbackUrlTypes = [
    {
      // Reversed iOS OAuth client id (Google Cloud project localsell, client
      // "LocalSell Customer (iOS)"). `.env.production` overrides via
      // EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID; this keeps prebuild working
      // without env.
      CFBundleURLSchemes: [
        'com.googleusercontent.apps.399972178830-hrdsfr2hfiuoogmfol6fffkpd0b4r63f'
      ]
    }
  ]

  const googleUrlTypes = reversedGoogleIosClientId
    ? [
        {
          CFBundleURLSchemes: [reversedGoogleIosClientId]
        }
      ]
    : fallbackUrlTypes
  const urlTypes = [
    ...googleUrlTypes,
    { CFBundleURLSchemes: ['localsell'] }
  ]

  return {
    name: 'LocalSell',
    scheme: 'localsell',
    version: '1.0.0',
    description:
      'LocalSell — order from the shops and restaurants around you. Shop Local. Find More.',
    slug: 'localsell-customer',
    androidStatusBar: {
      backgroundColor: '#16293f'
    },
    // Native OS splash (before JS boots) is theme-aware via the
    // expo-splash-screen plugin below — a solid per-theme background that
    // matches AnimatedSplash's first frame, so there is no black/white flash.
    platforms: ['ios', 'android', 'web'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    assetBundlePatterns: ['**/*'],
    userInterfaceStyle: 'automatic',
    ios: {
      entitlements: {
        'com.apple.developer.networking.wifi-info': true,
        'com.apple.developer.usernotifications.time-sensitive': true,
        'com.apple.security.application-groups': [
          'group.in.localsell.customer.shared'
        ],
        // Use the production APNs gateway for production builds so push
        // notifications are not silently rejected on App Store devices (SEC-013).
        'aps-environment':
          process.env.APP_ENV === 'production' ? 'production' : 'development'
      },
      supportsTablet: true,
      userInterfaceStyle: 'automatic',
      bundleIdentifier: 'in.localsell.customer',
      icon: './assets/icon.png',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSSupportsLiveActivities: true,
        NSLocationWhenInUseUsageDescription:
          'Allow $(PRODUCT_NAME) to use location to determine the delivery address for your orders.',
        UIBackgroundModes: ['remote-notification'],
        NSUserTrackingUsageDescription:
          'Allow this app to collect app-related data that can be used for tracking you or your device.',
        CFBundleURLTypes: urlTypes,
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {})
      },
      usesAppleSignIn: true,
      // TODO(localsell): LocalSell Apple Developer Team ID — see APP_BUILD_PLAN.md §3.
      appleTeamId: process.env.APPLE_TEAM_ID || 'REPLACE_WITH_LOCALSELL_APPLE_TEAM_ID'
    },
    notification: {
      iosDisplayInForeground: true,
      color: '#1c5bc7',
      icon: './assets/not-icon.png',
      androidMode: 'default',
      androidCollapsedTitle: 'LocalSell'
    },
    android: {
      versionCode: 1,
      package: 'in.localsell.customer',
      userInterfaceStyle: 'automatic',
      // Disable ADB/cloud backups so the AsyncStorage DB (JWT) can't be pulled
      // off a connected device without root (SEC-002).
      allowBackup: false,
      googleServicesFile: './google-services.json',
      config: {
        ...(androidGoogleMapsApiKey
          ? {
              googleMaps: {
                apiKey: androidGoogleMapsApiKey
              }
            }
          : {})
      },
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
        'android.permission.POST_NOTIFICATIONS'
      ],
      // Strip dangerous permissions that no feature uses and that library
      // transitive manifests can pull in (tapjacking / broad storage) (SEC-006).
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.WRITE_EXTERNAL_STORAGE'
      ],
      icon: './assets/appIcon.png',
      queries: {
        packages: ['com.whatsapp', 'com.whatsapp.w4b']
      },
      intentFilters: [
        {
          action: 'android.intent.action.VIEW',
          data: [
            {
              scheme: 'whatsapp'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      }
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          // Solid per-theme background, no visible logo. The plugin requires an
          // image to generate the native splashscreen_logo drawable, so we pass
          // a 1x1 transparent PNG — only the background color shows. The animated
          // pin / wordmark is drawn by the JS AnimatedSplash component, whose
          // first frame uses these same colors so the handoff shows no flash.
          backgroundColor: '#16293f', // light (LocalSell navy)
          image: './assets/splashTransparent.png',
          imageWidth: 1,
          resizeMode: 'contain',
          dark: {
            backgroundColor: '#0e1b2b', // dark
            image: './assets/splashTransparent.png'
          }
        }
      ],
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission:
            'Allow this app to collect app-related data that can be used for tracking you or your device.'
        }
      ],
      'expo-updates',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow LocalSell to use your location.'
        }
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static'
          }
        }
      ],
      './plugins/with-firebase-notification-color',
      'expo-notifications',
      'expo-font',
      'expo-secure-store',
      'expo-localization',
      'expo-web-browser',
      'expo-video',
      'expo-apple-authentication',
      './plugins/with-rider-call-handler',
      '@bacons/apple-targets',
      // Xcode 26 / clang fmt consteval build fix (see plugins/withFmtConstevalFix.js)
      './plugins/withFmtConstevalFix'
    ],
    extra: {
      liveActivity: {
        appGroupId: 'group.in.localsell.customer.shared',
        appScheme: 'localsell',
        brandName: 'LocalSell',
        primaryColor: '#1c5bc7',
        accentColor: '#FFA921',
        // Internal Xcode asset-catalog names (targets/widget/Assets.xcassets) —
        // not identifiers; renaming is a separate brand-asset task.
        logoResourceName: 'enatega_logo',
        riderResourceName: 'enatega_rider'
      }
    },
    runtimeVersion: {
      policy: 'appVersion'
    }
  }
}
