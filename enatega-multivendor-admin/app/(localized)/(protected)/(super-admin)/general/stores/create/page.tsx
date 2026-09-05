'use client';

import { Suspense } from 'react';
import RestaurantsForm from '@/lib/ui/screen-components/protected/super-admin/restaurants/add-form';

export default function CreateStorePage() {
  // RestaurantsForm reads ?vendorId= via useSearchParams — Next.js requires
  // that behind a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RestaurantsForm />
    </Suspense>
  );
}
