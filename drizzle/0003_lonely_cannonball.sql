CREATE TABLE `solana_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`projectId` int NOT NULL,
	`method` varchar(64) NOT NULL,
	`cluster` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`latencyMs` int,
	`detail` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `solana_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `solana_request_project_idx` ON `solana_requests` (`projectId`);--> statement-breakpoint
CREATE INDEX `solana_request_organization_idx` ON `solana_requests` (`organizationId`);