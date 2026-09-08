'use client';

import { useContext, useState } from 'react';
import { Form, Formik } from 'formik';
import { ISignInForm } from '@/lib/utils/interfaces/forms';
import { APP_NAME } from '@/lib/utils/constants';
import { OWNER_LOGIN } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { ApolloError, useMutation } from '@apollo/client';
import { onUseLocalStorage } from '@/lib/utils/methods';
import { setAuthTokens } from '@/lib/utils/methods/auth';
import { SignInSchema } from '@/lib/utils/schema';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/lib/hooks/useUser';
import { DEFAULT_ROUTES } from '@/lib/utils/constants/routes';
import styles from './login.module.css';

const initialValues: ISignInForm = { email: '', password: '' };

export default function LoginEmailPasswordMain() {
  const [showPassword, setShowPassword] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Context
  const { showToast } = useContext(ToastContext);

  // Hooks
  const router = useRouter();
  const { refreshUserSession } = useUserContext();

  // API
  const [onLogin, { loading }] = useMutation(OWNER_LOGIN, {
    onError,
  });

  function onError({ graphQLErrors, networkError }: ApolloError) {
    showToast({
      type: 'error',
      title: 'Login',
      message:
        graphQLErrors[0]?.message ??
        networkError?.message ??
        `Something went wrong - Please try again`,
    });
  }

  // Handler
  const onSubmitHandler = async (data: ISignInForm) => {
    try {
      const response = await onLogin({
        variables: {
          ...data,
        },
      });

      const ownerLogin = response.data?.ownerLogin;
      if (!ownerLogin) {
        throw new Error('Unable to load session');
      }

      onUseLocalStorage('save', `user-${APP_NAME}`, JSON.stringify(ownerLogin));
      setAuthTokens({
        userId: ownerLogin.userId,
        token: ownerLogin.token,
        tokenExpiration: ownerLogin.tokenExpiration,
        refreshToken: ownerLogin.refreshToken,
        refreshTokenExpiration: ownerLogin.refreshTokenExpiration,
        userType: ownerLogin.userType,
      });

      const verifiedUser = await refreshUserSession(ownerLogin);
      if (!verifiedUser) {
        showToast({
          type: 'error',
          title: 'Login',
          message: 'Unable to verify your session. Please try again.',
        });
        return;
      }

      router.replace(DEFAULT_ROUTES[verifiedUser.userType]);

      showToast({
        type: 'success',
        title: 'Login',
        message: 'User has been logged in successfully.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Login',
        message: 'Login Failed',
      });
    }
  };

  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.brand}>
          <i className="pi pi-map-marker" aria-hidden="true" />
          localsell
        </div>
        <div className={styles.eyebrow}>ADMIN CONSOLE</div>
        <div className={styles.intro}>
          <h1>
            Manage your
            <br />
            marketplace with
            <br />
            confidence.
          </h1>
          <p>
            Monitor operations, manage partners and
            <br className={styles.desktopBreak} /> control platform settings
            from one secure place.
          </p>
          <ul className={styles.features}>
            <li>
              <i className="pi pi-file" aria-hidden="true" />
              Monitor orders and operations
            </li>
            <li>
              <i className="pi pi-shop" aria-hidden="true" />
              Manage vendors, stores and riders
            </li>
            <li>
              <i className="pi pi-chart-bar" aria-hidden="true" />
              Review settlements and reports
            </li>
          </ul>
        </div>
        <div className={styles.network} aria-hidden="true">
          <svg viewBox="0 0 220 700" preserveAspectRatio="none">
            <path d="M0 0L70 65Q90 100 140 100H165Q210 100 210 150V220Q210 255 170 255Q165 300 130 335L110 355Q70 390 110 425H140Q195 425 195 475V530Q195 580 140 580H90Q40 580 40 635V700" />
            {[
              [70, 65],
              [210, 180],
              [130, 335],
              [195, 510],
              [40, 645],
            ].map(([cx, cy]) => (
              <circle key={cy} cx={cx} cy={cy} r="5" />
            ))}
          </svg>
          <div className={styles.orders}>
            <i className="pi pi-file" /> <span>Orders</span>
          </div>
          <div className={styles.stores}>
            <i className="pi pi-shop" />
            <span>Stores</span>
          </div>
          <div className={styles.riders}>
            <i className="pi pi-truck" />
            <span>Riders</span>
          </div>
          <div className={styles.analytics}>
            <i className="pi pi-chart-bar" />
            <span>Analytics</span>
          </div>
        </div>
        <div className={styles.help}>
          <i className="pi pi-headphones" aria-hidden="true" />
          Need help?{' '}
          <button type="button" onClick={() => setHelpOpen(!helpOpen)}>
            Contact support
          </button>
        </div>
      </aside>
      <section className={styles.formPanel} aria-label="Administrator login">
        <div className={styles.card}>
          <div className={styles.shield}>
            <i className="pi pi-shield" aria-hidden="true" />
          </div>
          <h2>Admin sign in</h2>
          <p className={styles.subtitle}>
            Use your authorised administrator account.
          </p>
          <Formik
            initialValues={initialValues}
            validationSchema={SignInSchema}
            onSubmit={onSubmitHandler}
            validateOnChange={false}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              isSubmitting,
            }) => (
              <Form className={styles.form}>
                <label htmlFor="admin-email">Work email</label>
                <div className={styles.inputWrap}>
                  <i className="pi pi-envelope" aria-hidden="true" />
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="Enter your work email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.email && errors.email)}
                    aria-describedby={
                      touched.email && errors.email ? 'email-error' : undefined
                    }
                  />
                </div>
                {touched.email && errors.email && (
                  <p id="email-error" className={styles.error}>
                    {errors.email}
                  </p>
                )}
                <div className={styles.passwordLabel}>
                  <label htmlFor="admin-password">Password</label>
                  <button type="button" onClick={() => setHelpOpen(!helpOpen)}>
                    Forgot password?
                  </button>
                </div>
                <div className={styles.inputWrap}>
                  <i className="pi pi-lock" aria-hidden="true" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.password && errors.password)}
                    aria-describedby={
                      touched.password && errors.password
                        ? 'password-error'
                        : undefined
                    }
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                  >
                    <i
                      className={showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p id="password-error" className={styles.error}>
                    {errors.password}
                  </p>
                )}
                <button
                  className={styles.submit}
                  type="submit"
                  disabled={loading || isSubmitting}
                >
                  {loading || isSubmitting ? 'Signing in…' : 'Sign in securely'}
                </button>
              </Form>
            )}
          </Formik>
          {helpOpen && (
            <p className={styles.support} role="status">
              For account access or a password reset, contact your
              organisation&rsquo;s platform administrator.
            </p>
          )}
          <p className={styles.security}>
            <i className="pi pi-lock" aria-hidden="true" />
            Authorised administrators only. Login activity may be monitored.
          </p>
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={() => setHelpOpen(!helpOpen)}>
            Contact Support
          </button>
          <p>&copy; {new Date().getFullYear()} Localsell</p>
        </footer>
      </section>
    </main>
  );
}
