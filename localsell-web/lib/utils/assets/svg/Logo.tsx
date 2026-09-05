// components/Logo.tsx
// LocalSell wordmark. Swap the files in /public/assets/brand/ to update the logo everywhere.

import { useTheme } from "@/lib/providers/ThemeProvider";

const isLightColor = (c?: string) => {
  if (!c) return false;
  const v = c.trim().toLowerCase().replace(/^#/, "");
  return v === "fff" || v === "ffffff" || v === "ffffffff" || v === "white";
};

const Logo = ({
  fillColor = "#000000",
  darkmode = "#ffffffff",
  className = "h-10 w-auto md:h-12",
}: {
  fillColor?: string;
  darkmode?: string;
  className?: string;
}) => {
  const { theme } = useTheme();

  // Use the light-on-dark (inverse) logo when placed on a dark surface:
  // an explicitly light fillColor (e.g. the footer) or dark theme.
  const inverse = isLightColor(fillColor) || (theme === "dark" && isLightColor(darkmode));
  const src = inverse
    ? "/assets/brand/localsell-logo-inverse.png"
    : "/assets/brand/localsell-logo.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="LocalSell"
      className={className}
      draggable={false}
    />
  );
};

export default Logo;
