import { ICustomInputSwitchComponentProps } from '@/lib/utils/interfaces';
import CustomLoader from '../custom-progress-indicator';

export default function CustomInputSwitch({
  loading,
  isActive,
  label,
  onChange,
  reverse = false,
  className,
}: ICustomInputSwitchComponentProps) {
  return loading ? (
    <div className="ml-4">
      <CustomLoader size="14.7px" />
    </div>
  ) : (
    // A single <label> wraps the control. Nesting labels (as this component
    // previously did) makes the browser dispatch the synthetic click on the
    // checkbox twice, so onChange fires an even number of times and the toggle
    // appears frozen.
    <label
      className={`ml-2 flex flex-shrink-0 cursor-pointer items-center gap-2 ${
        reverse ? 'flex-row-reverse' : ''
      } ${className ?? ''}`}
    >
      <span className="relative inline-flex flex-shrink-0 items-center">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={isActive}
          onChange={onChange}
        />
        <span className="block h-4 w-8 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary-color peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-color dark:bg-gray-700"></span>
        <span className="pointer-events-none absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-gray-50 transition-transform peer-checked:translate-x-4"></span>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
