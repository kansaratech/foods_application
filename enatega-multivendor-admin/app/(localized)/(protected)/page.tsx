'use client';

// Core
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Hooks and Constants
import { useUserContext } from '@/lib/hooks/useUser';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';

export default function RootPage() {
  // Hooks
  const router = useRouter();
  const { user, loading, isSessionVerified } = useUserContext();

  useEffect(() => {
    if (loading) return;

    if (!isSessionVerified || !user) {
      router.replace('/authentication/login');
      return;
    }

    router.replace(
      DEFAULT_ROUTES[user.userType] ?? '/authentication/login'
    );
  }, [isSessionVerified, loading, router, user]);

  return <CustomLoader />;
}
