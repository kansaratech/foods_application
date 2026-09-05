import CustomButton from '@/lib/ui/useable-components/button';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import { IConfigCardComponentProps } from '@/lib/utils/interfaces/configurations.interface';
import React from 'react';

const ConfigCard = ({
  buttonLoading,
  children,
  cardTitle,
  toggleLabel,
  toggleValue,
  toggleOnChange = () => {},
}: IConfigCardComponentProps) => {
  return (
    <div className="configuration-card">
      {/* header */}
      <div className="configuration-card-heading">
        <h2>{cardTitle}</h2>
        {toggleLabel && (
          <>
            <CustomInputSwitch
              label={toggleLabel}
              onChange={toggleOnChange}
              isActive={toggleValue ?? false}
              reverse
            />
          </>
        )}
      </div>

      {/* center */}
      <div className="configuration-card-body">{children}</div>

      {/* footer */}
      <div className="configuration-card-footer">
        <CustomButton
          className="configuration-save"
          label={'Save'}
          type="submit"
          loading={buttonLoading}
        />
      </div>
    </div>
  );
};

export default ConfigCard;
