-- ==============================================================================
-- RetailFlow: Multi-Business Retail Billing & Inventory SaaS Database Schema
-- Supabase PostgreSQL Reference Architecture
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BUSINESSES TABLE
-- Master registry of retail businesses/tenants.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON public.businesses(email);

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE
-- Maps Supabase Auth users (auth.users) to application roles and tenant businesses.
-- Roles: 'super_admin' (null business_id) or 'business_owner' (linked to business_id).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'business_owner')),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- Catalog of inventory items per business. SKU and Barcode are optional.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    category TEXT,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'pcs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(business_id, sku);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS TABLE
-- Customer directory per business with ledger support.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(business_id, phone);

-- ------------------------------------------------------------------------------
-- 5. SALES TABLE
-- Point-of-sale invoice receipts per business.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'other')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(business_id, created_at);

-- ------------------------------------------------------------------------------
-- 6. SALE_ITEMS TABLE
-- Line items included in each sales invoice.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_business_id ON public.sale_items(business_id);

-- ------------------------------------------------------------------------------
-- 7. STOCK_MOVEMENTS TABLE
-- Complete audit trail of stock additions, restocks, POS deductions, and adjustments.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL,
    movement_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON public.stock_movements(business_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's business_id
CREATE OR REPLACE FUNCTION public.current_user_business_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT business_id FROM public.profiles
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user's business is active
CREATE OR REPLACE FUNCTION public.is_business_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.businesses b
        JOIN public.profiles p ON p.business_id = b.id
        WHERE p.user_id = auth.uid() AND b.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- RLS: businesses
-- ------------------------------------------------------------------------------
CREATE POLICY "Super admins can view all businesses"
ON public.businesses FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage businesses"
ON public.businesses FOR ALL
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Business owners can view their own business"
ON public.businesses FOR SELECT
TO authenticated
USING (id = public.current_user_business_id());

-- ------------------------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Super admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- RLS: products
-- ------------------------------------------------------------------------------
CREATE POLICY "Business data isolation for products"
ON public.products FOR ALL
TO authenticated
USING (
    (business_id = public.current_user_business_id() AND public.is_business_active())
    OR public.is_super_admin()
);

-- ------------------------------------------------------------------------------
-- RLS: customers
-- ------------------------------------------------------------------------------
CREATE POLICY "Business data isolation for customers"
ON public.customers FOR ALL
TO authenticated
USING (
    (business_id = public.current_user_business_id() AND public.is_business_active())
    OR public.is_super_admin()
);

-- ------------------------------------------------------------------------------
-- RLS: sales
-- ------------------------------------------------------------------------------
CREATE POLICY "Business data isolation for sales"
ON public.sales FOR ALL
TO authenticated
USING (
    (business_id = public.current_user_business_id() AND public.is_business_active())
    OR public.is_super_admin()
);

-- ------------------------------------------------------------------------------
-- RLS: sale_items
-- ------------------------------------------------------------------------------
CREATE POLICY "Business data isolation for sale_items"
ON public.sale_items FOR ALL
TO authenticated
USING (
    (business_id = public.current_user_business_id() AND public.is_business_active())
    OR public.is_super_admin()
);

-- ------------------------------------------------------------------------------
-- RLS: stock_movements
-- ------------------------------------------------------------------------------
CREATE POLICY "Business data isolation for stock_movements"
ON public.stock_movements FOR ALL
TO authenticated
USING (
    (business_id = public.current_user_business_id() AND public.is_business_active())
    OR public.is_super_admin()
);

