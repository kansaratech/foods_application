import CustomSpinner from "./custom-spinner";
import { ISpinnerComponentProps } from "@/lib/utils/interfaces";
export default function SpinnerComponent({
  color,
  width,
  height,
}: ISpinnerComponentProps) {
  return <CustomSpinner color={color} size={width ?? height ?? 24} />;
}
