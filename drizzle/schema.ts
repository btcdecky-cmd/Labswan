import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const organizationRole = mysqlEnum("organizationRole", ["owner", "admin", "developer", "viewer", "billing"]);
export const projectStatus = mysqlEnum("projectStatus", ["active", "paused", "archived"]);

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: organizationRole.notNull().default("viewer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("organization_member_unique").on(table.organizationId, table.userId),
  index("organization_member_user_idx").on(table.userId),
]);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 96 }).notNull(),
  status: projectStatus.notNull().default("active"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("project_organization_slug_unique").on(table.organizationId, table.slug),
  index("project_organization_idx").on(table.organizationId),
]);

export const managedResources = mysqlTable("managed_resources", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  name: varchar("name", { length: 96 }).notNull(),
  provider: varchar("provider", { length: 48 }),
  state: varchar("state", { length: 32 }).notNull().default("pending"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("resource_project_idx").on(table.projectId), index("resource_organization_idx").on(table.organizationId)]);

export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
  secretHash: varchar("secretHash", { length: 255 }).notNull(),
  scopes: text("scopes").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("api_key_project_idx").on(table.projectId), index("api_key_organization_idx").on(table.organizationId)]);

export const webhookEndpoints = mysqlTable("webhook_endpoints", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  events: text("events").notNull(),
  signingSecretHash: varchar("signingSecretHash", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("webhook_project_idx").on(table.projectId), index("webhook_organization_idx").on(table.organizationId)]);

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId"),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 96 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 96 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_organization_idx").on(table.organizationId), index("audit_project_idx").on(table.projectId)]);

export const webhookDeliveries = mysqlTable("webhook_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  webhookEndpointId: int("webhookEndpointId").notNull(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  statusCode: int("statusCode"),
  state: varchar("state", { length: 32 }).notNull().default("queued"),
  attemptedAt: timestamp("attemptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("delivery_endpoint_idx").on(table.webhookEndpointId), index("delivery_project_idx").on(table.projectId)]);

export const monitoringSamples = mysqlTable("monitoring_samples", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  source: varchar("source", { length: 48 }).notNull(),
  metric: varchar("metric", { length: 64 }).notNull(),
  value: int("value").notNull(),
  measuredAt: timestamp("measuredAt").defaultNow().notNull(),
}, (table) => [index("monitoring_project_metric_idx").on(table.projectId, table.metric), index("monitoring_organization_idx").on(table.organizationId)]);

export const usageRecords = mysqlTable("usage_records", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  quantity: int("quantity").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, (table) => [index("usage_project_category_idx").on(table.projectId, table.category), index("usage_organization_idx").on(table.organizationId)]);

export const alertPolicies = mysqlTable("alert_policies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 96 }).notNull(),
  source: varchar("source", { length: 48 }).notNull(),
  metric: varchar("metric", { length: 64 }).notNull(),
  threshold: int("threshold").notNull(),
  recipientMode: varchar("recipientMode", { length: 32 }).notNull().default("owner"),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  isEnabled: int("isEnabled").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("alert_policy_project_idx").on(table.projectId), index("alert_policy_task_uid_idx").on(table.scheduleCronTaskUid)]);

export const solanaRequests = mysqlTable("solana_requests", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  projectId: int("projectId").notNull(),
  method: varchar("method", { length: 64 }).notNull(),
  cluster: varchar("cluster", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  latencyMs: int("latencyMs"),
  detail: varchar("detail", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("solana_request_project_idx").on(table.projectId), index("solana_request_organization_idx").on(table.organizationId)]);
