import { useEffect, useRef, useState } from 'react';
import { listClients } from '../lib/clients-api';
import { archiveProject, createProject, listProjects, updateProject } from '../lib/projects-api';
import { ProjectForm } from '../components/projects/ProjectForm';
import { ProjectsTable } from '../components/projects/ProjectsTable';
import { AppPage } from '../components/page/AppPage';
import { PageHeader } from '../components/page/PageHeader';
import { PageSection } from '../components/page/PageSection';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import type { ClientRecord } from '../types/client';
import type { ProjectMutationInput, ProjectRecord } from '../types/project';

export function ProjectsPage() {
  const { activeTenant } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  async function loadProjectsPage() {
    if (!activeTenant?.id) {
      setProjects([]);
      setClients([]);
      setProjectsError('No active tenant context is available for projects.');
      setInitialLoading(false);
      return;
    }

    setProjectsError(null);

    try {
      const [projectsResult, clientsResult] = await Promise.all([
        listProjects(),
        listClients({ limit: 100 }),
      ]);

      setProjects(projectsResult.projects);
      setClients(clientsResult.clients);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : 'Failed to load projects');
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadProjectsPage();
  }, [activeTenant?.id]);

  useEffect(() => {
    if (!editingProject) {
      return;
    }

    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [editingProject]);

  async function handleSubmit(input: ProjectMutationInput) {
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, input);
      } else {
        await createProject(input);
      }

      setEditingProject(null);
      await loadProjectsPage();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save project');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(project: ProjectRecord) {
    const confirmed = window.confirm(`Archive project "${project.name}"?`);
    if (!confirmed) {
      return;
    }

    setArchiveLoadingId(project.id);
    setProjectsError(null);

    try {
      await archiveProject(project.id);

      if (editingProject?.id === project.id) {
        setEditingProject(null);
        setFormError(null);
      }

      await loadProjectsPage();
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : 'Unable to archive project');
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
        description={`Manage project records for ${tenantLabel}. Projects can optionally link to an existing client in the same tenant.`}
        eyebrow="DCA Books Lite"
        title="Projects"
      />

      <PageSection
        description="Create a project with the fields the backend currently supports. Edit and archive actions stay small and tenant-scoped."
        title={editingProject ? `Edit ${editingProject.name}` : 'Create project'}
      >
        <div ref={formContainerRef}>
          <ProjectForm
            clients={clients}
            error={formError}
            initialProject={editingProject}
            key={editingProject?.id ?? 'create-project'}
            loading={formLoading}
            onCancelEdit={() => {
              setEditingProject(null);
              setFormError(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </PageSection>

      <PageSection
        actions={
          !initialLoading && projectsError ? (
            <Button onClick={() => void loadProjectsPage()} variant="secondary">
              Retry
            </Button>
          ) : null
        }
        description="Project records come from the backend Projects API using your authenticated session and active tenant context."
        title="Project list"
      >
        {initialLoading ? <LoadingState message="Loading projects..." /> : null}

        {!initialLoading && projectsError ? (
          <ErrorState
            action={
              <Button onClick={() => void loadProjectsPage()} variant="secondary">
                Retry
              </Button>
            }
            message={projectsError}
            title="Unable to load projects"
          />
        ) : null}

        {!initialLoading && !projectsError && projects.length === 0 ? (
          <EmptyState
            message="No projects have been created yet. Use the form above to add your first project."
            title="No projects yet"
          />
        ) : null}

        {!initialLoading && !projectsError && projects.length > 0 ? (
          <ProjectsTable
            archiveLoadingId={archiveLoadingId}
            editingProjectId={editingProject?.id ?? null}
            onArchive={(project) => void handleArchive(project)}
            onEdit={(project) => {
              setEditingProject(project);
              setFormError(null);
            }}
            projects={projects}
          />
        ) : null}
      </PageSection>
    </AppPage>
  );
}
