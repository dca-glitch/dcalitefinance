import { useEffect, useState } from 'react';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { getIssuerProfile, upsertIssuerProfile } from '../lib/issuer-profile-api';
import { IssuerProfileForm } from '../components/issuer-profile/IssuerProfileForm';
import type { IssuerProfileRecord, IssuerProfileUpsertInput } from '../types/issuer-profile';

function formatCurrencyLockError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unable to save company settings';

  if (message.includes('Currency cannot be changed after financial records exist')) {
    return 'Currency is locked because financial records already exist.';
  }

  return message;
}

export function IssuerProfilePage() {
  const { activeTenant } = useAuth();
  const [issuerProfile, setIssuerProfile] = useState<IssuerProfileRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  async function loadIssuerProfile() {
    if (!activeTenant?.id) {
      setIssuerProfile(null);
      setPageError('No active tenant context is available for company settings.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const profile = await getIssuerProfile();
      setIssuerProfile(profile);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load company settings');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadIssuerProfile();
  }, [activeTenant?.id]);

  async function handleSave(input: IssuerProfileUpsertInput) {
    setSaveLoading(true);
    setSaveError(null);

    try {
      const profile = await upsertIssuerProfile(input);
      setIssuerProfile(profile);
    } catch (error) {
      setSaveError(formatCurrencyLockError(error));
    } finally {
      setSaveLoading(false);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  return (
    <AppPage>
      <PageHeader
        description={`Configure the issuer profile, fixed tenant currency, and invoice defaults for ${tenantLabel}.`}
        eyebrow="DCA Books Lite"
        title="Company Settings"
      />

      {initialLoading ? <LoadingState message="Loading company settings..." /> : null}

      {!initialLoading && pageError ? (
        <ErrorState
          action={
            <Button onClick={() => void loadIssuerProfile()} variant="secondary">
              Retry
            </Button>
          }
          message={pageError}
          title="Unable to load company settings"
        />
      ) : null}

      {!initialLoading && !pageError ? (
        <PageSection
          description="Capture the legal company details and a single fixed currency used across invoices, bills, and PDFs."
          title={issuerProfile ? 'Update company settings' : 'Set up company settings'}
        >
          <IssuerProfileForm error={saveError} initialProfile={issuerProfile} loading={saveLoading} onSubmit={handleSave} />
        </PageSection>
      ) : null}
    </AppPage>
  );
}
