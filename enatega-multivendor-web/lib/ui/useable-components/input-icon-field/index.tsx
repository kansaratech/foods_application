"use client";

// Interfaces
import { IIconTextFieldProps } from "@/lib/utils/interfaces";

// Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Prime React
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";

// Utilities
import { twMerge } from "tailwind-merge";

// Components
import InputSkeleton from "../custom-skeletons/inputfield.skeleton";

// Styles

export default function CustomIconTextField({
  className,
  iconProperties,
  placeholder,
  showLabel,
  isLoading = false,
  ...props
}: IIconTextFieldProps) {
  const { icon, position, style } = iconProperties;

  return !isLoading ?
      <div className="flex w-full flex-col gap-y-1">
        {showLabel && (
          <label htmlFor="username" className="text-sm font-[500]">
            {placeholder}
          </label>
        )}
        {/* InputIcon + InputText must be IconField's direct children — it clones
            them to inject `iconPosition`; a wrapper here leaks the prop to the DOM. */}
        <IconField iconPosition={position} className="w-full">
          <InputIcon style={style}>
            <FontAwesomeIcon icon={icon} />
          </InputIcon>
          <InputText
            className={twMerge(
              `h-10 w-full rounded-lg border border-gray-300 px-2 text-sm focus:shadow-none focus:outline-none`,
              className
            )}
            placeholder={placeholder}
            {...props}
          />
        </IconField>
      </div>
    : <InputSkeleton showLabel={showLabel} />;
}
