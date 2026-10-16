CREATE TABLE `dag_edges` (
	`dag_id` integer NOT NULL,
	`from_task_id` integer NOT NULL,
	`to_task_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`dag_id`, `from_task_id`, `to_task_id`),
	FOREIGN KEY (`dag_id`,`from_task_id`) REFERENCES `dag_tasks`(`dag_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dag_id`,`to_task_id`) REFERENCES `dag_tasks`(`dag_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dag_edges_no_self_loop" CHECK("dag_edges"."from_task_id" <> "dag_edges"."to_task_id")
);
--> statement-breakpoint
CREATE INDEX `dag_edges_downstream_idx` ON `dag_edges` (`dag_id`,`from_task_id`);--> statement-breakpoint
CREATE INDEX `dag_edges_upstream_idx` ON `dag_edges` (`dag_id`,`to_task_id`);--> statement-breakpoint
CREATE TABLE `dag_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dag_id` integer NOT NULL,
	`current_task_id` integer NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`trigger_type` text DEFAULT 'manual' NOT NULL,
	`run_key` text,
	`input` text,
	`output` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`dag_id`) REFERENCES `dags`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_task_id`) REFERENCES `dag_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dag_runs_run_key_idx` ON `dag_runs` (`dag_id`,`run_key`);--> statement-breakpoint
CREATE INDEX `dag_runs_status_created_idx` ON `dag_runs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `dag_runs_dag_created_idx` ON `dag_runs` (`dag_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `dag_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dag_id` integer NOT NULL,
	`key` text(100) NOT NULL,
	`name` text(150) NOT NULL,
	`type` text(50) NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`dag_id`) REFERENCES `dags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dag_tasks_dag_key_idx` ON `dag_tasks` (`dag_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `dag_tasks_dag_id_id_idx` ON `dag_tasks` (`dag_id`,`id`);--> statement-breakpoint
CREATE INDEX `dag_tasks_dag_type_idx` ON `dag_tasks` (`dag_id`,`type`);--> statement-breakpoint
CREATE TABLE `dags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dags_name_idx` ON `dags` (`name`);