import { ICustomInputSwitchComponentProps } from '@/lib/utils/interfaces';
import CustomLoader from '../custom-progress-indicator';

export default function CustomInputSwitch({
  loading,
  isActive,
  label,
  onChange,
  reverse = false,
  className
}: ICustomInputSwitchComponentProps) {
  return loading ? (
    <div className="ml-4">
      <CustomLoader size="14.7px" />
    </div>
  ) : (
    <div className={`ml-2 flex flex-shrink-0 cursor-pointer items-center ${className}`} >
      <div className="relative">
        <div
          className={`flex items-center gap-2 ${reverse && 'flex-row-reverse'}`}
        >
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isActive}
              onChange={onChange}
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-primary-color peer-focus-visible:ring-2 peer-focus-visible:ring-primary-color peer-focus-visible:ring-offset-2 dark:bg-gray-700"></div>
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-gray-50 transition-transform peer-checked:translate-x-5"></div>
          </label>
          {label && <span className="ml-2">{label}</span>}
        </div>
      </div>
    </div>
  );
}
