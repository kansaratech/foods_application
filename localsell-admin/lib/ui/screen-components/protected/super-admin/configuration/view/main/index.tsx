'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

// Used
import CurrencyAddForm from '../../add-form/currency';
import DeliveryRateAddForm from '../../add-form/delivery-rate';
import GoogleApiAddForm from '../../add-form/google-api';
import VerificationAddForm from '../../add-form/verification';
import AppConfigAddForm from '../../add-form/app-config';
import AppVersionAddForm from '../../add-form/app-versions';

// Not used for this launch — kept behind a collapse so the screen isn't a wall
// of empty integration forms.
import NodeMailerAddForm from '../../add-form/nodemailer';
import StripeAddForm from '../../add-form/stripe';
import PayPalAddForm from '../../add-form/paypal';
import TwilioAddForm from '../../add-form/twilio';
import SentryAddForm from '../../add-form/sentry-config';
import CloudinaryAddForm from '../../add-form/cloudinary';
import AmplitudeAddForm from '../../add-form/amplitude';
import GoogleClientAddForm from '../../add-form/google-client';
import FirebaseAdminAddForm from '../../add-form/firebase-admin';

const ConfigMain = () => {
  const t = useTranslations();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="configuration-grid">
      <CurrencyAddForm />
      <DeliveryRateAddForm />
      <GoogleApiAddForm />
      <VerificationAddForm />
      <div className="configuration-wide">
        <AppConfigAddForm />
      </div>
      <div className="configuration-wide configuration-versions">
        <AppVersionAddForm />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
        aria-controls="configuration-advanced"
        className="configuration-advanced-button"
      >
        <i
          className={`pi pi-chevron-${showAdvanced ? 'up' : 'down'}`}
          aria-hidden="true"
        />
        {t('Advanced integrations (not used for this launch)')}
      </button>

      {showAdvanced && (
        <div
          id="configuration-advanced"
          className="configuration-wide configuration-grid"
        >
          <NodeMailerAddForm />
          <StripeAddForm />
          <PayPalAddForm />
          <TwilioAddForm />
          <SentryAddForm />
          <CloudinaryAddForm />
          <AmplitudeAddForm />
          <GoogleClientAddForm />
          <FirebaseAdminAddForm />
        </div>
      )}
    </div>
  );
};

export default ConfigMain;
