'use client';
// Core
import { Suspense } from 'react';
// Screens
import VendorRegistrationScreen from '@/lib/ui/screens/super-admin/general/vendor-registration';

export default function AddVendorPage() {
  // VendorRegistrationScreen reads `?id=` via useSearchParams to switch into
  // edit mode — Next.js requires that behind a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <VendorRegistrationScreen />
    </Suspense>
  );
}
