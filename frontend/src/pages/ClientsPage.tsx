import { useEffect, useRef, useState } from 'react';
import { ClientForm } from '../components/clients/ClientForm';
import { ClientsTable } from '../components/clients/ClientsTable';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { archiveClient, createClient, listClients, updateClient } from '../lib/clients-api';
import { useAuth } from '../hooks/useAuth';
import type { ClientMutationInput, ClientRecord } from '../types/client';

export function ClientsPage() {
  const { activeTenant } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadClients() {
    if (!activeTenant?.id) {
      setClients([]);
      setClientsError('No active tenant context is available for clients.');
      setInitialLoading(false);
      return;
    }

    setClientsError(null);

    try {
      const result = await listClients();
      setClients(result.clients);
    } catch (error) {
      setClientsError(error instanceof Error ? error.message : 'Failed to load clients');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, [activeTenant?.id]);

  useEffect(() => {
    if (!editingClient) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingClient]);

  async function handleSubmit(input: ClientMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingClient) {
        await updateClient(editingClient.id, input);
      } else {
        await createClient(input);
      }

      setEditingClient(null);
      await loadClients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save client');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(client: ClientRecord) {
    const confirmed = window.confirm(`Archive client "${client.name}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(client.id);
    setClientsError(null);

    try {
      await archiveClient(client.id);

      if (editingClient?.id === client.id) {
        setEditingClient(null);
        setFormError(null);
      }

      await loadClients();
    } catch (error) {
      setClientsError(error instanceof Error ? error.message : 'Unable to archive client');
    } finally {
      setArchiveLoadingId(null);
    }
  }

  const tenantLabel =
    (typeof activeTenant?.name === 'string' && activeTenant.name.trim().length > 0 && activeTenant.name) ||
    (typeof activeTenant?.slug === 'string' && activeTenant.slug.trim().length > 0 && activeTenant.slug) ||
    'current tenant';

  return (
    <AppPage>
      <PageHeader
        description={`Manage client records for ${tenantLabel}. This UI stays intentionally lightweight for the single-owner launch.`}
        eyebrow="DCA Books Lite"
        title="Clients"
      />

      <PageSection
        description="Create a client with the fields the backend currently supports. Edit and archive actions stay simple and tenant-scoped."
        title={editingClient ? `Edit ${editingClient.name}` : 'Create client'}
      >
        <div ref={formContainerRef}>
          <ClientForm
            error={formError}
            initialClient={editingClient}
            key={editingClient?.id ?? 'create-client'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingClient(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </PageSection>

      <PageSection
        actions={
          !initialLoading && clientsError ? (
            <Button onClick={() => void loadClients()} variant="secondary">
              Retry
            </Button>
          ) : null
        }
        description="Client records come from the backend Clients API using your authenticated session and active tenant context."
        title="Client list"
      >
        {initialLoading ? <LoadingState message="Loading clients..." /> : null}

        {!initialLoading && clientsError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadClients()} variant="secondary">
                Retry
              </Button>
            }
            message={clientsError}
            title="Unable to load clients"
          />
        ) : null}

        {!initialLoading && !clientsError && clients.length === 0 ? (
          <EmptyState
            message="No clients have been created yet. Use the form above to add your first client."
            title="No clients yet"
          />
        ) : null}

        {!initialLoading && !clientsError && clients.length > 0 ? (
          <ClientsTable
            archiveLoadingId={archiveLoadingId}
            clients={clients}
            editingClientId={editingClient?.id ?? null}
            onArchive={(client) => void handleArchive(client)}
            onEdit={(client) => {
              setEditingClient(client);
              setFormError(null);
            }}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
