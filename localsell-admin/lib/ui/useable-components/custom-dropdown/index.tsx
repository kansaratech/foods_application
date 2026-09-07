'use client';
// Interface
import { IDropdownComponentProps } from '@/lib/utils/interfaces';

// Prime React
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { twMerge } from 'tailwind-merge';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

import TextIconClickable from '../text-icon-clickable';
import InputSkeleton from '../custom-skeletons/inputfield.skeleton';
import FieldShell from '../form/field-shell';

const CustomDropdownComponent = ({
  name,
  placeholder,
  options,
  selectedItem,
  setSelectedItem,
  showLabel,
  isLoading = false,
  filter = true,
  extraFooterButton,
  error,
  ...props
}: IDropdownComponentProps) => {
  const t = useTranslations();

  const itemTemplate = (option: { label: string }) => (
    <div className="flex items-center">{option.label}</div>
  );

  const panelFooterTemplate = () =>
    extraFooterButton?.title ? (
      <div className="flex justify-between space-x-2 p-1">
        <TextIconClickable
          className="h-fit w-full rounded text-content"
          icon={faAdd}
          title={extraFooterButton.title}
          onClick={extraFooterButton.onChange}
        />
      </div>
    ) : null;

  if (isLoading) return <InputSkeleton />;

  return (
    <FieldShell
      htmlFor={name}
      label={placeholder}
      showLabel={showLabel}
      error={error}
    >
      <Dropdown
        inputId={name}
        value={selectedItem}
        options={options}
        onChange={(e: DropdownChangeEvent) => setSelectedItem(name, e.value)}
        optionLabel="label"
        placeholder={placeholder}
        itemTemplate={itemTemplate}
        className={twMerge('ls-field', error && 'ls-field-invalid')}
        filter={filter}
        checkmark
        panelFooterTemplate={panelFooterTemplate}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        emptyMessage={t('No available options')}
        {...props}
      />
    </FieldShell>
  );
};

export default CustomDropdownComponent;
