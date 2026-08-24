import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assertProjectMembership,
  createAlertPolicy,
  createAuditEvent,
  createManagedResource,
  createOrganizationForUser,
  createProjectApiKey,
  createProjectForMember,
  createWebhookEndpoint,
  getMembershipRole,
  listAlertPolicies,
  listApiKeys,
  listAuditEvents,
  listManagedResources,
  listMonitoringSummary,
  listProjectsForMember,
  listSolanaRequests,
  listUsageSummary,
  listWebhookDeliveries,
  listWebhookEndpoints,
  listWorkspacesForUser,
  revokeProjectApiKey,
  recordSolanaRequest,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import { buildAssistantFallback, getIntegrationStatuses, getSolanaRpcClient } from "../services/integrationStatus";

const organizationName = z.string().trim().min(2).max(80);
const projectName = z.string().trim().min(2).max(80);

const editableRoles = new Set(["owner", "admin", "developer"]);
const managerRoles = new Set(["owner", "admin"]);
const projectScopeInput = z.object({ organizationId: z.number().int().positive(), projectId: z.number().int().positive() });

async function assertWorkspaceRole(userId: number, organizationId: number) {
  const role = await getMembershipRole(userId, organizationId);
  if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization." });
  return role;
}

async function assertProjectRole(userId: number, organizationId: number, projectId: number) {
  const access = await assertProjectMembership(userId, organizationId, projectId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "The selected project is outside your workspace membership." });
  return access;
}

export const swanlabRouter = router({
  platform: router({
    integrations: protectedProcedure.query(() => getIntegrationStatuses()),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: organizationName })).mutation(async ({ ctx, input }) => {
      const workspace = await createOrganizationForUser(ctx.user.id, input.name);
      if (!workspace) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Workspace storage is not available." });
      return workspace;
    }),
    projects: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertWorkspaceRole(ctx.user.id, input.organizationId);
      return listProjectsForMember(ctx.user.id, input.organizationId);
    }),
    createProject: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), name: projectName })).mutation(async ({ ctx, input }) => {
      const role = await assertWorkspaceRole(ctx.user.id, input.organizationId);
      if (!editableRoles.has(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your organization role cannot create projects." });
      const project = await createProjectForMember(ctx.user.id, input.organizationId, input.name);
      if (!project) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Project storage is not available." });
      return project;
    }),
  }),
  resources: router({
    list: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listManagedResources(input.organizationId, input.projectId);
    }),
    create: protectedProcedure.input(projectScopeInput.extend({ kind: z.enum(["database", "network", "solana_cluster", "wallet", "environment"]), name: z.string().trim().min(2).max(96), provider: z.string().trim().max(48).optional(), state: z.enum(["pending", "verified", "connected", "disabled"]).default("pending"), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!editableRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot change project resources." });
      const resource = await createManagedResource({ ...input, actorUserId: ctx.user.id });
      if (!resource) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Resource storage is not available." });
      return resource;
    }),
  }),
  developer: router({
    apiKeys: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listApiKeys(input.organizationId, input.projectId);
    }),
    createApiKey: protectedProcedure.input(projectScopeInput.extend({ label: z.string().trim().min(2).max(80), scopes: z.array(z.enum(["resources:read", "resources:write", "rpc:read", "webhooks:write"])).min(1).max(4) })).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!editableRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot create API keys." });
      const key = await createProjectApiKey({ ...input, actorUserId: ctx.user.id });
      if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "API-key storage is not available." });
      return key;
    }),
    revokeApiKey: protectedProcedure.input(projectScopeInput.extend({ keyId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!editableRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot revoke API keys." });
      return { revoked: await revokeProjectApiKey(input.organizationId, input.projectId, input.keyId, ctx.user.id) };
    }),
    webhooks: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listWebhookEndpoints(input.organizationId, input.projectId);
    }),
    deliveries: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listWebhookDeliveries(input.organizationId, input.projectId);
    }),
    createWebhook: protectedProcedure.input(projectScopeInput.extend({ url: z.string().url().max(2048), events: z.array(z.enum(["resource.updated", "usage.threshold", "solana.activity", "alert.triggered"])).min(1).max(4) })).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!editableRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot create webhook endpoints." });
      const webhook = await createWebhookEndpoint({ ...input, actorUserId: ctx.user.id });
      if (!webhook) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Webhook storage is not available." });
      return webhook;
    }),
    audit: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listAuditEvents(input.organizationId, input.projectId);
    }),
  }),
  observability: router({
    monitoring: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listMonitoringSummary(input.organizationId, input.projectId);
    }),
    usage: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listUsageSummary(input.organizationId, input.projectId);
    }),
  }),
  alerts: router({
    list: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listAlertPolicies(input.organizationId, input.projectId);
    }),
    create: protectedProcedure.input(projectScopeInput.extend({ name: z.string().trim().min(2).max(96), source: z.enum(["database", "network", "solana", "usage"]), metric: z.string().trim().min(2).max(64), threshold: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!managerRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owners and admins can define alert policies." });
      const policy = await createAlertPolicy({ ...input, actorUserId: ctx.user.id });
      if (!policy) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Alert-policy storage is not available." });
      return policy;
    }),
    testOwnerDelivery: protectedProcedure.input(projectScopeInput).mutation(async ({ ctx, input }) => {
      const access = await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      if (!managerRoles.has(access.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owners and admins can test notification delivery." });
      const delivered = await notifyOwner({ title: "SwanLab delivery test", content: `Owner notification test for project ${access.project.name}. No production alert was triggered.` });
      await createAuditEvent({ organizationId: input.organizationId, projectId: input.projectId, actorUserId: ctx.user.id, action: "alert_delivery.tested", entityType: "alert_policy", metadata: { delivered } });
      return { delivered };
    }),
  }),
  solana: router({
    requests: protectedProcedure.input(projectScopeInput).query(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      return listSolanaRequests(input.organizationId, input.projectId);
    }),
    testRpc: protectedProcedure.input(projectScopeInput).mutation(async ({ ctx, input }) => {
      await assertProjectRole(ctx.user.id, input.organizationId, input.projectId);
      const rpc = getSolanaRpcClient();
      const cluster = process.env.SOLANA_CLUSTER ?? "mainnet-beta";
      if (!rpc) {
        await recordSolanaRequest({ ...input, method: "getHealth", cluster, status: "not_configured", detail: "HELIUS_RPC_URL is not configured." });
        return { status: "not_configured" as const, detail: "HELIUS_RPC_URL is not configured." };
      }
      const startedAt = Date.now();
      try {
        const health = await rpc.getHealth().send();
        const status = health === "ok" ? "ready" as const : "attention" as const;
        const detail = `RPC returned ${health}.`;
        await recordSolanaRequest({ ...input, method: "getHealth", cluster, status, latencyMs: Date.now() - startedAt, detail });
        return { status, detail };
      } catch {
        const detail = "The configured RPC endpoint did not return a healthy response.";
        await recordSolanaRequest({ ...input, method: "getHealth", cluster, status: "attention", latencyMs: Date.now() - startedAt, detail });
        return { status: "attention" as const, detail };
      }
    }),
  }),
  assistant: router({
    reply: protectedProcedure.input(z.object({ prompt: z.string().trim().min(3).max(1200) })).mutation(async ({ input }) => {
      const fallback = buildAssistantFallback(input.prompt);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are SwanLab's precise infrastructure assistant. Do not claim an integration or live metric exists unless the user supplies it. Give secure, concise developer guidance in Markdown." },
            { role: "user", content: input.prompt },
          ],
        });
        const content = response.choices[0]?.message?.content;
        return { reply: typeof content === "string" && content.trim() ? content : fallback, source: "assistant" as const };
      } catch {
        return { reply: fallback, source: "fallback" as const };
      }
    }),
  }),
});
