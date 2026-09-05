'use client';

// Interfaces
import { IIconTextFieldProps } from '@/lib/utils/interfaces';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Prime React
import { InputText } from 'primereact/inputtext';

// Utilities
import { twMerge } from 'tailwind-merge';

// Components
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';

export default function CustomIconTextField({
  className,
  iconProperties,
  placeholder,
  showLabel,
  isLoading = false,
  name,
  error,
  ...props
}: IIconTextFieldProps) {
  const { icon, position, style } = iconProperties;
  const errorId = error ? `${name}-error` : undefined;
  const isLeft = position === 'left';

  return !isLoading ? (
    <div className="flex flex-col gap-y-1">
      {showLabel && (
        <label htmlFor={name} className="text-sm font-[500]">
          {placeholder}
        </label>
      )}
      {/* A plain relatively-positioned wrapper with an absolutely-centered
          icon — simpler and more reliable than PrimeReact's IconField/InputIcon,
          which (on this PrimeReact version, with this theme) doesn't reliably
          center the icon vertically. */}
      <div className="relative flex items-center">
        <span
          aria-hidden
          style={style}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isLeft ? 'left-3' : 'right-3'}`}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
        <InputText
          id={name}
          name={name}
          className={twMerge(
            `h-10 w-full rounded-lg border px-2 text-sm focus:shadow-none focus:outline-none`,
            isLeft ? 'pl-9' : 'pr-9',
            error ? 'border-red-500' : 'border-gray-300',
            className
          )}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
      </div>
      {error && <p id={errorId} className="text-sm text-red-500">{error}</p>}
    </div>
  ) : (
    <InputSkeleton />
  );
}
