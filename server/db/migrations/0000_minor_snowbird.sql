CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tin` text,
	`vat_reg_no` text,
	`phone` text,
	`address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`tin` text NOT NULL,
	`full_name` text NOT NULL,
	`pension_id` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`basic_salary` text NOT NULL,
	`transport_allowance` text DEFAULT '0' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`stock_qty` text DEFAULT '0' NOT NULL,
	`cost_price` text DEFAULT '0' NOT NULL,
	`sale_price` text DEFAULT '0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`year` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_runs_month_year_unique` ON `payroll_runs` (`month`,`year`);--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_run_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`basic_salary` text NOT NULL,
	`transport_allowance` text DEFAULT '0' NOT NULL,
	`taxable_transport_allowance` text DEFAULT '0' NOT NULL,
	`over_time` text DEFAULT '0' NOT NULL,
	`other_taxable_benefit` text DEFAULT '0' NOT NULL,
	`total_taxable` text NOT NULL,
	`tax_withheld` text NOT NULL,
	`cost_sharing` text NOT NULL,
	`employer_pension` text NOT NULL,
	`net_pay` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_order_id` text NOT NULL,
	`item_id` text NOT NULL,
	`country_of_origin` text,
	`brand_name` text,
	`qty` text NOT NULL,
	`unit_price` text NOT NULL,
	`total` text NOT NULL,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`date` text NOT NULL,
	`voucher_no` text,
	`subtotal` text DEFAULT '0' NOT NULL,
	`vat_amount` text DEFAULT '0' NOT NULL,
	`grand_total` text DEFAULT '0' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_orders_supplier_idx` ON `purchase_orders` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `sales_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`sales_order_id` text NOT NULL,
	`item_id` text NOT NULL,
	`country_of_origin` text,
	`brand_name` text,
	`cost_price` text DEFAULT '0' NOT NULL,
	`qty` text NOT NULL,
	`unit_price` text NOT NULL,
	`vat_amount` text NOT NULL,
	`total` text NOT NULL,
	FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`date` text NOT NULL,
	`fs_no` text NOT NULL,
	`subtotal` text DEFAULT '0' NOT NULL,
	`vat_amount` text DEFAULT '0' NOT NULL,
	`grand_total` text DEFAULT '0' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_orders_customer_idx` ON `sales_orders` (`customer_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tin` text,
	`vat_reg_no` text,
	`phone` text,
	`address` text,
	`created_at` integer NOT NULL
);
