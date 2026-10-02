CREATE TABLE `diary_days` (
	`owner` text NOT NULL,
	`date` text NOT NULL,
	`content` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `date`)
);
