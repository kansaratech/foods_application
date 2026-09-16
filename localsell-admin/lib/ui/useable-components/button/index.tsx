import BrandLoader from '../brand-loader';
// Interfaces
import { ICustomButtonProps } from '@/lib/utils/interfaces';

// Prime React
import { Button } from 'primereact/button';

// Styles
import classes from './button.module.css';

export default function CustomButton({
  className,
  label,
  type,
  ...props
}: ICustomButtonProps) {
  return (
    <Button
      loadingIcon={<BrandLoader variant="inline" size={20} />}
      className={`ls-button ${classes['btn-custom']} ${className ?? ''}`}
      label={label}
      type={type}
      {...props}
    ></Button>
  );
}
