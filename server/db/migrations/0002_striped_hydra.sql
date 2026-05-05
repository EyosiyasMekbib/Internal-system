CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tin" text NOT NULL,
	"full_name" text NOT NULL,
	"pension_id" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"basic_salary" numeric(12, 2) NOT NULL,
	"transport_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" numeric(2, 0) NOT NULL,
	"year" numeric(4, 0) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"transport_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxable_transport_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"over_time" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_taxable_benefit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_taxable" numeric(12, 2) NOT NULL,
	"tax_withheld" numeric(12, 2) NOT NULL,
	"cost_sharing" numeric(12, 2) NOT NULL,
	"employer_pension" numeric(12, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;