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
    smtpHost: SMTP_HOST || 'smtp.gmail.com',
    smtpPort: SMTP_PORT ?? 465,
    smtpSecure: SMTP_SECURE ?? true,
    smtpUser: SMTP_USER,
  };

  const [mutate, { loading: mutationLoading }] = useMutation(
    SAVE_EMAIL_CONFIGURATION,
    {
      refetchQueries: [{ query: GET_CONFIGURATION }],
    }
  );

  const handleSubmit = (values: INodeMailerForm) => {
    const gmail =
      !values.smtpHost?.trim() ||
      values.smtpHost.trim().toLowerCase() === 'smtp.gmail.com';
    const password = gmail
      ? values.password?.replace(/\s/g, '')
      : values.password?.trim();
    mutate({
      variables: {
        configurationInput: {
          email: values.email,
          emailName: values.emailName,
          enableEmail: values.enableEmail,
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          smtpSecure: gmail ? values.smtpPort === 465 : values.smtpSecure,
          smtpUser: values.smtpUser,
          ...(password ? { password } : {}),
        },
      },
      onCompleted: () => {
        showToast({
          type: 'success',
          title: 'Success!',
          message: 'Email settings saved',
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
          const gmail =
            !values.smtpHost?.trim() ||
            values.smtpHost.trim().toLowerCase() === 'smtp.gmail.com';
          return (
            <Form onSubmit={handleSubmit}>
              <ConfigCard
                cardTitle={gmail ? 'Google / Gmail SMTP' : 'SMTP Email'}
                buttonLoading={mutationLoading}
                toggleLabel={'Status'}
                toggleOnChange={() => {
                  setFieldValue('enableEmail', !values.enableEmail);
                }}
                toggleValue={values.enableEmail}
              >
                <div className="configuration-fields">
                  <CustomTextField
                    type="text"
                    name="email"
                    placeholder="Email"
                    maxLength={254}
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
                    placeholder={gmail ? 'Google App Password' : 'Password'}
                    name="password"
                    feedback={false}
                    maxLength={128}
                    value={values.password}
                    showLabel={true}
                    onChange={handleChange}
                    error={touched.password ? errors.password : undefined}
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
                    min={1}
                    max={65535}
                    placeholder="SMTP Port"
                    name="smtpPort"
                    showLabel={true}
                    value={values.smtpPort}
                    useGrouping={false}
                    onChange={setFieldValue}
                    error={touched.smtpPort ? errors.smtpPort : undefined}
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

                  {gmail ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {values.smtpPort === 587
                        ? 'STARTTLS encryption (port 587)'
                        : 'SSL/TLS encryption (port 465)'}{' '}
                      — configured automatically.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CustomInputSwitch
                        label="Implicit SSL/TLS (port 465)"
                        isActive={!!values.smtpSecure}
                        onChange={() =>
                          setFieldValue('smtpSecure', !values.smtpSecure)
                        }
                      />
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {gmail ? (
                    <>
                      Use smtp.gmail.com with port 465 (SSL/TLS) or 587
                      (STARTTLS). Enable 2-Step Verification on your Google
                      account, then create a{' '}
                      <a
                        className="underline"
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        16-character App Password
                      </a>
                      . Enter that app password here, not your Google account
                      password. Use your full Google email address as the SMTP
                      username. Spaces in app passwords are removed
                      automatically.{' '}
                    </>
                  ) : null}
                  Leave the password blank to keep the saved password.
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
