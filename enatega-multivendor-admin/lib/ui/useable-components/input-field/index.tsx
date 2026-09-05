// Interfaces
import { ITextFieldProps } from '@/lib/utils/interfaces';

// Prime React
import { InputText } from 'primereact/inputtext';
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';

export default function CustomTextField({
  className,
  placeholder,
  showLabel,
  isLoading = false,
  error,
  name,
  ...props
}: ITextFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return !isLoading ? (
    <div className={`flex w-full flex-col justify-center gap-y-1`}>
      {showLabel && (
        <label htmlFor={name} className="text-sm font-[500] dark:text-white">
          {placeholder}
        </label>
      )}

      <InputText
        id={name}
        name={name}
        className={`h-10 w-full rounded-lg border ${error? 'border-red-500': 'border-gray-300'} dark:text-white  px-2 text-sm focus:shadow-none focus:outline-none ${className}`}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />
      {error && <p id={errorId} className="text-sm text-red-500">{error}</p>}
    </div>
  ) : (
    <InputSkeleton />
  );
}
