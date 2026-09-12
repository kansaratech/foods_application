'use client';

import { useState } from 'react';
import WhatsAppMessageLog from '../../add-form/whatsapp/message-log';

// Used
import CurrencyAddForm from '../../add-form/currency';
import DeliveryRateAddForm from '../../add-form/delivery-rate';
import GoogleApiAddForm from '../../add-form/google-api';
import VerificationAddForm from '../../add-form/verification';
import WhatsAppAddForm from '../../add-form/whatsapp';
import AppConfigAddForm from '../../add-form/app-config';
import AppVersionAddForm from '../../add-form/app-versions';

// Optional services are grouped in the Integrations tab.
import NodeMailerAddForm from '../../add-form/nodemailer';
import StripeAddForm from '../../add-form/stripe';
import PayPalAddForm from '../../add-form/paypal';
import TwilioAddForm from '../../add-form/twilio';
import SentryAddForm from '../../add-form/sentry-config';
import CloudinaryAddForm from '../../add-form/cloudinary';
import AmplitudeAddForm from '../../add-form/amplitude';
import GoogleClientAddForm from '../../add-form/google-client';
import FirebaseAdminAddForm from '../../add-form/firebase-admin';

const sections = [
  {
    id: 'general',
    label: 'General',
    icon: 'sliders-h',
    description: 'Manage currency, delivery pricing and account verification.',
  },
  {
    id: 'app',
    label: 'App settings',
    icon: 'mobile',
    description: 'Update customer policies, demo settings and app versions.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'whatsapp',
    description: 'Connect your business account and manage message templates.',
  },
  {
    id: 'activity',
    label: 'Message activity',
    icon: 'history',
    description: 'Review WhatsApp delivery status and search recent messages.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'link',
    description: 'Manage maps, payments and connected services.',
  },
] as const;

type SectionId = (typeof sections)[number]['id'];

const ConfigMain = () => {
  const [active, setActive] = useState<SectionId>('general');
  const [visited, setVisited] = useState<SectionId[]>(['general']);

  const selectSection = (id: SectionId) => {
    setActive(id);
    setVisited((current) =>
      current.includes(id) ? current : [...current, id]
    );
  };

  return (
    <div className="configuration-workspace">
      <div
        className="configuration-tabs"
        role="tablist"
        aria-label="Configuration categories"
      >
        {sections.map((section, index) => (
          <button
            key={section.id}
            id={`configuration-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={active === section.id}
            aria-controls={`configuration-panel-${section.id}`}
            tabIndex={active === section.id ? 0 : -1}
            onClick={() => selectSection(section.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight')
                next = (index + 1) % sections.length;
              else if (event.key === 'ArrowLeft')
                next = (index - 1 + sections.length) % sections.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = sections.length - 1;
              else return;
              event.preventDefault();
              selectSection(sections[next].id);
              document
                .getElementById(`configuration-tab-${sections[next].id}`)
                ?.focus();
            }}
          >
            <i className={`pi pi-${section.icon}`} aria-hidden="true" />
            {section.label}
          </button>
        ))}
      </div>
      {sections.map((section) => (
        <section
          key={section.id}
          id={`configuration-panel-${section.id}`}
          role="tabpanel"
          aria-labelledby={`configuration-tab-${section.id}`}
          hidden={active !== section.id}
          tabIndex={0}
        >
          <div className="configuration-section-intro">
            <div>
              <h2>{section.label}</h2>
              <p>{section.description}</p>
            </div>
            {section.id !== 'activity' && (
              <span>
                <i className="pi pi-info-circle" aria-hidden="true" /> Save each
                section separately
              </span>
            )}
          </div>
          {/* Keep visited forms mounted so switching tabs preserves unsaved edits. */}
          {visited.includes(section.id) && (
            <div className="configuration-grid">
              {section.id === 'general' && (
                <>
                  <CurrencyAddForm />
                  <DeliveryRateAddForm />
                  <div className="configuration-wide">
                    <VerificationAddForm />
                  </div>
                </>
              )}
              {section.id === 'app' && (
                <>
                  <div className="configuration-wide">
                    <AppConfigAddForm />
                  </div>
                  <div className="configuration-wide">
                    <AppVersionAddForm />
                  </div>
                </>
              )}
              {section.id === 'whatsapp' && <WhatsAppAddForm />}
              {section.id === 'activity' && (
                <div className="configuration-wide">
                  <WhatsAppMessageLog />
                </div>
              )}
              {section.id === 'integrations' && (
                <>
                  <GoogleApiAddForm />
                  <NodeMailerAddForm />
                  <StripeAddForm />
                  <PayPalAddForm />
                  <TwilioAddForm />
                  <SentryAddForm />
                  <CloudinaryAddForm />
                  <AmplitudeAddForm />
                  <GoogleClientAddForm />
                  <FirebaseAdminAddForm />
                </>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default ConfigMain;
