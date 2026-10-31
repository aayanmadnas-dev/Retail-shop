-- ==============================================================================
-- Migration: Soft Delete for Products and Customers
-- Adds is_active column to products and customers tables.
-- Existing records are preserved (defaulted to TRUE = active).
-- ==============================================================================

-- 1. Add is_active to products (safe: existing rows default to TRUE)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add is_active to customers (safe: existing rows default to TRUE)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Indexes for fast active-only queries
CREATE INDEX IF NOT EXISTS idx_products_is_active
  ON public.products(business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customers_is_active
  ON public.customers(business_id, is_active);

-- 4. Also add customer_phone column to sales table if not already present
--    (Was added in the billing changes; safe to re-run)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

