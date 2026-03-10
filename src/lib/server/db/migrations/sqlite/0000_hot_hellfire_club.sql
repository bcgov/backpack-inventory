CREATE TABLE `current_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`office_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `current_inventory_office_product_idx` ON `current_inventory` (`office_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `inventory_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason_code` text,
	`reconciled_by_user_id` text,
	`reconciled_at` text,
	`reconciler_notes` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reconciled_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_counts_transaction_id_unique` ON `inventory_counts` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `offices` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`office_number` text NOT NULL,
	`name` text NOT NULL,
	`office_type` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offices_number_name_idx` ON `offices` (`office_number`,`name`);--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_name_unique` ON `product_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_slug_unique` ON `product_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_other` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_category_idx` ON `products` (`slug`,`category_id`);--> statement-breakpoint
CREATE TABLE `redistribution_details` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`destination_office_id` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_office_id`) REFERENCES `offices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redistribution_details_transaction_id_unique` ON `redistribution_details` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regions_name_unique` ON `regions` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `regions_slug_unique` ON `regions` (`slug`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_slug_unique` ON `teams` (`slug`);--> statement-breakpoint
CREATE TABLE `transaction_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`other_description` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`confirmation_id` text NOT NULL,
	`action` text NOT NULL,
	`office_id` text NOT NULL,
	`performed_by_user_id` text NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	`shipping_receipt_path` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_confirmation_id_unique` ON `transactions` (`confirmation_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`team_id` text,
	`region_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);