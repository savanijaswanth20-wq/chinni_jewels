-- ====================================================================
-- CHINNI JEWELS — Supabase SQL Migration: Products & Storage Security
-- ====================================================================

-- 1. Alter Products Table (Ensure price and image_url columns exist)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Sync Existing Products Table Data
UPDATE public.products p
SET price = p.selling_price
WHERE p.price IS NULL OR p.price = 0.0;

UPDATE public.products p
SET image_url = COALESCE(
  (SELECT pi.image_url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1),
  'assets/hero_gold_coin.png'
)
WHERE p.image_url IS NULL;

-- 3. Create public "product-images" Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES 
('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS on Products and Storage (already enabled on products, but good practice)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 5. Products Table Security Policies
-- Drop outdated permissive or conflicting policies
DROP POLICY IF EXISTS "Admin Full Access Products" ON public.products;
DROP POLICY IF EXISTS "Public Read Active Products" ON public.products;

-- Create Secure Read Policy (Public can see active, admins can see all)
CREATE POLICY "Public Read Active Products" ON public.products
FOR SELECT USING (
  active = true
  OR (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
      )
      OR EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
);

-- Create Admin/Staff Write Policies
CREATE POLICY "Admin Insert Products" ON public.products
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Admin Update Products" ON public.products
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Admin Delete Products" ON public.products
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- 6. Storage Security Policies for "product-images" Bucket
-- Drop old or conflicting policies if any exist
DROP POLICY IF EXISTS "Public Access product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update product-images Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete product-images Objects" ON storage.objects;

-- Create Public SELECT Policy for product-images
CREATE POLICY "Public Access product-images Objects" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Create Admin Upload Policy
CREATE POLICY "Admin Upload product-images Objects" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Create Admin Update Policy
CREATE POLICY "Admin Update product-images Objects" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Create Admin Delete Policy
CREATE POLICY "Admin Delete product-images Objects" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);
