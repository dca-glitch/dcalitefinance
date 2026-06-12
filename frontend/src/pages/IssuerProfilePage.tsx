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

function formatProfileValue(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : 'Not set';
}

export function IssuerProfilePage() {
  const { activeTenant } = useAuth();
  const [issuerProfile, setIssuerProfile] = useState<IssuerProfileRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function loadIssuerProfile() {
    if (!activeTenant?.id) {
      setIssuerProfile(null);
      setIsEditing(false);
      setPageError('No active tenant context is available for company settings.');
      setInitialLoading(false);
      return;
    }

    setPageError(null);

    try {
      const profile = await getIssuerProfile();
      setIssuerProfile(profile);
      setIsEditing(false);
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
      setIsEditing(false);
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
          title={issuerProfile ? 'Company profile' : 'Set up company settings'}
        >
          {issuerProfile && !isEditing ? (
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Current settings</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">
                      {issuerProfile.issuerDisplayName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">{formatProfileValue(issuerProfile.issuerLegalName)}</p>
                  </div>
                  <Button onClick={() => setIsEditing(true)} type="button" variant="secondary">
                    Edit
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Address</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {[
                        issuerProfile.addressLine1,
                        issuerProfile.addressLine2,
                        issuerProfile.city,
                        issuerProfile.state,
                        issuerProfile.postalCode,
                        issuerProfile.country,
                      ]
                        .filter((value) => typeof value === 'string' && value.trim().length > 0)
                        .join(', ') || 'Not set'}
                    </p>
                    <p className="mt-3 text-sm text-slate-400">Currency: {issuerProfile.currencyCode}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contact</p>
                    <p className="mt-2 text-sm text-slate-300">Email: {formatProfileValue(issuerProfile.email)}</p>
                    <p className="mt-1 text-sm text-slate-300">Phone: {formatProfileValue(issuerProfile.phone)}</p>
                    <p className="mt-1 text-sm text-slate-300">Website: {formatProfileValue(issuerProfile.website)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Payment details</p>
                    <p className="mt-2 text-sm text-slate-300">Account name: {formatProfileValue(issuerProfile.bankAccountName)}</p>
                    <p className="mt-1 text-sm text-slate-300">Bank name: {formatProfileValue(issuerProfile.bankName)}</p>
                    <p className="mt-1 text-sm text-slate-300">Account number: {formatProfileValue(issuerProfile.bankAccountNumber)}</p>
                    <p className="mt-1 text-sm text-slate-300">SWIFT: {formatProfileValue(issuerProfile.bankSwift)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Invoice defaults</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Terms: {formatProfileValue(issuerProfile.defaultInvoiceTerms)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Payment instructions: {formatProfileValue(issuerProfile.defaultPaymentInstructions)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Footer: {formatProfileValue(issuerProfile.invoiceFooter)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {issuerProfile ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                  <span>Editing is disabled by default to prevent accidental changes to your company profile.</span>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError(null);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Cancel edit
                  </Button>
                </div>
              ) : null}
              <IssuerProfileForm
                error={saveError}
                initialProfile={issuerProfile}
                loading={saveLoading}
                onSubmit={handleSave}
              />
            </div>
          )}
        </PageSection>
      ) : null}
    </AppPage>
  );
}
