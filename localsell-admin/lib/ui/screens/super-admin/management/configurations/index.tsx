'use client';

import './configurations.css';
import { useContext } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CONFIGURATION } from '@/lib/api/graphql';
import { ConfigurationContext } from '@/lib/context/global/configuration.context';
import ConfigHeader from '@/lib/ui/screen-components/protected/super-admin/configuration/view/header';
import ConfigMain from '@/lib/ui/screen-components/protected/super-admin/configuration/view/main';

export default function ConfigurationsScreen() {
  const configuration = useContext(ConfigurationContext);
  const { loading, error, refetch } = useQuery(GET_CONFIGURATION);

  return (
    <div className="configuration-page">
      <ConfigHeader />
      {error ? (
        <div
          className="configuration-workspace configuration-card"
          role="alert"
        >
          <div className="configuration-card-heading">
            <h2>Unable to load settings</h2>
          </div>
          <div className="configuration-card-body">
            Check your API connection and try again.
          </div>
          <div className="configuration-card-footer">
            <button
              type="button"
              className="configuration-save"
              onClick={() => void refetch().catch(() => {})}
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading || !configuration?._id ? (
        <div
          className="configuration-workspace"
          role="status"
          aria-live="polite"
        >
          Loading settings...
        </div>
      ) : (
        // LocalSell owns this fork; the upstream paid-version flag is obsolete.
        <ConfigMain />
      )}
    </div>
  );
}
