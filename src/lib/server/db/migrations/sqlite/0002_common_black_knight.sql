CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`recipients` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` text NOT NULL,
	`success` integer,
	`error` text,
	`related_kind` text NOT NULL,
	`related_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_templates_key_unique` ON `email_templates` (`key`);--> statement-breakpoint
CREATE TABLE `office_email_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`office_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `office_email_recipients_office_email_idx` ON `office_email_recipients` (`office_id`,`email`);--> statement-breakpoint
CREATE TABLE `order_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`is_other` integer DEFAULT false NOT NULL,
	`other_description` text,
	`quantity_ordered` integer NOT NULL,
	`quantity_received` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_receive_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`received_by_user_id` text NOT NULL,
	`received_at` text NOT NULL,
	`shipping_receipt_path` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`confirmation_id` text NOT NULL,
	`office_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_at` text,
	`cancelled_by_user_id` text,
	`cancellation_message` text,
	FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_confirmation_id_unique` ON `orders` (`confirmation_id`);