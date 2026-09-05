'use client';
// Core
import { Form, Formik } from 'formik';

// Components
import ConfigCard from '../../view/card';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';

// Toast
import useToast from '@/lib/hooks/useToast';

// Hooks
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// Interfaces and Types
import { INodeMailerForm } from '@/lib/utils/interfaces/configurations.interface';

// Utils and Constants
import { NodeMailerValidationSchema } from '@/lib/utils/schema';

// GraphQL
import { useMutation } from '@apollo/client';
import { GET_CONFIGURATION, SAVE_EMAIL_CONFIGURATION } from '@/lib/api/graphql';

const NodeMailerAddForm = () => {
  // Hooks
  const {
    EMAIL_NAME,
    EMAIL,
    ENABLE_EMAIL,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
  } = useConfiguration();
  const { showToast } = useToast();

  const initialValues = {
    email: EMAIL,
    password: '',
    emailName: EMAIL_NAME,
    enableEmail: ENABLE_EMAIL,
    smtpHost: SMTP_HOST,
    smtpPort: SMTP_PORT ?? null,
    smtpSecure: SMTP_SECURE,
    smtpUser: SMTP_USER,
  };

  const [mutate, { loading: mutationLoading }] = useMutation(
    SAVE_EMAIL_CONFIGURATION,
    {
      refetchQueries: [{ query: GET_CONFIGURATION }],
    }
  );

  const handleSubmit = (values: INodeMailerForm) => {
    const password = values.password?.trim();
    mutate({
      variables: {
        configurationInput: {
          email: values.email,
          emailName: values.emailName,
          enableEmail: values.enableEmail,
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          smtpSecure: values.smtpSecure,
          smtpUser: values.smtpUser,
          ...(password ? { password } : {}),
        },
      },
      onCompleted: () => {
        showToast({
          type: 'success',
          title: 'Success!',
          message: 'NodeMailer Configurations Updated',
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
        validationSchema={NodeMailerValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          handleSubmit,
          handleChange,
          setFieldValue,
        }) => {
          return (
            <Form onSubmit={handleSubmit}>
              <ConfigCard
                cardTitle={'NodeMailer Email'}
                buttonLoading={mutationLoading}
                toggleLabel={'Status'}
                toggleOnChange={() => {
                  setFieldValue('enableEmail', !values.enableEmail);
                }}
                toggleValue={values.enableEmail}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomTextField
                    type="text"
                    name="email"
                    placeholder="Email"
                    maxLength={35}
                    value={values.email}
                    onChange={handleChange}
                    showLabel={true}
                    style={{
                      borderColor: errors.email && touched.email ? 'red' : '',
                    }}
                  />

                  <CustomTextField
                    type="text"
                    name="emailName"
                    placeholder="Email Name"
                    maxLength={35}
                    value={values.emailName}
                    onChange={handleChange}
                    showLabel={true}
                    style={{
                      borderColor:
                        errors.emailName && touched.emailName ? 'red' : '',
                    }}
                  />

                  <CustomPasswordTextField
                    placeholder="Password"
                    name="password"
                    feedback={false}
                    maxLength={20}
                    value={values.password}
                    showLabel={true}
                    onChange={handleChange}
                    style={{
                      borderColor:
                        errors.password && touched.password ? 'red' : '',
                    }}
                  />

                  <CustomTextField
                    type="text"
                    name="smtpHost"
                    placeholder="SMTP Host"
                    maxLength={100}
                    value={values.smtpHost ?? ''}
                    onChange={handleChange}
                    showLabel={true}
                    style={{
                      borderColor:
                        errors.smtpHost && touched.smtpHost ? 'red' : '',
                    }}
                  />

                  <CustomNumberField
                    min={0}
                    placeholder="SMTP Port"
                    name="smtpPort"
                    showLabel={true}
                    value={values.smtpPort}
                    useGrouping={false}
                    onChange={setFieldValue}
                    style={{
                      borderColor:
                        errors.smtpPort && touched.smtpPort ? 'red' : '',
                    }}
                  />

                  <CustomTextField
                    type="text"
                    name="smtpUser"
                    placeholder="SMTP Username (optional, defaults to Email)"
                    maxLength={100}
                    value={values.smtpUser ?? ''}
                    onChange={handleChange}
                    showLabel={true}
                    style={{
                      borderColor:
                        errors.smtpUser && touched.smtpUser ? 'red' : '',
                    }}
                  />

                  <div className="flex items-center gap-3">
                    <CustomInputSwitch
                      label="SMTP Secure (TLS)"
                      isActive={!!values.smtpSecure}
                      onChange={() =>
                        setFieldValue('smtpSecure', !values.smtpSecure)
                      }
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Leave the password blank to keep the current value. Leave
                  SMTP Host empty to send via Gmail using the Email + Password
                  above instead of a custom SMTP server.
                </p>
              </ConfigCard>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default NodeMailerAddForm;
