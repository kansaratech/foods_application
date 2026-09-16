import BrandLoader from "../brand-loader";
import { CustomProgressIndicatorComponentProps } from "@/lib/utils/interfaces";
export default function CustomLoader({
  size = "24px",
}: CustomProgressIndicatorComponentProps) {
  return <BrandLoader variant="inline" size={size} />;
}
