import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Activity, AlertTriangle, Check, Copy, Database, KeyRound, Network, Plus, RadioTower, RefreshCw, ShieldCheck, WalletCards, Webhook } from "lucide-react";

type ResourceKind = "database" | "network" | "solana_cluster";

function noProject() { toast.info("Create and select a project to manage this workspace resource."); }

export function ProjectGate({ children }: { children: React.ReactNode }) {
  const { activeWorkspace, activeProject, createWorkspace, createProject } = useWorkspace();
  if (activeProject) return <>{children}</>;
  return <div className="swan-empty"><span className="swan-mark"/><div><h2 className="text-lg font-semibold tracking-[-0.035em]">{activeWorkspace ? "Create your first project" : "Create a workspace first"}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-black/60">Project selection activates organization-scoped infrastructure, developer credentials, monitoring, and alert configuration.</p></div><button type="button" onClick={activeWorkspace ? createProject : createWorkspace} className="swan-button-black">{activeWorkspace ? "Create project" : "Create workspace"}<Plus className="size-3.5"/></button></div>;
}

export function ResourceManager({ kind, label, description, icon: Icon }: { kind: ResourceKind; label: string; description: string; icon: typeof Database }) {
  const { activeWorkspace, activeProject } = useWorkspace();
  const utils = trpc.useUtils();
  const resources = trpc.resources.list.useQuery({ organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 }, { enabled: Boolean(activeWorkspace && activeProject) });
  const create = trpc.resources.create.useMutation({ onSuccess: async () => { await utils.resources.list.invalidate(); toast.success(`${label} registered.`); }, onError: (error) => toast.error(error.message) });
  const createResource = () => {
    if (!activeWorkspace || !activeProject) return noProject();
    const name = window.prompt(`${label} name`);
    if (!name?.trim()) return;
    const provider = window.prompt("Provider or connection reference (optional)")?.trim() || undefined;
    create.mutate({ organizationId: activeWorkspace.id, projectId: activeProject.id, kind, name: name.trim(), provider, state: "pending" });
  };
  const visible = (resources.data ?? []).filter((resource) => resource.kind === kind);
  return <section className="border border-black bg-white"><div className="flex items-start justify-between gap-4 border-b border-black p-4"><div><p className="swan-eyebrow">{kind} register</p><h3 className="mt-1 text-sm font-semibold">{label}</h3><p className="mt-1 text-xs text-black/55">{description}</p></div><Icon className="size-4"/></div><div className="divide-y divide-black/15">{resources.isLoading ? <p className="p-4 text-sm text-black/55">Loading project resources…</p> : visible.length ? visible.map((resource) => <div key={resource.id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">{resource.name}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-black/50">{resource.provider ?? "provider not set"}</p></div><span className={`swan-status ${resource.state === "connected" || resource.state === "verified" ? "swan-status-ready" : "swan-status-pending"}`}>{resource.state}</span></div>) : <p className="p-4 text-sm text-black/55">No {label.toLowerCase()} resources registered.</p>}</div><div className="border-t border-black p-3"><button type="button" onClick={createResource} disabled={create.isPending} className="swan-button-black">{create.isPending ? "Registering…" : `Register ${label}`}<Plus className="size-3.5"/></button></div></section>;
}

export function DeveloperManager() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const utils = trpc.useUtils();
  const input = { organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 };
  const enabled = Boolean(activeWorkspace && activeProject);
  const keys = trpc.developer.apiKeys.useQuery(input, { enabled });
  const webhooks = trpc.developer.webhooks.useQuery(input, { enabled });
  const audit = trpc.developer.audit.useQuery(input, { enabled });
  const createKey = trpc.developer.createApiKey.useMutation({ onSuccess: async (key) => { await utils.developer.apiKeys.invalidate(); await navigator.clipboard?.writeText(key.secret); toast.success("API key created and copied. It will not be shown again."); }, onError: (error) => toast.error(error.message) });
  const revoke = trpc.developer.revokeApiKey.useMutation({ onSuccess: async () => { await utils.developer.apiKeys.invalidate(); await utils.developer.audit.invalidate(); toast.success("API key revoked."); }, onError: (error) => toast.error(error.message) });
  const createWebhook = trpc.developer.createWebhook.useMutation({ onSuccess: async (hook) => { await utils.developer.webhooks.invalidate(); await utils.developer.audit.invalidate(); await navigator.clipboard?.writeText(hook.signingSecret); toast.success("Webhook created; signing secret copied once."); }, onError: (error) => toast.error(error.message) });
  const addKey = () => { if (!enabled) return noProject(); const label = window.prompt("API key label"); if (label?.trim()) createKey.mutate({ ...input, label: label.trim(), scopes: ["resources:read", "rpc:read"] }); };
  const addWebhook = () => { if (!enabled) return noProject(); const url = window.prompt("Webhook HTTPS URL"); if (url?.trim()) createWebhook.mutate({ ...input, url: url.trim(), events: ["resource.updated", "usage.threshold"] }); };
  return <div className="grid gap-5 xl:grid-cols-2"><section className="border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">Scoped access</p><h3 className="mt-1 text-sm font-semibold">API keys</h3></div><KeyRound className="size-4"/></div><div className="divide-y divide-black/15">{keys.data?.length ? keys.data.map((key) => <div className="flex items-center justify-between gap-3 p-4" key={key.id}><div><p className="text-sm font-medium">{key.label}</p><p className="mt-1 font-mono text-[10px] uppercase text-black/50">{key.keyPrefix}••• · {key.revokedAt ? "revoked" : "active"}</p></div>{!key.revokedAt && <button type="button" onClick={() => revoke.mutate({ ...input, keyId: key.id })} className="border border-black px-2 py-1 font-mono text-[9px] uppercase hover:bg-black hover:text-white">Revoke</button>}</div>) : <p className="p-4 text-sm text-black/55">No project-scoped keys.</p>}</div><div className="border-t border-black p-3"><button type="button" onClick={addKey} className="swan-button-black">Create key <Plus className="size-3.5"/></button></div></section><section className="border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">Signed delivery</p><h3 className="mt-1 text-sm font-semibold">Webhook endpoints</h3></div><Webhook className="size-4"/></div><div className="divide-y divide-black/15">{webhooks.data?.length ? webhooks.data.map((webhook) => <div className="p-4" key={webhook.id}><p className="truncate text-sm font-medium">{webhook.url}</p><p className="mt-1 font-mono text-[10px] uppercase text-black/50">{webhook.status} · {JSON.parse(webhook.events).join(", ")}</p></div>) : <p className="p-4 text-sm text-black/55">No delivery endpoints.</p>}</div><div className="border-t border-black p-3"><button type="button" onClick={addWebhook} className="swan-button-black">Add endpoint <Plus className="size-3.5"/></button></div></section><section className="border border-black bg-white xl:col-span-2"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">Audit trail</p><h3 className="mt-1 text-sm font-semibold">Recent project actions</h3></div><ShieldCheck className="size-4"/></div><div className="divide-y divide-black/15">{audit.data?.length ? audit.data.slice(0, 5).map((event) => <div className="flex items-center justify-between gap-4 p-3" key={event.id}><span className="font-mono text-[10px] uppercase tracking-[0.07em]">{event.action}</span><span className="text-xs text-black/50">{new Date(event.createdAt).toLocaleString()}</span></div>) : <p className="p-4 text-sm text-black/55">Credential and endpoint actions will appear here.</p>}</div></section></div>;
}

export function DeliveryHistory() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const deliveries = trpc.developer.deliveries.useQuery({ organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 }, { enabled: Boolean(activeWorkspace && activeProject) });
  return <section className="mt-5 border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">Delivery history</p><h3 className="mt-1 text-sm font-semibold">Webhook event status</h3></div><Webhook className="size-4"/></div><div className="divide-y divide-black/15">{deliveries.isLoading ? <p className="p-4 text-sm text-black/55">Loading delivery history…</p> : deliveries.data?.length ? deliveries.data.map((delivery) => <div className="flex items-center justify-between gap-4 p-4" key={delivery.id}><div><p className="text-sm font-medium">{delivery.eventType}</p><p className="mt-1 font-mono text-[10px] uppercase text-black/50">{new Date(delivery.createdAt).toLocaleString()}{delivery.statusCode ? ` · HTTP ${delivery.statusCode}` : ""}</p></div><span className={`swan-status ${delivery.state === "delivered" ? "swan-status-ready" : delivery.state === "failed" ? "swan-status-attention" : "swan-status-pending"}`}>{delivery.state}</span></div>) : <p className="p-4 text-sm leading-6 text-black/55">No webhook deliveries have been recorded for this project.</p>}</div></section>;
}

export function SolanaManager() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const input = { organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 };
  const test = trpc.solana.testRpc.useMutation({ onSuccess: (result) => toast[result.status === "ready" ? "success" : "info"](result.detail), onError: (error) => toast.error(error.message) });
  const utils = trpc.useUtils();
  const recordWallet = trpc.resources.create.useMutation({ onSuccess: async () => { await utils.resources.list.invalidate(); toast.success("Public wallet identity connected to the project context."); }, onError: (error) => toast.error(error.message) });
  const connectWallet = async () => {
    if (!activeWorkspace || !activeProject) return noProject();
    const provider = (window as Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
    if (!provider?.connect) return toast.info("No compatible browser wallet was detected. Install or unlock a Solana wallet, then try again.");
    try {
      const connection = await provider.connect();
      const address = connection.publicKey.toString();
      recordWallet.mutate({ organizationId: activeWorkspace.id, projectId: activeProject.id, kind: "wallet", name: address, provider: provider.isPhantom ? "phantom" : "browser wallet", state: "connected" });
    } catch {
      toast.error("Wallet connection was not approved.");
    }
  };
  return <div className="grid gap-5 xl:grid-cols-2"><ResourceManager kind="solana_cluster" label="Solana cluster" description="Project-scoped cluster selection and provider metadata." icon={WalletCards}/><section className="border border-black bg-black p-5 text-white"><RadioTower className="size-5"/><p className="mt-8 font-mono text-[10px] uppercase tracking-[0.1em] text-white/55">RPC health check</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">Test the centralized Helius transport.</h3><p className="mt-3 text-sm leading-6 text-white/65">SwanLab evaluates the server-side RPC URL only after a project is selected. The URL never reaches the browser.</p><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => activeProject ? test.mutate(input) : noProject()} disabled={test.isPending} className="border border-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">{test.isPending ? "Testing…" : "Test RPC"}<RefreshCw className="ml-2 inline size-3"/></button><button type="button" onClick={connectWallet} disabled={recordWallet.isPending} className="border border-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">{recordWallet.isPending ? "Connecting…" : "Connect wallet"}</button></div></section></div>;
}

export function SolanaRequestHistory() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const requests = trpc.solana.requests.useQuery({ organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 }, { enabled: Boolean(activeWorkspace && activeProject) });
  return <section className="mt-5 border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">On-chain request visibility</p><h3 className="mt-1 text-sm font-semibold">Recent server-recorded RPC requests</h3></div><RadioTower className="size-4"/></div><div className="divide-y divide-black/15">{requests.isLoading ? <p className="p-4 text-sm text-black/55">Loading request history…</p> : requests.data?.length ? requests.data.map((request) => <div className="flex items-center justify-between gap-4 p-4" key={request.id}><div><p className="text-sm font-medium">{request.method} <span className="font-normal text-black/50">/ {request.cluster}</span></p><p className="mt-1 font-mono text-[10px] uppercase text-black/50">{new Date(request.createdAt).toLocaleString()}{request.latencyMs ? ` · ${request.latencyMs} ms` : ""}</p></div><span className={`swan-status ${request.status === "ready" ? "swan-status-ready" : request.status === "attention" ? "swan-status-attention" : "swan-status-pending"}`}>{request.status}</span></div>) : <p className="p-4 text-sm leading-6 text-black/55">No Solana RPC requests have been recorded. Use the RPC health test to add the first request record.</p>}</div></section>;
}

export function ObservabilityManager({ mode }: { mode: "monitoring" | "usage" }) {
  const { activeWorkspace, activeProject } = useWorkspace();
  const utils = trpc.useUtils();
  const input = { organizationId: activeWorkspace?.id ?? 1, projectId: activeProject?.id ?? 1 };
  const enabled = Boolean(activeWorkspace && activeProject);
  const monitoring = trpc.observability.monitoring.useQuery(input, { enabled });
  const usage = trpc.observability.usage.useQuery(input, { enabled });
  const alerts = trpc.alerts.list.useQuery(input, { enabled });
  const createAlert = trpc.alerts.create.useMutation({ onSuccess: async () => { await utils.alerts.list.invalidate(); toast.success("Alert policy saved; deployment is needed before recurring delivery can be scheduled."); }, onError: (error) => toast.error(error.message) });
  const testDelivery = trpc.alerts.testOwnerDelivery.useMutation({ onSuccess: (result) => toast[result.delivered ? "success" : "info"](result.delivered ? "Owner delivery test accepted." : "Notification service did not accept delivery."), onError: (error) => toast.error(error.message) });
  const addPolicy = () => { if (!enabled) return noProject(); const threshold = Number(window.prompt("Threshold value", "80")); if (!Number.isFinite(threshold) || threshold <= 0) return; createAlert.mutate({ ...input, name: "Infrastructure attention", source: "usage", metric: "api_requests", threshold }); };
  const entries = mode === "monitoring" ? monitoring.data?.map((sample) => [sample.metric, String(sample.latestValue), sample.lastMeasuredAt ? new Date(sample.lastMeasuredAt).toLocaleString() : "No samples"]) : usage.data?.map((entry) => [entry.category, String(entry.total), "Recorded usage"]);
  return <ProjectGate><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-4"><div><p className="swan-eyebrow">{mode === "monitoring" ? "Measurement ledger" : "Consumption ledger"}</p><h3 className="mt-1 text-sm font-semibold">{mode === "monitoring" ? "Observed platform signals" : "Recorded project usage"}</h3></div>{mode === "monitoring" ? <Activity className="size-4"/> : <RadioTower className="size-4"/>}</div><div className="divide-y divide-black/15">{entries?.length ? entries.map(([name, value, detail]) => <div className="flex items-center justify-between gap-4 p-4" key={name}><div><p className="text-sm font-medium">{name}</p><p className="mt-1 font-mono text-[10px] uppercase text-black/50">{detail}</p></div><p className="text-lg font-semibold">{value}</p></div>) : <p className="p-4 text-sm leading-6 text-black/55">No persisted {mode === "monitoring" ? "measurements" : "usage records"} exist for this project. Integration services write records when connected.</p>}</div></section><section className="border border-black bg-red-600 p-5 text-white"><AlertTriangle className="size-5"/><p className="mt-8 font-mono text-[10px] uppercase tracking-[0.1em] text-white/70">Attention policies</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">{alerts.data?.length ?? 0} policy record{alerts.data?.length === 1 ? "" : "s"}</h3><p className="mt-3 text-sm leading-6 text-white/80">Policies are persisted now. Automated recurring delivery remains intentionally inactive until the deployed workspace is connected to a trusted data source.</p><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={addPolicy} className="border border-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">Add policy</button><button type="button" onClick={() => enabled ? testDelivery.mutate(input) : noProject()} className="border border-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">Test owner delivery</button></div></section></div></ProjectGate>;
}
