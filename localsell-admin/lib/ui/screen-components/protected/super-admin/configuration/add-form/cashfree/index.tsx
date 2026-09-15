'use client';
// Core
import { Form, Formik } from 'formik';

// Components
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import ConfigCard from '../../view/card';

// Toast
import useToast from '@/lib/hooks/useToast';

// Hooks
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// Interfaces and Types
import { ICashfreeForm } from '@/lib/utils/interfaces/configurations.interface';
import { IDropdownSelectItem } from '@/lib/utils/interfaces';

// Utils and Constants
import { CashfreeValidationSchema } from '@/lib/utils/schema';

// GraphQL
import { GET_CONFIGURATION, SAVE_CASHFREE_CONFIGURATION } from '@/lib/api/graphql';
import { useMutation } from '@apollo/client';

const CASHFREE_ENV_OPTIONS: IDropdownSelectItem[] = [
  { code: 'TEST', label: 'Test (sandbox)' },
  { code: 'PRODUCTION', label: 'Production (live)' },
];

const CashfreeAddForm = () => {
  // Hooks
  const { CASHFREE_APP_ID, CASHFREE_ENV, CASHFREE_SECRET_KEY_SET } = useConfiguration();
  const { showToast } = useToast();

  const initialValues: ICashfreeForm = {
    appId: CASHFREE_APP_ID,
    secretKey: '',
    env: CASHFREE_ENV_OPTIONS.find((o) => o.code === CASHFREE_ENV) ?? CASHFREE_ENV_OPTIONS[0],
  };

  const [mutate, { loading: mutationLoading }] = useMutation(
    SAVE_CASHFREE_CONFIGURATION,
    {
      refetchQueries: [{ query: GET_CONFIGURATION }],
    }
  );

  const handleSubmit = (values: ICashfreeForm) => {
    const secretKey = values.secretKey?.trim();
    mutate({
      variables: {
        configurationInput: {
          appId: values.appId,
          env: values.env?.code,
          ...(secretKey ? { secretKey } : {}),
        },
      },
      onCompleted: () => {
        showToast({
          type: 'success',
          title: 'Success!',
          message: 'Cashfree Configurations Updated',
          duration: 3000,
        });
      },
      onError: (error) => {
        let message = '';
        try {
          message = error.graphQLErrors[0]?.message;
        } catch (err) {
          message = 'ActionFailedTryAgain';
        }
        showToast({
          type: 'error',
          title: 'Error!',
          message,
          duration: 3000,
        });
      },
    });
  };

  return (
    <div>
      <Formik
        initialValues={initialValues}
        validationSchema={CashfreeValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, handleSubmit, handleChange, setFieldValue }) => {
          return (
            <Form onSubmit={handleSubmit}>
              <ConfigCard cardTitle={'Cashfree'} buttonLoading={mutationLoading}>
                <div className="configuration-fields">
                  <CustomPasswordTextField
                    placeholder="App ID"
                    name="appId"
                    feedback={false}
                    value={values.appId}
                    showLabel={true}
                    onChange={handleChange}
                    style={{
                      borderColor: errors.appId && touched.appId ? 'red' : '',
                    }}
                  />

                  <CustomPasswordTextField
                    placeholder="Secret Key"
                    name="secretKey"
                    feedback={false}
                    value={values.secretKey}
                    showLabel={true}
                    onChange={handleChange}
                    style={{
                      borderColor: errors.secretKey && touched.secretKey ? 'red' : '',
                    }}
                  />

                  <CustomDropdownComponent
                    name="env"
                    placeholder="Environment"
                    selectedItem={values.env}
                    setSelectedItem={setFieldValue}
                    options={CASHFREE_ENV_OPTIONS}
                    showLabel={true}
                  />
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Leave the secret key blank to keep the current value
                  {CASHFREE_SECRET_KEY_SET ? ' (one is already saved)' : ' — none saved yet, online payment stays disabled until you add one'}.
                  Test mode uses Cashfree&apos;s sandbox — no real money moves. Switch to Production only with live keys.
                </p>
              </ConfigCard>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default CashfreeAddForm;
