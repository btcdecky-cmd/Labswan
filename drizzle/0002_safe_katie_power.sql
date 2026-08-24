CREATE TABLE `alert_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(96) NOT NULL,
	`source` varchar(48) NOT NULL,
	`metric` varchar(64) NOT NULL,
	`threshold` int NOT NULL,
	`recipientMode` varchar(32) NOT NULL DEFAULT 'owner',
	`schedule_cron_task_uid` varchar(65),
	`isEnabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`source` varchar(48) NOT NULL,
	`metric` varchar(64) NOT NULL,
	`value` int NOT NULL,
	`measuredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitoring_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`category` varchar(48) NOT NULL,
	`quantity` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`webhookEndpointId` int NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`statusCode` int,
	`state` varchar(32) NOT NULL DEFAULT 'queued',
	`attemptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `alert_policy_project_idx` ON `alert_policies` (`projectId`);--> statement-breakpoint
CREATE INDEX `alert_policy_task_uid_idx` ON `alert_policies` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `monitoring_project_metric_idx` ON `monitoring_samples` (`projectId`,`metric`);--> statement-breakpoint
CREATE INDEX `monitoring_organization_idx` ON `monitoring_samples` (`organizationId`);--> statement-breakpoint
CREATE INDEX `usage_project_category_idx` ON `usage_records` (`projectId`,`category`);--> statement-breakpoint
CREATE INDEX `usage_organization_idx` ON `usage_records` (`organizationId`);--> statement-breakpoint
CREATE INDEX `delivery_endpoint_idx` ON `webhook_deliveries` (`webhookEndpointId`);--> statement-breakpoint
CREATE INDEX `delivery_project_idx` ON `webhook_deliveries` (`projectId`);