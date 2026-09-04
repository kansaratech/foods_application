// LocalSell admin logo. Replace the files in /public/assets/brand/ to update it.

export function AppLogo() {
  return (
    <div className="flex items-center justify-center relative p-2">
      {/* light logo for light UI; the dark:hidden / hidden dark:block pair swaps on theme */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/localsell-logo.png"
        alt="LocalSell"
        className="block h-11 w-auto dark:hidden"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/localsell-logo-inverse.png"
        alt="LocalSell"
        className="hidden h-11 w-auto dark:block"
        draggable={false}
      />
    </div>
  );
}
