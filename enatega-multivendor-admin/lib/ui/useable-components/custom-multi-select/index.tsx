'use client';
import { useId } from 'react';
import './multi-select.css';
// Interface
import { IMultiSelectComponentProps } from '@/lib/utils/interfaces';

// Prime React
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';
import { twMerge } from 'tailwind-merge';
import { useTranslations } from 'next-intl';

const CustomMultiSelectComponent = ({
  name,
  placeholder,
  options,
  selectedItems,
  extraFooterButton,
  setSelectedItems,
  showLabel,
  dropDownIcon,
  isLoading = false,
  onChange,
  className,
  multiSelectClassName,
  ...props
}: IMultiSelectComponentProps) => {
  const t = useTranslations();
  const inputId = useId();
  const itemTemplate = (option: { label: string }) => {
    return (
      <div className="align-items-center flex">
        <div>{option.label}</div>
      </div>
    );
  };

  const panelFooterTemplate = () => {
    const length = selectedItems ? selectedItems.length : 0;

    return (
      <div className="custom-multiselect-footer">
        <span>
          {length} {t('selected')}
        </span>
        {extraFooterButton?.title && (
          <button type="button" onClick={extraFooterButton.onChange}>
            <i className="pi pi-plus" aria-hidden="true" />
            {extraFooterButton.title}
          </button>
        )}
      </div>
    );
  };

  return !isLoading ? (
    <div
      className={twMerge(
        `flex w-full flex-col justify-center gap-y-1`,
        className
      )}
    >
      {showLabel && (
        <label htmlFor={inputId} className="text-sm font-[500] dark:text-white">
          {placeholder}
        </label>
      )}

      <MultiSelect
        inputId={inputId}
        aria-label={placeholder}
        scrollHeight="200px"
        filterPlaceholder={placeholder}
        value={selectedItems}
        options={options}
        onChange={(e: MultiSelectChangeEvent) => {
          if (onChange) {
            // for custom cases: i.e conditional selecting
            onChange(e.value);
          } else setSelectedItems(name, e.value);
        }}
        optionLabel="label"
        placeholder={placeholder}
        itemTemplate={itemTemplate}
        panelFooterTemplate={panelFooterTemplate}
        className={twMerge(
          'custom-multiselect md:w-20rem m-0 min-h-10 w-full border dark:border-dark-600 dark:bg-dark-950 dark:text-white border-gray-300 p-0 align-middle text-sm focus:shadow-none focus:outline-none',
          multiSelectClassName
        )}
        panelClassName="custom-multiselect-panel"
        display="chip"
        dropdownIcon={(options) => (
          <FontAwesomeIcon
            icon={dropDownIcon ?? faChevronDown}
            className={options.className}
          />
        )}
        filter={true}
        {...props}
      />
    </div>
  ) : (
    <InputSkeleton />
  );
};

export default CustomMultiSelectComponent;
