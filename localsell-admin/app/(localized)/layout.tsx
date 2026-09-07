// The `(localized)` route group no longer owns document structure or providers —
// <html>/<body>, styles and the provider tree all live in the root layout.
// This passthrough is kept only so the route group has a layout boundary.
export default function LocalizedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
