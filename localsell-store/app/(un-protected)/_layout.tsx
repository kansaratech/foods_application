// Providers
import { SoundProvider } from "@/lib/context/global/sound.context";
import { UserProvider } from "@/lib/context/global/user.context";
import { AuthContext } from "@/lib/context/global/auth.context";

// Expo
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";
import { ROUTES } from "@/lib/utils/constants";

export default function UnProtectedLayout() {
  const { isInitialized, token } = useContext(AuthContext);

  // Symmetric with (protected)/_layout's "no token -> go to login": once a
  // token exists, never sit on the login screen. This is what actually lands
  // the merchant in the app after signing in — useLogin's imperative
  // router.replace can fire before the token state has committed and get
  // bounced straight back here by the protected guard.
  if (isInitialized && token) {
    return <Redirect href={ROUTES.home} />;
  }

  return (
    <UserProvider>
      <SoundProvider>
        <>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack>
        </>
      </SoundProvider>
    </UserProvider>
  );
}
