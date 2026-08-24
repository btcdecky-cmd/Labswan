CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`secretHash` varchar(255) NOT NULL,
	`scopes` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int,
	`actorUserId` int,
	`action` varchar(96) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(96),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `managed_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`kind` varchar(40) NOT NULL,
	`name` varchar(96) NOT NULL,
	`provider` varchar(48),
	`state` varchar(32) NOT NULL DEFAULT 'pending',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managed_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`organizationRole` enum('owner','admin','developer','viewer','billing') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_member_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(96) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(96) NOT NULL,
	`projectStatus` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_organization_slug_unique` UNIQUE(`organizationId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `webhook_endpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`url` varchar(2048) NOT NULL,
	`events` text NOT NULL,
	`signingSecretHash` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_endpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `api_key_project_idx` ON `api_keys` (`projectId`);--> statement-breakpoint
CREATE INDEX `api_key_organization_idx` ON `api_keys` (`organizationId`);--> statement-breakpoint
CREATE INDEX `audit_organization_idx` ON `audit_events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `audit_project_idx` ON `audit_events` (`projectId`);--> statement-breakpoint
CREATE INDEX `resource_project_idx` ON `managed_resources` (`projectId`);--> statement-breakpoint
CREATE INDEX `resource_organization_idx` ON `managed_resources` (`organizationId`);--> statement-breakpoint
CREATE INDEX `organization_member_user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `project_organization_idx` ON `projects` (`organizationId`);--> statement-breakpoint
CREATE INDEX `webhook_project_idx` ON `webhook_endpoints` (`projectId`);--> statement-breakpoint
CREATE INDEX `webhook_organization_idx` ON `webhook_endpoints` (`organizationId`);