CREATE TABLE "billing_checkouts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"attempt_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" text,
	"status" text DEFAULT 'creating' NOT NULL,
	"subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"paddle_customer_id" text,
	"provisioning_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"creation_started_at" timestamp with time zone,
	"last_reconciled_at" timestamp with time zone,
	"last_reconcile_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customers_paddle_id_unique" UNIQUE("paddle_customer_id")
);
--> statement-breakpoint
CREATE TABLE "paddle_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"paddle_subscription_id" text PRIMARY KEY NOT NULL,
	"source_transaction_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"price_id" text,
	"current_period_end" timestamp with time zone,
	"scheduled_action" text,
	"scheduled_change_at" timestamp with time zone,
	"provider_updated_at" timestamp with time zone NOT NULL,
	"last_event_occurred_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_user_id_billing_customers_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."billing_customers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paddle_customer_id_billing_customers_paddle_customer_id_fk" FOREIGN KEY ("paddle_customer_id") REFERENCES "public"."billing_customers"("paddle_customer_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkouts_transaction_unique" ON "billing_checkouts" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkouts_attempt_unique" ON "billing_checkouts" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provisioning_unique" ON "billing_customers" USING btree ("provisioning_id");--> statement-breakpoint
CREATE INDEX "billing_customers_reconcile_idx" ON "billing_customers" USING btree ("last_reconcile_attempt_at");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("paddle_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_source_transaction_unique" ON "subscriptions" USING btree ("source_transaction_id");