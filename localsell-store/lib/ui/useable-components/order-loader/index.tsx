import BrandLoader from "../brand-loader";
export default function OrderLoader({
  label = "Loading orders...",
}: {
  label?: string;
}) {
  return <BrandLoader label={label} />;
}
