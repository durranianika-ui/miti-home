ALTER TABLE "product_try_on_runs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_checkout_payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_ledger_entries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_refunds" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_reservations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_top_ups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wallet_webhook_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "product_try_on_runs" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_accounts" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_checkout_payments" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_ledger_entries" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_refunds" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_reservations" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_top_ups" CASCADE;--> statement-breakpoint
DROP TABLE "wallet_webhook_events" CASCADE;--> statement-breakpoint
DROP INDEX "orders_razorpay_order_id_unique";--> statement-breakpoint
DROP INDEX "orders_razorpay_payment_id_unique";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "sizes" SET DEFAULT '["Standard"]'::json;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_order_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_payment_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_signature";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "wallet_paid_paise";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "external_paid_paise";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "gender";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "fabric";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "gsm";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_premium";--> statement-breakpoint
DROP TYPE "public"."product_category";--> statement-breakpoint
DROP TYPE "public"."product_gender";--> statement-breakpoint
DROP TYPE "public"."wallet_entry_type";--> statement-breakpoint
DROP TYPE "public"."wallet_reservation_status";--> statement-breakpoint
DROP TYPE "public"."wallet_top_up_status";