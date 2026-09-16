import { CSSProperties } from "react";
import BrandLoader from "@/lib/ui/useable-components/brand-loader";
export default function Loader({
  message,
  style,
}: {
  message?: string;
  style?: CSSProperties;
}) {
  return (
    <BrandLoader
      variant={style ? "inline" : "page"}
      label={message}
      size={style?.width ?? 24}
      style={style}
    />
  );
}
