# Admin & Catalogue Walkthrough

## Entry points

- Admin shell: `app/admin/layout.tsx` (+ `app/admin/_components`, `_lib`)
- Guard: every admin page calls `requireAdminPage()` (`lib/admin-guard.ts`); every admin action calls `requireAdmin()` (`lib/auth-server.ts`)
- Actions: `lib/actions/admin.ts`, `lib/actions/combos.ts`, `lib/actions/marketing.ts`
- Input normalisation: `lib/admin-product-input.ts`

Layouts and pages render in parallel in the App Router, so the layout redirect alone does not stop a page's data queries — keep the page-level guard on new admin pages.

## Products

Products belong to one category (by slug) and any number of collections. Options: a primary option list with its label (Size / Dimensions / Length / Character…) and optional colours/finishes with hex swatches and per-finish images. Variant stock is the source of truth; product stock is recalculated from variants. Deleting a product with order history archives it instead (keeps order records intact).

Every product write rebuilds the search document (including category and collection names), refreshes recommendations and revalidates the product, its category and collection pages, listings, sitemap and merchant feed.

## Categories & collections

Categories drive the storefront navigation (only categories with visible products appear). Renaming a category slug moves its products. Collections have their own merchandising order (drag-free up/down ordering in the admin) and power `/collections/<slug>` pages and the homepage feature.

## Sets ("Complete the set")

A set pairs two products with a saving that the checkout quote applies automatically when both are bought together through the set.

## Coupons & store credit

Coupons: fixed or percentage, optional cap, minimum order, validity window, usage limit, first-order-only, or tied to a customer. Store credit is issued from an order as a single-use `CREDIT-XXXXXXXX` code.
