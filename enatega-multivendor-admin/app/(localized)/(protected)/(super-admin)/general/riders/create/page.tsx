'use client';
// Core
import { Suspense } from 'react';
// Screens
import RiderRegistrationScreen from '@/lib/ui/screens/super-admin/general/rider-registration';

export default function AddRiderPage() {
  // RiderRegistrationScreen reads `?id=` via useSearchParams to switch into
  // edit mode — Next.js requires that behind a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RiderRegistrationScreen />
    </Suspense>
  );
}
