import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';

export function DashboardPage() {
  return (
    <AppPage>
      <PageHeader
        description="This protected workspace is ready for the first business modules. Shared layout, session display, and navigation are now in place."
        eyebrow="DCA Books Lite"
        title="Dashboard"
      />
      <PageSection
        description="No business data is shown in this phase. The dashboard stays intentionally lightweight until module work begins."
        title="Workspace status"
      >
        <EmptyState
          message="Dashboard coming soon. Clients, projects, services, invoices, and payments will be added in later phases."
          title="Dashboard coming soon"
        />
      </PageSection>
    </AppPage>
  );
}
