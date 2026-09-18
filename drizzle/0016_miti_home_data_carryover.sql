-- Carry any legacy Razorpay references into the provider-agnostic payment columns
UPDATE "orders"
SET "payment_provider" = 'razorpay',
    "payment_reference" = "razorpay_order_id",
    "payment_transaction_id" = "razorpay_payment_id"
WHERE "razorpay_order_id" IS NOT NULL
  AND "payment_reference" IS NULL;
--> statement-breakpoint
-- Product "fabric" becomes the general "material" attribute
UPDATE "products"
SET "material" = "fabric"
WHERE "material" IS NULL
  AND "fabric" IS NOT NULL;
--> statement-breakpoint
-- Apparel catalog rows do not belong to the Miti Home taxonomy; keep them for
-- order history but take them off the storefront.
UPDATE "products"
SET "is_active" = false
WHERE "category"::text IN ('tshirt', 'cargo', 'jogger', 'shirt', 'jeans', 'hoodie', 'jacket', 'shorts', 'accessory');
