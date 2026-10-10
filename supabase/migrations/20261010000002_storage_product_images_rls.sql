-- ==============================================================================
-- CHINNI JEWELS — Supabase Storage: "product-images" Bucket & RLS Policies
-- ==============================================================================

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

-- 3. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies for "product-images" to prevent conflicts
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
