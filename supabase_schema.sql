-- ====================================================================
-- CHINNI JEWELS — Complete Supabase PostgreSQL Schema & RLS Setup
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Core Tables

-- Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    weight NUMERIC(10,3) DEFAULT 1.000,
    purity TEXT DEFAULT '24K',
    gold_rate NUMERIC(10,2),
    making_charges NUMERIC(10,2) DEFAULT 0,
    gst NUMERIC(10,2) DEFAULT 0,
    selling_price NUMERIC(10,2) NOT NULL,
    stock_quantity INT DEFAULT 10,
    low_stock_threshold INT DEFAULT 2,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gold Rates Table
CREATE TABLE IF NOT EXISTS public.gold_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purity TEXT NOT NULL CHECK (purity IN ('24K', '22K', '18K')),
    rate_per_gram NUMERIC(10,2) NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    available_quantity INT DEFAULT 10 CHECK (available_quantity >= 0),
    reserved_quantity INT DEFAULT 0 CHECK (reserved_quantity >= 0),
    sold_quantity INT DEFAULT 0 CHECK (sold_quantity >= 0),
    damaged_quantity INT DEFAULT 0 CHECK (damaged_quantity >= 0),
    low_stock_threshold INT DEFAULT 2,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Transactions Table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'RESERVED', 'RELEASED', 'SOLD', 'DAMAGED', 'ADJUSTMENT')),
    quantity INT NOT NULL,
    previous_quantity INT DEFAULT 0,
    new_quantity INT DEFAULT 0,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'WHATSAPP_COD',
    payment_status TEXT DEFAULT 'PENDING',
    order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned')),
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity INT DEFAULT 1,
    weight NUMERIC(10,3),
    purity TEXT,
    gold_rate NUMERIC(10,2),
    making_charges NUMERIC(10,2),
    gst NUMERIC(10,2),
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);

-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Settings Table
CREATE TABLE IF NOT EXISTS public.website_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    brand_name TEXT DEFAULT 'CHINNI JEWELS',
    logo_url TEXT,
    favicon_url TEXT,
    tagline TEXT DEFAULT 'Pure Gold Jewels — 1 Gram Gold Specialist',
    description TEXT DEFAULT 'Purveyors of certified 1 Gram Gold coins, jewellery and gifts.',
    hero_image_url TEXT DEFAULT 'assets/hero_gold_coin.png',
    hero_title TEXT DEFAULT 'PURE GOLD.\nSIMPLY YOURS.',
    hero_subtitle TEXT DEFAULT 'Discover our exquisite 1 Gram Gold collection, crafted for celebrations, gifting and timeless moments.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homepage Sections Table
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_type TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Settings Table
CREATE TABLE IF NOT EXISTS public.contact_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    phone TEXT DEFAULT '+91 63047 02907',
    email TEXT DEFAULT 'hello@chinnijewels.com',
    address TEXT DEFAULT 'Chinni Jewels Corporate Suite, Hyderabad, India',
    map_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Settings Table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    phone_number TEXT DEFAULT '916304702907',
    order_message_template TEXT DEFAULT 'Hello! I would like to place an order for {{productName}} (Qty: {{quantity}}). Order Total: ₹{{total}}. Delivery Address: {{address}}, {{phone}}.',
    enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Links Table
CREATE TABLE IF NOT EXISTS public.social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- Testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name TEXT NOT NULL,
    rating INT DEFAULT 5,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Library Table
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_type TEXT,
    file_size INT,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'STAFF')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. Storage Buckets Setup
-- ====================================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
('media', 'media', true),
('products', 'products', true),
('homepage', 'homepage', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. Enable Row Level Security (RLS)
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS Policies
-- ====================================================================

-- Public SELECT Policies (Customer Website Visibility)
CREATE POLICY "Public Read Active Products" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "Public Read Active Categories" ON public.categories FOR SELECT USING (active = true);
CREATE POLICY "Public Read Product Images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Public Read Gold Rates" ON public.gold_rates FOR SELECT USING (true);
CREATE POLICY "Public Read Website Settings" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Homepage Sections" ON public.homepage_sections FOR SELECT USING (active = true);
CREATE POLICY "Public Read Contact Settings" ON public.contact_settings FOR SELECT USING (true);
CREATE POLICY "Public Read WhatsApp Settings" ON public.whatsapp_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Social Links" ON public.social_links FOR SELECT USING (active = true);
CREATE POLICY "Public Read Testimonials" ON public.testimonials FOR SELECT USING (active = true);

-- Public INSERT for Orders & Order Items (Customer Order Placement)
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Order Items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Customer Specific Policies
CREATE POLICY "User View Own Profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Admin / Authenticated Full Access Policies
CREATE POLICY "Admin Full Access Products" ON public.products FOR ALL USING (true);
CREATE POLICY "Admin Full Access Categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Admin Full Access Images" ON public.product_images FOR ALL USING (true);
CREATE POLICY "Admin Full Access Gold Rates" ON public.gold_rates FOR ALL USING (true);
CREATE POLICY "Admin Full Access Inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Admin Full Access Inventory Transactions" ON public.inventory_transactions FOR ALL USING (true);
CREATE POLICY "Admin Full Access Orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Admin Full Access Order Items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Admin Full Access Settings" ON public.website_settings FOR ALL USING (true);
CREATE POLICY "Admin Full Access Homepage Sections" ON public.homepage_sections FOR ALL USING (true);
CREATE POLICY "Admin Full Access WhatsApp Settings" ON public.whatsapp_settings FOR ALL USING (true);
CREATE POLICY "Admin Full Access Media" ON public.media FOR ALL USING (true);
CREATE POLICY "Admin Full Access Audit Logs" ON public.audit_logs FOR ALL USING (true);

-- Storage Buckets RLS Policies
CREATE POLICY "Public Access Storage Objects" ON storage.objects FOR SELECT USING (bucket_id IN ('media', 'products', 'homepage'));
CREATE POLICY "Public Upload Storage Objects" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('media', 'products', 'homepage'));
CREATE POLICY "Public Update Storage Objects" ON storage.objects FOR UPDATE USING (bucket_id IN ('media', 'products', 'homepage'));
CREATE POLICY "Public Delete Storage Objects" ON storage.objects FOR DELETE USING (bucket_id IN ('media', 'products', 'homepage'));

-- ====================================================================
-- 6. Initial Seed Data
-- ====================================================================

-- Initial Gold Rates
INSERT INTO public.gold_rates (purity, rate_per_gram) VALUES 
('24K', 9240.00),
('22K', 8470.00),
('18K', 6930.00)
ON CONFLICT DO NOTHING;

-- Initial Website Settings
INSERT INTO public.website_settings (id, brand_name, hero_title, hero_subtitle, hero_image_url) VALUES 
('main', 'CHINNI JEWELS', 'PURE GOLD.\nSIMPLY YOURS.', 'Discover our exquisite 1 Gram Gold collection, crafted for celebrations, gifting and timeless moments.', 'assets/hero_gold_coin.png')
ON CONFLICT (id) DO NOTHING;

-- Initial WhatsApp Settings
INSERT INTO public.whatsapp_settings (id, phone_number, enabled) VALUES 
('main', '916304702907', true)
ON CONFLICT (id) DO NOTHING;

-- Initial Categories
INSERT INTO public.categories (id, name, slug, description) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gold Coins', 'coins', 'Pure 24K 999 Hallmarked 1 Gram Gold Coins'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Gold Jewellery', 'jewellery', 'Intricately crafted 1 Gram Gold Jewellery'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Gold Gifts', 'gifts', 'Precious Gold Gifts for every occasion')
ON CONFLICT (slug) DO NOTHING;

-- Initial Sample Products
INSERT INTO public.products (id, name, slug, sku, weight, purity, selling_price, category_id, featured, active) VALUES 
('p1111111-1111-1111-1111-111111111111', 'Signature Gold Coin', 'signature-gold-coin', 'CJ-GC-001', 1.000, '24K', 9520.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true),
('p2222222-2222-2222-2222-222222222222', 'Filigree Gold Pendant', 'filigree-gold-pendant', 'CJ-JP-002', 1.000, '24K', 9680.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', true, true),
('p3333333-3333-3333-3333-333333333333', 'Gold Coin Gift Box', 'gold-coin-gift-box', 'CJ-GG-003', 1.000, '24K', 9820.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', true, true),
('p4444444-4444-4444-4444-444444444444', 'Temple Gold Coin', 'temple-gold-coin', 'CJ-GC-004', 1.000, '24K', 9520.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', false, true),
('p5555555-5555-5555-5555-555555555555', 'Classic Gold Bangle', 'classic-gold-bangle', 'CJ-JB-005', 1.000, '22K', 8750.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', false, true),
('p6666666-6666-6666-6666-666666666666', 'Pure Gold Bar', 'pure-gold-bar', 'CJ-GB-006', 1.000, '24K', 9620.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', false, true)
ON CONFLICT (slug) DO NOTHING;

-- Initial Product Images
INSERT INTO public.product_images (product_id, image_url, is_primary) VALUES
('p1111111-1111-1111-1111-111111111111', 'assets/hero_gold_coin.png', true),
('p2222222-2222-2222-2222-222222222222', 'assets/product_gold_pendant.png', true),
('p3333333-3333-3333-3333-333333333333', 'assets/product_gold_gift.png', true),
('p4444444-4444-4444-4444-444444444444', 'assets/featured_product.png', true),
('p5555555-5555-5555-5555-555555555555', 'assets/product_gold_bangle.png', true),
('p6666666-6666-6666-6666-666666666666', 'assets/product_gold_bar.png', true)
ON CONFLICT DO NOTHING;

-- Enable Realtime for operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.gold_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;
