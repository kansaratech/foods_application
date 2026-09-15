'use client';

import { Children, isValidElement, useId, type ReactNode } from 'react';
import { Dropdown, type DropdownProps } from 'primereact/dropdown';

type OptionProps = {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
};
type Props = Omit<DropdownProps, 'children' | 'options'> & {
  children: ReactNode;
};

/** Migration bridge for option-based filters; uses the same menu as form fields. */
export default function Select({ children, className, ...props }: Props) {
  const id = useId();
  const options = Children.toArray(children)
    .filter(isValidElement<OptionProps>)
    .map((child) => ({
      label: Children.toArray(child.props.children).join(''),
      value:
        child.props.value ?? Children.toArray(child.props.children).join(''),
      disabled: child.props.disabled,
    }));
  return (
    <Dropdown
      {...props}
      inputId={props.inputId ?? props.id ?? id}
      ariaLabel={
        props.ariaLabel ??
        props['aria-label'] ??
        props.name ??
        options[0]?.label
      }
      value={props.value ?? options[0]?.value}
      options={options}
      optionLabel="label"
      optionValue="value"
      optionDisabled="disabled"
      className={`ls-field ls-select ${className ?? ''}`}
      checkmark
    />
  );
}
