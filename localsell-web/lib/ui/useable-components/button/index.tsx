// Interfaces
import { ICustomButtonProps } from "@/lib/utils/interfaces";

// Prime React
import { Button } from "primereact/button";
import { twMerge } from "tailwind-merge";

// Updated Component and use Tailwind Merge, because Overriding classes were not working perfectly.
//it will work same like before.

export default function CustomButton({
  className,
  label,
  type,
  loading,
  ...props
}: ICustomButtonProps) {
  return (
    <Button
      loading={loading}
      disabled={loading}
      // `text-white` is the default so a primary (blue) button is always
      // readable; any explicit `text-*` in `className` overrides it via twMerge.
      className={twMerge("shadow-none text-sm text-white", className)}
      // className={`${classes['btn-custom']} ${className}`}
      label={label}
      type={type}
      {...props}
    ></Button>
  );
}
