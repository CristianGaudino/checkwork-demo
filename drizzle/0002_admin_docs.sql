CREATE TABLE `admin_docs` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
