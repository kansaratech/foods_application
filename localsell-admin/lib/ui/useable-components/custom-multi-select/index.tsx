'use client';
import { useId } from 'react';
import './multi-select.css';

// Interface
import { IMultiSelectComponentProps } from '@/lib/utils/interfaces';

// Prime React
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import { twMerge } from 'tailwind-merge';
import { useTranslations } from 'next-intl';

import InputSkeleton from '../custom-skeletons/inputfield.skeleton';
import FieldShell from '../form/field-shell';

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
  error,
  ...props
}: IMultiSelectComponentProps & { error?: string }) => {
  const t = useTranslations();
  const inputId = useId();

  const itemTemplate = (option: { label: string }) => (
    <div className="flex items-center">{option.label}</div>
  );

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

  if (isLoading) return <InputSkeleton />;

  return (
    <FieldShell
      htmlFor={inputId}
      label={placeholder}
      showLabel={showLabel}
      error={error}
      className={className}
    >
      <MultiSelect
        inputId={inputId}
        aria-label={placeholder}
        scrollHeight="200px"
        filterPlaceholder={placeholder}
        value={selectedItems}
        options={options}
        onChange={(e: MultiSelectChangeEvent) => {
          if (onChange) onChange(e.value);
          else setSelectedItems(name, e.value);
        }}
        optionLabel="label"
        placeholder={placeholder}
        itemTemplate={itemTemplate}
        panelFooterTemplate={panelFooterTemplate}
        className={twMerge(
          'ls-field custom-multiselect',
          error && 'ls-field-invalid',
          multiSelectClassName
        )}
        panelClassName="custom-multiselect-panel"
        display="chip"
        dropdownIcon={(opts) => (
          <FontAwesomeIcon
            icon={dropDownIcon ?? faChevronDown}
            className={opts.className}
          />
        )}
        filter
        {...props}
      />
    </FieldShell>
  );
};

export default CustomMultiSelectComponent;
