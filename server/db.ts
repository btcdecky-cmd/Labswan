import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomBytes } from "node:crypto";
import { InsertUser, alertPolicies, apiKeys, auditEvents, managedResources, monitoringSamples, organizationMembers, organizations, projects, solanaRequests, usageRecords, users, webhookDeliveries, webhookEndpoints } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "workspace";
}

function uniqueSlug(value: string) {
  return `${slugify(value)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listWorkspacesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId));
}

export async function getMembershipRole(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ role: organizationMembers.role }).from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId))).limit(1);
  return result[0]?.role ?? null;
}

export async function createOrganizationForUser(userId: number, name: string) {
  const db = await getDb();
  if (!db) return null;
  const slug = uniqueSlug(name);
  const result = await db.insert(organizations).values({ name, slug, createdByUserId: userId });
  const organizationId = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  if (!organizationId) throw new Error("Organization creation did not return an identifier.");
  await db.insert(organizationMembers).values({ organizationId, userId, role: "owner" });
  return { id: organizationId, name, slug, role: "owner" as const };
}

export async function listProjectsForMember(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const membership = await getMembershipRole(userId, organizationId);
  if (!membership) return [];
  return db.select().from(projects).where(eq(projects.organizationId, organizationId));
}

export async function createProjectForMember(userId: number, organizationId: number, name: string) {
  const db = await getDb();
  if (!db) return null;
  const slug = uniqueSlug(name);
  const result = await db.insert(projects).values({ organizationId, name, slug, createdByUserId: userId });
  const projectId = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  if (!projectId) throw new Error("Project creation did not return an identifier.");
  return { id: projectId, organizationId, name, slug, status: "active" as const };
}

export async function assertProjectMembership(userId: number, organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const membership = await getMembershipRole(userId, organizationId);
  if (!membership) return null;
  const project = (await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))).limit(1))[0];
  return project ? { project, role: membership } : null;
}

export async function createAuditEvent(input: { organizationId: number; projectId?: number; actorUserId?: number; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values({ ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : null });
}

export async function listManagedResources(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(managedResources).where(and(eq(managedResources.organizationId, organizationId), eq(managedResources.projectId, projectId))).orderBy(desc(managedResources.updatedAt));
}

export async function createManagedResource(input: { organizationId: number; projectId: number; kind: string; name: string; provider?: string; state?: string; metadata?: Record<string, unknown>; actorUserId: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(managedResources).values({ ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : null });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  await createAuditEvent({ organizationId: input.organizationId, projectId: input.projectId, actorUserId: input.actorUserId, action: "resource.created", entityType: "managed_resource", entityId: String(id), metadata: { kind: input.kind, provider: input.provider } });
  return id ? { id, ...input } : null;
}

export async function listApiKeys(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: apiKeys.id, label: apiKeys.label, keyPrefix: apiKeys.keyPrefix, scopes: apiKeys.scopes, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt })
    .from(apiKeys).where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.projectId, projectId))).orderBy(desc(apiKeys.createdAt));
}

export async function createProjectApiKey(input: { organizationId: number; projectId: number; label: string; scopes: string[]; actorUserId: number }) {
  const db = await getDb();
  if (!db) return null;
  const secret = `sl_live_${randomBytes(24).toString("base64url")}`;
  const result = await db.insert(apiKeys).values({ organizationId: input.organizationId, projectId: input.projectId, label: input.label, keyPrefix: secret.slice(0, 14), secretHash: createHash("sha256").update(secret).digest("hex"), scopes: JSON.stringify(input.scopes), createdByUserId: input.actorUserId });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  await createAuditEvent({ organizationId: input.organizationId, projectId: input.projectId, actorUserId: input.actorUserId, action: "api_key.created", entityType: "api_key", entityId: String(id), metadata: { label: input.label, scopes: input.scopes } });
  return { id, secret, label: input.label, keyPrefix: secret.slice(0, 14), scopes: input.scopes };
}

export async function revokeProjectApiKey(organizationId: number, projectId: number, keyId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId), eq(apiKeys.projectId, projectId)));
  const changed = Number((result as unknown as Array<{ affectedRows: number }>)[0]?.affectedRows ?? 0) > 0;
  if (changed) await createAuditEvent({ organizationId, projectId, actorUserId, action: "api_key.revoked", entityType: "api_key", entityId: String(keyId) });
  return changed;
}

export async function listWebhookEndpoints(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: webhookEndpoints.id, url: webhookEndpoints.url, events: webhookEndpoints.events, status: webhookEndpoints.status, createdAt: webhookEndpoints.createdAt, updatedAt: webhookEndpoints.updatedAt })
    .from(webhookEndpoints).where(and(eq(webhookEndpoints.organizationId, organizationId), eq(webhookEndpoints.projectId, projectId))).orderBy(desc(webhookEndpoints.updatedAt));
}

export async function createWebhookEndpoint(input: { organizationId: number; projectId: number; url: string; events: string[]; actorUserId: number }) {
  const db = await getDb();
  if (!db) return null;
  const signingSecret = `whsec_${randomBytes(24).toString("base64url")}`;
  const result = await db.insert(webhookEndpoints).values({ organizationId: input.organizationId, projectId: input.projectId, url: input.url, events: JSON.stringify(input.events), signingSecretHash: createHash("sha256").update(signingSecret).digest("hex") });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  await createAuditEvent({ organizationId: input.organizationId, projectId: input.projectId, actorUserId: input.actorUserId, action: "webhook.created", entityType: "webhook_endpoint", entityId: String(id), metadata: { url: input.url, events: input.events } });
  return { id, signingSecret, url: input.url, events: input.events, status: "active" as const };
}

export async function listWebhookDeliveries(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookDeliveries).where(and(eq(webhookDeliveries.organizationId, organizationId), eq(webhookDeliveries.projectId, projectId))).orderBy(desc(webhookDeliveries.createdAt)).limit(25);
}

export async function listAuditEvents(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).where(and(eq(auditEvents.organizationId, organizationId), eq(auditEvents.projectId, projectId))).orderBy(desc(auditEvents.createdAt)).limit(30);
}

export async function listMonitoringSummary(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ metric: monitoringSamples.metric, latestValue: sql<number>`max(${monitoringSamples.value})`, lastMeasuredAt: sql<Date>`max(${monitoringSamples.measuredAt})` })
    .from(monitoringSamples).where(and(eq(monitoringSamples.organizationId, organizationId), eq(monitoringSamples.projectId, projectId))).groupBy(monitoringSamples.metric);
}

export async function listUsageSummary(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ category: usageRecords.category, total: sql<number>`sum(${usageRecords.quantity})` })
    .from(usageRecords).where(and(eq(usageRecords.organizationId, organizationId), eq(usageRecords.projectId, projectId))).groupBy(usageRecords.category);
}

export async function listAlertPolicies(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertPolicies).where(and(eq(alertPolicies.organizationId, organizationId), eq(alertPolicies.projectId, projectId))).orderBy(desc(alertPolicies.updatedAt));
}

export async function createAlertPolicy(input: { organizationId: number; projectId: number; name: string; source: string; metric: string; threshold: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(alertPolicies).values({ organizationId: input.organizationId, projectId: input.projectId, name: input.name, source: input.source, metric: input.metric, threshold: input.threshold });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  await createAuditEvent({ organizationId: input.organizationId, projectId: input.projectId, actorUserId: input.actorUserId, action: "alert_policy.created", entityType: "alert_policy", entityId: String(id), metadata: { metric: input.metric, threshold: input.threshold } });
  return { id, ...input, isEnabled: false };
}

export async function listSolanaRequests(organizationId: number, projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(solanaRequests).where(and(eq(solanaRequests.organizationId, organizationId), eq(solanaRequests.projectId, projectId))).orderBy(desc(solanaRequests.createdAt)).limit(25);
}

export async function recordSolanaRequest(input: { organizationId: number; projectId: number; method: string; cluster: string; status: string; latencyMs?: number; detail?: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(solanaRequests).values(input);
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return id ? { id, ...input } : null;
}
