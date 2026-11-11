CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL,
	`actor` text NOT NULL,
	`area` text NOT NULL,
	`summary` text NOT NULL,
	`ref_kind` text,
	`ref_id` text,
	`ref_label` text
);
--> statement-breakpoint
CREATE INDEX `activity_at_idx` ON `activity` (`at`);