'use client';

import { useContext, useState } from 'react';
import { ApolloError, useMutation } from '@apollo/client';

import { FORGOT_PASSWORD, RESET_PASSWORD } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { isValidEmail } from '@/lib/utils/methods/validation';
import styles from './login.module.css';

interface ForgotPasswordPanelProps {
  /** Pre-fill from whatever the admin already typed on the sign-in form. */
  initialEmail?: string;
  onBackToSignIn: () => void;
  /** Called once the password has been reset, with the email used. */
  onResetComplete: (email: string) => void;
}

const strongEnough = (pw: string) =>
  pw.length >= 8 &&
  /[a-z]/.test(pw) &&
  /[A-Z]/.test(pw) &&
  /\d/.test(pw) &&
  /[^A-Za-z0-9\s]/.test(pw);

export default function ForgotPasswordPanel({
  initialEmail = '',
  onBackToSignIn,
  onResetComplete,
}: ForgotPasswordPanelProps) {
  const { showToast } = useContext(ToastContext);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotPassword, { loading: sending }] = useMutation(FORGOT_PASSWORD);
  const [resetPassword, { loading: resetting }] = useMutation(RESET_PASSWORD);

  const apolloMessage = (err: unknown) =>
    (err as ApolloError)?.graphQLErrors?.[0]?.message ||
    (err as Error)?.message ||
    'Something went wrong. Please try again.';

  const requestOtp = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter the email address for your admin account.');
      return;
    }
    try {
      await forgotPassword({ variables: { email: email.trim().toLowerCase() } });
      showToast({
        type: 'success',
        title: 'Password reset',
        message: 'We sent a reset code to your email.',
      });
      setStep('reset');
    } catch (err) {
      setError(apolloMessage(err));
    }
  };

  const submitReset = async () => {
    setError(null);
    if (!otp.trim()) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!strongEnough(password)) {
      setError(
        'Password must be 8+ characters with an uppercase, lowercase, number and symbol.',
      );
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    try {
      await resetPassword({
        variables: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password,
        },
      });
      showToast({
        type: 'success',
        title: 'Password reset',
        message: 'Your password has been updated. Please sign in.',
      });
      onResetComplete(email.trim().toLowerCase());
    } catch (err) {
      setError(apolloMessage(err));
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.shield}>
        <i className="pi pi-key" aria-hidden="true" />
      </div>
      <h2>{step === 'request' ? 'Reset your password' : 'Enter your reset code'}</h2>
      <p className={styles.subtitle}>
        {step === 'request'
          ? 'We’ll email you a one-time code to set a new password.'
          : `Code sent to ${email}. It expires in 10 minutes.`}
      </p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          step === 'request' ? requestOtp() : submitReset();
        }}
      >
        {step === 'request' ? (
          <>
            <label htmlFor="forgot-email">Work email</label>
            <div className={styles.inputWrap}>
              <i className="pi pi-envelope" aria-hidden="true" />
              <input
                id="forgot-email"
                type="email"
                autoComplete="username"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <label htmlFor="forgot-otp">Reset code</label>
            <div className={styles.inputWrap}>
              <i className="pi pi-hashtag" aria-hidden="true" />
              <input
                id="forgot-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            <label htmlFor="forgot-password">New password</label>
            <div className={styles.inputWrap}>
              <i className="pi pi-lock" aria-hidden="true" />
              <input
                id="forgot-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.reveal}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <i
                  className={showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                  aria-hidden="true"
                />
              </button>
            </div>

            <label htmlFor="forgot-confirm">Confirm new password</label>
            <div className={styles.inputWrap}>
              <i className="pi pi-lock" aria-hidden="true" />
              <input
                id="forgot-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={sending || resetting}>
          {step === 'request'
            ? sending
              ? 'Sending…'
              : 'Send reset code'
            : resetting
              ? 'Updating…'
              : 'Set new password'}
        </button>
      </form>

      <p className={styles.support}>
        <button type="button" onClick={onBackToSignIn}>
          Back to sign in
        </button>
        {step === 'reset' && (
          <>
            {'  ·  '}
            <button type="button" onClick={requestOtp} disabled={sending}>
              Resend code
            </button>
          </>
        )}
      </p>
    </div>
  );
}
