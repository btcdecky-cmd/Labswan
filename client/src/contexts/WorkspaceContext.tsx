import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Workspace = { id: number; name: string; slug: string; role: "owner" | "admin" | "developer" | "viewer" | "billing" };
type Project = { id: number; organizationId: number; name: string; slug: string; status: "active" | "paused" | "archived" };

type WorkspaceContextValue = {
  workspaces: Workspace[];
  projects: Project[];
  activeWorkspace: Workspace | null;
  activeProject: Project | null;
  loading: boolean;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveProject: (project: Project | null) => void;
  createWorkspace: () => void;
  createProject: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WORKSPACE_KEY = "swanlab-active-workspace";
const PROJECT_KEY = "swanlab-active-project";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const workspaceQuery = trpc.workspace.list.useQuery(undefined, { enabled: isAuthenticated });
  const [workspaceId, setWorkspaceId] = useState<number | null>(() => Number(localStorage.getItem(WORKSPACE_KEY)) || null);
  const workspaces = (workspaceQuery.data ?? []) as Workspace[];
  const activeWorkspace = useMemo(() => workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0] ?? null, [workspaces, workspaceId]);
  const projectQuery = trpc.workspace.projects.useQuery({ organizationId: activeWorkspace?.id ?? 1 }, { enabled: Boolean(isAuthenticated && activeWorkspace) });
  const projects = (projectQuery.data ?? []) as Project[];
  const [projectId, setProjectId] = useState<number | null>(() => Number(localStorage.getItem(PROJECT_KEY)) || null);
  const activeProject = useMemo(() => projects.find((project) => project.id === projectId) ?? projects[0] ?? null, [projects, projectId]);

  useEffect(() => {
    if (activeWorkspace && activeWorkspace.id !== workspaceId) setWorkspaceId(activeWorkspace.id);
  }, [activeWorkspace, workspaceId]);
  useEffect(() => {
    if (activeProject && activeProject.id !== projectId) setProjectId(activeProject.id);
  }, [activeProject, projectId]);
  useEffect(() => { if (workspaceId) localStorage.setItem(WORKSPACE_KEY, String(workspaceId)); }, [workspaceId]);
  useEffect(() => { if (projectId) localStorage.setItem(PROJECT_KEY, String(projectId)); }, [projectId]);

  const createWorkspaceMutation = trpc.workspace.create.useMutation({
    onSuccess: async (workspace) => { await utils.workspace.list.invalidate(); setWorkspaceId(workspace.id); toast.success(`Workspace ${workspace.name} created.`); },
    onError: (error) => toast.error(error.message),
  });
  const createProjectMutation = trpc.workspace.createProject.useMutation({
    onSuccess: async (project) => { await utils.workspace.projects.invalidate(); setProjectId(project.id); toast.success(`Project ${project.name} created.`); },
    onError: (error) => toast.error(error.message),
  });

  const createWorkspace = () => {
    if (!isAuthenticated) return toast.info("Sign in before creating a workspace.");
    const name = window.prompt("Workspace name");
    if (name?.trim()) createWorkspaceMutation.mutate({ name: name.trim() });
  };
  const createProject = () => {
    if (!isAuthenticated) return toast.info("Sign in before creating a project.");
    if (!activeWorkspace) return createWorkspace();
    const name = window.prompt("Project name");
    if (name?.trim()) createProjectMutation.mutate({ organizationId: activeWorkspace.id, name: name.trim() });
  };

  return <WorkspaceContext.Provider value={{ workspaces, projects, activeWorkspace, activeProject, loading: workspaceQuery.isLoading || projectQuery.isLoading, setActiveWorkspace: (workspace) => { setWorkspaceId(workspace.id); setProjectId(null); }, setActiveProject: (project) => setProjectId(project?.id ?? null), createWorkspace, createProject }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
