import { DirectionProvider } from "@/lib/context/direction/DirectionContext";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";
import { DirectionHandler } from "@/lib/ui/layouts/global/rtl/DirectionHandler";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  pageMetadata,
} from "@/lib/seo/metadata";

const defaultPageMetadata = pageMetadata({
  title: "Shop Local. Find More.",
  description: SITE_DESCRIPTION,
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: defaultPageMetadata.title,
  description: SITE_DESCRIPTION,
  openGraph: defaultPageMetadata.openGraph,
  twitter: defaultPageMetadata.twitter,
  robots: defaultPageMetadata.robots,
  authors: [{ name: "Maekotech Solutions LLP", url: SITE_URL }],
  creator: SITE_NAME,
  publisher: "Maekotech Solutions LLP",
  category: "shopping",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: false },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c5bc7",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const rtlLocales = ["ar", "hr", "fa", "ur"];
  const baseLocale = locale.split("-")[0];
  const dir =
    rtlLocales.includes(locale) || rtlLocales.includes(baseLocale)
      ? "rtl"
      : "ltr";
  //Providing all messages to the client
  //side is the easiest way to get started

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Inline theme script to prevent flash of wrong theme */}
        <Script id="theme-flash-prevention" strategy="beforeInteractive">
          {`
            (function() {
              const theme = localStorage.getItem("theme");
              if (theme === "dark") {
                document.documentElement.classList.add("dark");
              } else {
                document.documentElement.classList.remove("dark");
              }
            })();
          `}
        </Script>
        <Script
          src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"
          strategy="beforeInteractive"
        />

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "tjqw9wn955");
          `}
        </Script>

        <meta name="mobile-web-app-capable" content="yes" />

        {/* Apple splash screen for specific device */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screen.png"
          media="(device-width: 390px) and (device-height: 844px)
          and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        {/* Add more media queries for other device sizes if needed */}
      </head>
      <body className={dir === "rtl" ? "rtl" : ""} suppressHydrationWarning>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <DirectionProvider dir={dir}>
              <DirectionHandler />
              {children}
            </DirectionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
