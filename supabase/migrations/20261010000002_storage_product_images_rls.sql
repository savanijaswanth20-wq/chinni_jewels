-- ==============================================================================
-- CHINNI JEWELS — Supabase Storage: "product-images" Bucket & RLS Policies
-- ==============================================================================

-- 0. Ensure Required Extensions & Tables Exist (Prevents 42P01 error on fresh projects)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure products table exists
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Signature Gold Coin',
    slug TEXT UNIQUE,
    sku TEXT UNIQUE,
    description TEXT,
    weight NUMERIC(10,3) DEFAULT 1.000,
    purity TEXT DEFAULT '24K',
    making_charges NUMERIC(10,2) DEFAULT 0,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 9520,
    price NUMERIC(10,2) DEFAULT 9520,
    stock_quantity INT DEFAULT 10,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    image_path TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure product_images table exists
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Ensure "product-images" bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- 2. Ensure Products table has image_url and image_path columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_path TEXT;

-- 3. Storage objects table already has RLS enabled by default in Supabase.
-- Clean up any existing policies for "product-images" to prevent conflicts
DROP POLICY IF EXISTS "Public Read product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Public Access product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete product-images" ON storage.objects;

-- 5. Customer Policy: Public can SELECT (view/download) images from "product-images"
CREATE POLICY "Public Read product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- 6. Admin Policy: Authenticated Admins/Staff can INSERT (upload) new images
CREATE POLICY "Admin Upload product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid()) AND LOWER(role) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  )
);

-- 7. Admin Policy: Authenticated Admins/Staff can UPDATE (replace/upsert) images
CREATE POLICY "Admin Update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid()) AND LOWER(role) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid()) AND LOWER(role) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  )
);

-- 8. Admin Policy: Authenticated Admins/Staff can DELETE images
CREATE POLICY "Admin Delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = (SELECT auth.uid()) AND LOWER(role) IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  )
);

-- 9. Enable RLS on Products and Product Images Tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin All Products" ON public.products;
CREATE POLICY "Admin All Products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Product Images" ON public.product_images;
CREATE POLICY "Public Read Product Images" ON public.product_images FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin All Product Images" ON public.product_images;
CREATE POLICY "Admin All Product Images" ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. Seed Initial Sample Products (if empty)
INSERT INTO public.products (id, name, slug, sku, weight, purity, selling_price, featured, active, image_url) VALUES 
('e1111111-1111-1111-1111-111111111111', 'Signature Gold Coin', 'signature-gold-coin', 'CJ-GC-001', 1.000, '24K', 9520.00, true, true, 'assets/hero_gold_coin.png'),
('e2222222-2222-2222-2222-222222222222', 'Filigree Gold Pendant', 'filigree-gold-pendant', 'CJ-JP-002', 1.000, '24K', 9680.00, true, true, 'assets/product_gold_pendant.png'),
('e3333333-3333-3333-3333-333333333333', 'Gold Coin Gift Box', 'gold-coin-gift-box', 'CJ-GG-003', 1.000, '24K', 9820.00, true, true, 'assets/product_gold_gift.png'),
('e4444444-4444-4444-4444-444444444444', 'Temple Gold Coin', 'temple-gold-coin', 'CJ-GC-004', 1.000, '24K', 9520.00, false, true, 'assets/featured_product.png'),
('e5555555-5555-5555-5555-555555555555', 'Classic Gold Bangle', 'classic-gold-bangle', 'CJ-JB-005', 1.000, '22K', 8750.00, false, true, 'assets/product_gold_bangle.png'),
('e6666666-6666-6666-6666-666666666666', 'Pure Gold Bar', 'pure-gold-bar', 'CJ-GB-006', 1.000, '24K', 9620.00, false, true, 'assets/product_gold_bar.png')
ON CONFLICT (id) DO NOTHING;

-- 11. Safely Register Tables for Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_images;
  END IF;
END $$;

