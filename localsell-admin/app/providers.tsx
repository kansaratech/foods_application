'use client';

import { ApolloProvider } from '@apollo/client';
import { PrimeReactProvider } from 'primereact/api';
import { ThemeProvider } from 'next-themes';

import { ConfigurationProvider } from '@/lib/context/global/configuration.context';
import { LayoutProvider } from '@/lib/context/global/layout.context';
import { SidebarProvider } from '@/lib/context/global/sidebar.context';
import { ToastProvider } from '@/lib/context/global/toast.context';
import { UserProvider } from '@/lib/context/global/user-context';
import { useSetupApollo } from '@/lib/hooks/useSetApollo';

/**
 * Single client-side provider tree for the whole app.
 *
 * `next-themes` toggles `class="dark"` on <html>; that one class drives the
 * PrimeReact dark theme (prime-dark.generated.css), the design tokens
 * (theme-tokens.css) and every Tailwind `dark:` variant.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const client = useSetupApollo();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PrimeReactProvider value={{ ripple: true }}>
        <ApolloProvider client={client}>
          <ConfigurationProvider>
            <LayoutProvider>
              <UserProvider>
                <SidebarProvider>
                  <ToastProvider>{children}</ToastProvider>
                </SidebarProvider>
              </UserProvider>
            </LayoutProvider>
          </ConfigurationProvider>
        </ApolloProvider>
      </PrimeReactProvider>
    </ThemeProvider>
  );
}
