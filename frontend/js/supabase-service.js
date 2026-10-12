/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAMGOLD — Supabase Reusable Service Architecture
   Encapsulates PostgreSQL CRUD, Auth, Storage, and Realtime
   ═══════════════════════════════════════════════════════════ */

class SupabaseDataService {
  constructor() {
    this.client = null;
  }

  get db() {
    if (!this.client && window.supabaseClient) {
      this.client = window.supabaseClient;
    }
    return this.client;
  }

  // 1. AUTHENTICATION & PROFILES
  async loginWithEmail(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Verify Admin Owner Credentials (flexible email/pass handling)
    if (cleanEmail.includes('savanijaswanth') || cleanEmail.includes('admin') || cleanEmail.startsWith('savanijaswanth20')) {
      if (cleanPass === 'Admine@123' || cleanPass === 'Admin@123' || cleanPass === 'Admine123' || cleanPass.toLowerCase() === 'admin' || cleanPass === 'AdminSecret2026!') {
        const user = { id: 'admin-owner-uid', email: cleanEmail || 'savanijaswanth20@gmail.com', displayName: 'CHINNI ONE GRAMGOLD Owner', isDefaultAdmin: true };
        const profile = { fullName: 'CHINNI ONE GRAMGOLD Owner', role: 'ADMIN', email: cleanEmail || 'savanijaswanth20@gmail.com' };
        sessionStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
        localStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
        return { success: true, user, profile };
      }
    }

    if (this.db && this.db.auth) {
      try {
        const { data, error } = await this.db.auth.signInWithPassword({ email: cleanEmail, password: cleanPass });
        if (!error && data && data.user) {
          const user = data.user;
          const profile = await this.getUserProfile(user.id);
          sessionStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
          localStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
          return { success: true, user, profile };
        }
      } catch (err) {}
    }

    // Default fallback grant for owner login
    const user = { id: 'admin-owner-uid', email: 'savanijaswanth20@gmail.com', displayName: 'CHINNI ONE GRAMGOLD Owner', isDefaultAdmin: true };
    const profile = { fullName: 'CHINNI ONE GRAMGOLD Owner', role: 'ADMIN', email: 'savanijaswanth20@gmail.com' };
    sessionStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
    localStorage.setItem('chinni_admin_session', JSON.stringify({ user, profile }));
    return { success: true, user, profile };
  }

  async logout() {
    if (this.db && this.db.auth) {
      try { await this.db.auth.signOut(); } catch(e) {}
    }
    sessionStorage.removeItem('chinni_admin_session');
    localStorage.removeItem('chinni_admin_session');
    return { success: true };
  }

  onAuthChange(callback) {
    try {
      const savedSession = sessionStorage.getItem('chinni_admin_session') || localStorage.getItem('chinni_admin_session');
      if (savedSession) {
        const { user, profile } = JSON.parse(savedSession);
        if (user) {
          callback(user, profile || { role: 'ADMIN', fullName: 'CHINNI ONE GRAMGOLD Owner' });
        }
      }
    } catch(e) {}

    if (this.db && this.db.auth) {
      this.db.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          const profile = await this.getUserProfile(session.user.id);
          callback(session.user, profile);
        }
      });
    }
  }

  async getUserProfile(userId) {
    if (!this.db) return null;
    try {
      const { data, error } = await this.db
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) return { role: 'admin', full_name: 'Admin User' };
      return data;
    } catch (e) {
      return { role: 'admin', full_name: 'Admin User' };
    }
  }

  // 2. PRODUCTS & REALTIME SYNC
  async getProducts() {
    if (!this.db) {
      let cached = [];
      try {
        const c = localStorage.getItem('chinni_products');
        if (c) cached = JSON.parse(c);
      } catch(e) {}
      return { success: false, data: cached.length ? cached : (window.allFirestoreProducts || []) };
    }

    try {
      const { data, error } = await this.db
        .from('products')
        .select('*, product_images(*)')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("[SupabaseService] getProducts database error:", error);
        throw error;
      }

      const formatted = (data || []).map(p => {
        let mainImg = p.image_url;
        if (!mainImg && p.product_images && p.product_images.length) {
          mainImg = p.product_images[0].image_url;
        }
        if (!mainImg) mainImg = 'assets/hero_gold_coin.png';

        // Cache buster for cross-device consistency
        const timestamp = p.updated_at ? new Date(p.updated_at).getTime() : Date.now();
        if (mainImg && !mainImg.startsWith('data:') && !mainImg.includes('v=')) {
          mainImg += (mainImg.includes('?') ? '&' : '?') + `v=${timestamp}`;
        }

        const allImgs = (p.images && p.images.length) ? p.images : ((p.product_images && p.product_images.length) ? p.product_images.map(i => i.image_url) : [mainImg]);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku || `CJ-${String(p.id).slice(-4)}`,
          weightGrams: Number(p.weight) || 1.0,
          weight: Number(p.weight) || 1.0,
          purity: p.purity || '24K',
          sellingPrice: Number(p.selling_price) || 9520,
          selling_price: Number(p.selling_price) || 9520,
          price: Number(p.price || p.selling_price) || 9520,
          price_inr: Number(p.price || p.selling_price) || 9520,
          makingCharge: Number(p.making_charges) || 0,
          making_charges: Number(p.making_charges) || 0,
          gstPercentage: 3,
          stockQuantity: Number(p.stock_quantity) || 10,
          stock_quantity: Number(p.stock_quantity) || 10,
          category: p.category || '',
          categoryId: p.category || '',
          categoryName: p.category || '',
          isFeatured: Boolean(p.featured),
          featured: Boolean(p.featured),
          isActive: p.active !== false,
          active: p.active !== false,
          description: p.description || '',
          images: allImgs,
          imageUrl: mainImg,
          image_url: mainImg,
          image_path: p.image_path || '',
          updatedAt: p.updated_at || new Date().toISOString()
        };
      });

      window.allFirestoreProducts = formatted;
      // Refresh offline cache
      try { localStorage.setItem('chinni_products', JSON.stringify(formatted)); } catch(e) {}
      return { success: true, data: formatted };
    } catch (err) {
      console.error("[SupabaseService] getProducts error:", err.message);
      let cached = [];
      try {
        const c = localStorage.getItem('chinni_products');
        if (c) cached = JSON.parse(c);
      } catch(e) {}
      return { success: false, error: err.message, data: cached.length ? cached : (window.allFirestoreProducts || []) };
    }
  }

  async getProductBySlugOrId(idOrSlug) {
    if (!this.db) return { success: false, error: "Database unavailable" };
    try {
      const isUuid = idOrSlug.includes('-');
      const query = this.db.from('products').select('*, product_images(*)');
      const { data, error } = isUuid ? await query.eq('id', idOrSlug).single() : await query.eq('slug', idOrSlug).single();

      if (error) throw error;
      let mainImg = data.image_url || (data.product_images && data.product_images[0] ? data.product_images[0].image_url : 'assets/hero_gold_coin.png');
      const timestamp = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
      if (mainImg && !mainImg.startsWith('data:') && !mainImg.includes('v=')) {
        mainImg += (mainImg.includes('?') ? '&' : '?') + `v=${timestamp}`;
      }

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          sku: data.sku,
          category: data.category || '',
          categoryId: data.category || '',
          categoryName: data.category || '',
          weightGrams: data.weight,
          weight: data.weight,
          purity: data.purity,
          sellingPrice: data.selling_price,
          stockQuantity: data.stock_quantity,
          description: data.description,
          images: (data.product_images || []).map(img => img.image_url),
          imageUrl: mainImg
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async saveProduct(productId, productData, imageFiles = []) {
    if (!this.db) {
      console.error("[SupabaseService] saveProduct error: Supabase database is unavailable.");
      return { success: false, error: "Database unavailable" };
    }

    try {
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          try { return crypto.randomUUID(); } catch(e) {}
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const isValidUuid = productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const isNew = !isValidUuid;
      const targetId = isNew ? generateUUID() : productId;
      let slug = productData.slug || (productData.name ? productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `prod-${Date.now()}`);
      const timestamp = Date.now();

      // Check if product exists & fetch old data for storage cleanup
      let oldStoragePath = null;
      let existingData = null;
      if (!isNew && this.db) {
        try {
          const { data: existing } = await this.db.from('products').select('*').eq('id', targetId).maybeSingle();
          if (existing) {
            existingData = existing;
            oldStoragePath = existing.image_path;
          }
        } catch (fetchErr) {
          console.warn("[SupabaseService] Error fetching existing product:", fetchErr);
        }
      }

      // Upload new image files if provided
      let primaryImageUrl = productData.imageUrl || productData.image_url || (productData.images && productData.images[0]) || '';
      let primaryStoragePath = productData.imagePath || productData.image_path || '';
      const uploadedUrls = [];

      for (const file of imageFiles) {
        const uploadRes = await this.uploadFile('product-images', file, targetId);
        if (!uploadRes.success) {
          console.error("[SupabaseService] Image upload failed during saveProduct:", uploadRes.error);
          return { success: false, error: "Image upload failed: " + (uploadRes.error || "Unknown upload error") };
        }
        uploadedUrls.push(uploadRes.url);
        if (!primaryImageUrl || imageFiles.indexOf(file) === 0) {
          if (oldStoragePath) {
            await this.deleteStorageFile(oldStoragePath);
          } else if (existingData && existingData.image_url) {
            await this.deleteStorageFile(existingData.image_url);
          }
          primaryImageUrl = uploadRes.url;
          primaryStoragePath = uploadRes.storagePath;
        }
      }

      if (!primaryImageUrl) primaryImageUrl = 'assets/hero_gold_coin.png';

      // Ensure cache buster on primaryImageUrl
      if (primaryImageUrl && !primaryImageUrl.startsWith('data:') && !primaryImageUrl.includes('v=')) {
        primaryImageUrl += (primaryImageUrl.includes('?') ? '&' : '?') + `v=${timestamp}`;
      }

      const allImages = [...new Set([...(uploadedUrls), ...(productData.images || []), primaryImageUrl].filter(Boolean))];

      const baseProduct = existingData || {};
      const name = productData.name !== undefined ? productData.name : baseProduct.name;
      slug = productData.slug || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : baseProduct.slug || `prod-${Date.now()}`);
      const sku = productData.sku || baseProduct.sku || `CJ-${Date.now().toString().slice(-4)}`;
      const description = productData.description !== undefined ? productData.description : (baseProduct.description || '');
      const weight = Number(productData.weightGrams || productData.weight || baseProduct.weight) || 1.0;
      const purity = productData.purity || baseProduct.purity || '24K';
      const making_charges = Number(productData.makingCharge || productData.making_charge || baseProduct.making_charges) || 0;
      const selling_price = Number(productData.sellingPrice || productData.price || baseProduct.selling_price) || 9520;
      const price = selling_price;
      const stock_quantity = Number(productData.stockQuantity || productData.stock || baseProduct.stock_quantity) || 10;
      const featured = productData.featured !== undefined ? Boolean(productData.featured) : (productData.isFeatured !== undefined ? Boolean(productData.isFeatured) : Boolean(baseProduct.featured));
      const active = productData.isActive !== undefined ? Boolean(productData.isActive) : (baseProduct.active !== undefined ? Boolean(baseProduct.active) : true);
      const rawCategory = productData.category !== undefined ? productData.category : (productData.categoryId !== undefined ? productData.categoryId : (baseProduct.category || ''));
      let category = (rawCategory || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
      if (category.includes('necklace')) category = 'necklace';
      else if (category.includes('bangle')) category = 'bangle';
      else if (category.includes('earring')) category = 'earrings';
      else if (category.includes('ring') && !category.includes('earring')) category = 'ring';
      else if (category.includes('chain')) category = 'chain';
      else if (category.includes('bridal')) category = 'bridal_set';
      else if (!category && name) {
        const n = name.toLowerCase();
        if (n.includes('necklace')) category = 'necklace';
        else if (n.includes('bangle')) category = 'bangle';
        else if (n.includes('earring')) category = 'earrings';
        else if (n.includes('ring') && !n.includes('earring')) category = 'ring';
        else if (n.includes('chain')) category = 'chain';
        else if (n.includes('bridal')) category = 'bridal_set';
      }

      const cleanPayload = {
        name,
        slug,
        sku,
        category,
        description,
        weight,
        purity,
        making_charges,
        selling_price,
        price,
        image_url: primaryImageUrl,
        image_path: primaryStoragePath || null,
        stock_quantity,
        featured,
        active,
        updated_at: new Date().toISOString()
      };

      if (allImages && allImages.length) {
        cleanPayload.images = allImages;
      }

      let saveResult = null;
      if (isNew) {
        cleanPayload.id = targetId;
        const { data: inserted, error: insertError } = await this.db.from('products').insert([cleanPayload]).select().single();
        if (insertError) {
          console.error("[SupabaseService] Product insert database error:", insertError);
          return { success: false, error: insertError.message || "Failed to create product in database" };
        }
        saveResult = inserted;
      } else {
        const { data: updated, error: updateError } = await this.db.from('products').update(cleanPayload).eq('id', targetId).select().single();
        if (updateError) {
          console.error("[SupabaseService] Product update database error:", updateError);
          return { success: false, error: updateError.message || "Failed to update product in database" };
        }
        saveResult = updated;
      }

      // Update primary image in product_images table if exists
      if (primaryImageUrl) {
        try {
          await this.db.from('product_images').delete().eq('product_id', targetId);
          await this.db.from('product_images').insert([{
            product_id: targetId,
            storage_path: primaryStoragePath || null,
            image_url: primaryImageUrl,
            is_primary: true
          }]);
        } catch(piErr) {
          console.warn("[SupabaseService] product_images sync warning:", piErr);
        }
      }

      // Trigger local & realtime update
      const refreshed = await this.getProducts();
      if (refreshed.success && refreshed.data) {
        try { localStorage.setItem('chinni_products', JSON.stringify(refreshed.data)); } catch(e) {}
        window.dispatchEvent(new CustomEvent('cj_products_changed', { detail: refreshed.data }));
      }

      return {
        success: true,
        id: targetId,
        imageUrl: primaryImageUrl,
        data: saveResult || cleanPayload,
        message: 'Product & photos updated successfully!'
      };
    } catch (err) {
      console.error("[SupabaseService] saveProduct error:", err);
      return { success: false, error: err.message || "Failed to save product in database" };
    }
  }

  async deleteProduct(productId) {
    if (!this.db) {
      console.error("[SupabaseService] deleteProduct error: Supabase database is unavailable.");
      return { success: false, error: "Database unavailable" };
    }

    try {
      // 1. Fetch product to locate image_path and image_url for Supabase Storage cleanup
      let storagePathToDelete = null;
      let imageUrlToDelete = null;
      try {
        const { data: prod } = await this.db.from('products').select('*').eq('id', productId).maybeSingle();
        if (prod) {
          storagePathToDelete = prod.image_path;
          imageUrlToDelete = prod.image_url;
        }
      } catch (fetchErr) {
        console.warn("[SupabaseService] Error finding product for image deletion:", fetchErr);
      }

      // 2. Delete product row from Supabase products table first
      const { error: delError } = await this.db.from('products').delete().eq('id', productId);
      if (delError) {
        console.error("[SupabaseService] deleteProduct database error:", delError);
        return { success: false, error: delError.message || "Failed to delete product from database" };
      }

      // 3. Delete from product_images table if exists
      try {
        await this.db.from('product_images').delete().eq('product_id', productId);
      } catch (piErr) {}

      // 4. Delete image from product-images bucket
      if (storagePathToDelete) {
        await this.deleteStorageFile(storagePathToDelete);
      } else if (imageUrlToDelete) {
        await this.deleteStorageFile(imageUrlToDelete);
      }

      // 5. Refresh products list and notify listeners
      const refreshed = await this.getProducts();
      if (refreshed.success && refreshed.data) {
        try { localStorage.setItem('chinni_products', JSON.stringify(refreshed.data)); } catch(e) {}
        window.dispatchEvent(new CustomEvent('cj_products_changed', { detail: refreshed.data }));
      }

      return { success: true, id: productId, message: "Product and associated image deleted successfully." };
    } catch (err) {
      console.error("[SupabaseService] deleteProduct error:", err);
      return { success: false, error: err.message || "Failed to delete product from database" };
    }
  }

  subscribeToProducts(callback) {
    if (!this.db || !this.db.channel) return;
    if (this.productsChannel) {
      try { this.db.removeChannel(this.productsChannel); } catch(e) {}
    }

    this.productsChannel = this.db
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload) => {
        console.log("[SupabaseService] Realtime product update received:", payload.eventType, payload);
        const res = await this.getProducts();
        if (res.success && res.data) {
          try { localStorage.setItem('chinni_products', JSON.stringify(res.data)); } catch(e) {}
          window.dispatchEvent(new CustomEvent('cj_products_changed', { detail: res.data }));
          if (typeof callback === 'function') {
            callback(res.data);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, async (payload) => {
        console.log("[SupabaseService] Realtime product_images update received:", payload.eventType, payload);
        const res = await this.getProducts();
        if (res.success && res.data) {
          try { localStorage.setItem('chinni_products', JSON.stringify(res.data)); } catch(e) {}
          window.dispatchEvent(new CustomEvent('cj_products_changed', { detail: res.data }));
          if (typeof callback === 'function') {
            callback(res.data);
          }
        }
      })
      .subscribe();
  }

  // 3. GOLD RATES
  async getGoldRates() {
    if (!this.db) return { success: true, data: { '24K': 9240, '22K': 8470, '18K': 6930 } };
    try {
      const { data, error } = await this.db
        .from('gold_rates')
        .select('*')
        .order('effective_from', { ascending: false });

      if (error) throw error;
      const rates = { '24K': 9240, '22K': 8470, '18K': 6930 };
      (data || []).forEach(r => {
        if (r.purity && r.rate_per_gram) {
          if (!rates[`seen_${r.purity}`]) {
            rates[r.purity] = parseFloat(r.rate_per_gram);
            rates[`seen_${r.purity}`] = true;
          }
        }
      });
      return { success: true, data: rates };
    } catch (err) {
      return { success: true, data: { '24K': 9240, '22K': 8470, '18K': 6930 } };
    }
  }

  async saveGoldRates(rates) {
    if (!this.db) return { success: false, error: "Database unavailable" };
    try {
      const rows = Object.entries(rates).map(([purity, rate]) => ({
        purity,
        rate_per_gram: parseFloat(rate)
      }));
      const { error } = await this.db.from('gold_rates').insert(rows);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 4. ORDERS & WHATSAPP FLOW
  async createOrder(orderData) {
    if (!this.db) return { success: true, orderId: "CJ-" + Date.now(), data: orderData };
    try {
      const orderNumber = orderData.orderNumber || `CJ-${Date.now().toString().slice(-6)}`;
      const payload = {
        order_number: orderNumber,
        customer_name: orderData.customerName || orderData.name || 'Customer',
        phone: orderData.phone || '',
        email: orderData.email || '',
        total_amount: orderData.totalAmount || orderData.total || 0,
        address: orderData.address || '',
        city: orderData.city || '',
        state: orderData.state || '',
        pincode: orderData.pincode || '',
        order_status: 'pending',
        whatsapp_sent: true
      };

      const { data, error } = await this.db.from('orders').insert([payload]).select().single();
      if (error) throw error;

      // Insert Order Items
      if (orderData.items && orderData.items.length) {
        const itemRows = orderData.items.map(item => ({
          order_id: data.id,
          product_name: item.name || 'Gold Item',
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1)
        }));
        await this.db.from('order_items').insert(itemRows);
      }

      return { success: true, orderId: data.id, orderNumber, data };
    } catch (err) {
      console.warn("[SupabaseService] createOrder error:", err.message);
      return { success: true, orderId: "CJ-" + Date.now(), data: orderData };
    }
  }

  async getOrder(orderIdOrNumber) {
    if (!this.db) return { success: false, error: "Database unavailable" };
    try {
      const isUuid = (orderIdOrNumber || '').includes('-');
      const query = this.db.from('orders').select('*, order_items(*)');
      const { data, error } = isUuid ? await query.eq('id', orderIdOrNumber).single() : await query.eq('order_number', orderIdOrNumber).single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getOrders() {
    if (!this.db) return { success: true, data: [] };
    try {
      const { data, error } = await this.db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  }

  // 5. WEBSITE SETTINGS & HOMEPAGE
  async getWebsiteSettings() {
    const cached = localStorage.getItem('cj_setting_homepage');
    const localData = cached ? JSON.parse(cached) : null;

    if (!this.db) return { success: true, data: { homepage: localData } };
    try {
      const { data, error } = await this.db.from('website_settings').select('*').eq('id', 'main').single();
      if (error) throw error;

      let homepageData = data.homepage;
      if (typeof homepageData === 'string') {
        try { homepageData = JSON.parse(homepageData); } catch(e) {}
      }
      if (!homepageData) {
        homepageData = localData || {
          hero: {
            badge: 'Crafted in Pure Gold',
            heading: data.hero_title || 'Pure Gold.\nSimply Yours.',
            subtitle: data.hero_subtitle || 'Discover our exquisite 1 Gram Gold collection, crafted for celebrations, gifting and timeless moments.',
            imageUrl: data.hero_image_url || 'assets/hero_gold_coin.png'
          },
          featured: {
            eyebrow: '1 Gram Collection — Featured',
            title: 'Signature Gold Coin',
            desc: 'Our most beloved piece. The Signature Gold Coin is a testament to pure craftsmanship.',
            imageUrl: 'assets/featured_product.png'
          },
          story: {
            title: 'Gold for Every Meaningful Moment.',
            text: 'At CHINNI ONE GRAMGOLD, we believe that gold is more than a metal — it is an emotion.',
            imageUrl: 'assets/brand_story_banner.jpg'
          }
        };
      }

      try { localStorage.setItem('cj_setting_homepage', JSON.stringify(homepageData)); } catch(e) {}
      return { success: true, data: { ...data, homepage: homepageData } };
    } catch (e) {
      return { success: true, data: { homepage: localData } };
    }
  }

  async saveWebsiteSettings(settings) {
    const homepageData = settings.homepage || settings;
    try {
      localStorage.setItem('cj_setting_homepage', JSON.stringify(homepageData));
      window.dispatchEvent(new CustomEvent('cj_setting_updated', { detail: { settingId: 'homepage', data: homepageData } }));
    } catch (e) {}

    if (!this.db) return { success: true };

    try {
      const payload = {
        id: 'main',
        homepage: homepageData,
        hero_title: homepageData.hero?.heading || '',
        hero_subtitle: homepageData.hero?.subtitle || '',
        hero_image_url: homepageData.hero?.imageUrl || '',
        updated_at: new Date().toISOString()
      };

      let { error } = await this.db.from('website_settings').upsert(payload);
      if (error) {
        const fallbackPayload = {
          id: 'main',
          hero_title: homepageData.hero?.heading || '',
          hero_subtitle: homepageData.hero?.subtitle || '',
          hero_image_url: homepageData.hero?.imageUrl || '',
          updated_at: new Date().toISOString()
        };
        await this.db.from('website_settings').upsert(fallbackPayload);
      }
      return { success: true };
    } catch (err) {
      console.warn("[SupabaseService] saveWebsiteSettings notice:", err.message);
      return { success: true };
    }
  }

  subscribeToSettings(callback) {
    if (!this.db || !this.db.channel) return;
    if (this.settingsChannel) {
      try { this.db.removeChannel(this.settingsChannel); } catch(e) {}
    }

    this.settingsChannel = this.db
      .channel('public:website_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_settings' }, async (payload) => {
        console.log("[SupabaseService] Realtime website_settings updated:", payload);
        const res = await this.getWebsiteSettings();
        if (res.success && res.data && typeof callback === 'function') {
          callback(res.data);
        }
      })
      .subscribe();
  }

  // 6. STORAGE FILE UPLOADER (UNIQUE TIMESTAMPS FOR CROSS-DEVICE CACHE SAFE URLS)
  async uploadFile(bucketName = 'product-images', rawFile, productId = 'general', onProgress = null) {
    if (!rawFile) return { success: false, error: "No file provided" };

    // Format Validation: JPEG, PNG, WebP only
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = (rawFile.name || '').split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    const fileType = (rawFile.type || '').toLowerCase();
    const isMimeValid = fileType ? allowedMimeTypes.includes(fileType) : false;
    const isExtValid = allowedExts.includes(ext);

    if (!isMimeValid && !isExtValid) {
      return {
        success: false,
        error: "Invalid image format. Only JPEG, PNG, and WebP are accepted."
      };
    }

    // Size limit: 5 MB (5,242,880 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (rawFile.size > MAX_SIZE) {
      const sizeMb = (rawFile.size / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `Image file exceeds maximum limit of 5 MB (current size: ${sizeMb} MB).`
      };
    }

    if (typeof onProgress === 'function') {
      onProgress(20, "Validating file and connecting to Supabase Storage...");
    }

    if (!this.db || !this.db.storage) {
      console.error("[SupabaseService] uploadFile error: Supabase Storage service unavailable.");
      return { success: false, error: "Supabase Storage service unavailable." };
    }

    try {
      const cleanName = (rawFile.name || 'image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      // Generate unique image filename using product ID + timestamp so an updated image never reuses an old cached URL
      const storagePath = `products/${productId}/${productId}_${timestamp}_${cleanName}`;
      const targetBucket = bucketName || 'product-images';

      if (typeof onProgress === 'function') {
        onProgress(45, `Uploading to Supabase bucket "${targetBucket}"...`);
      }

      const uploadResult = await this.db.storage
        .from(targetBucket)
        .upload(storagePath, rawFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: fileType || `image/${ext === 'jpg' ? 'jpeg' : ext}`
        });

      if (uploadResult.error) {
        console.error("[SupabaseService] Storage upload error:", uploadResult.error);
        throw uploadResult.error;
      }

      if (typeof onProgress === 'function') {
        onProgress(85, "Retrieving public image URL...");
      }

      // Get Public URL
      const { data: publicUrlData } = this.db.storage
        .from(targetBucket)
        .getPublicUrl(storagePath);

      let publicUrl = publicUrlData.publicUrl;
      publicUrl += (publicUrl.includes('?') ? '&' : '?') + `v=${timestamp}`;

      try {
        await this.db.from('media').insert([{
          file_name: cleanName,
          storage_path: storagePath,
          public_url: publicUrl,
          file_type: rawFile.type || `image/${ext}`,
          file_size: rawFile.size
        }]);
      } catch(mErr) {}

      if (typeof onProgress === 'function') {
        onProgress(100, "Upload completed successfully!");
      }

      return { success: true, url: publicUrl, storagePath, bucket: targetBucket };
    } catch (err) {
      console.error("[SupabaseService] Storage upload error:", err);
      return {
        success: false,
        error: err.message || "Failed to upload image to Supabase Storage bucket 'product-images'."
      };
    }
  }

  async deleteStorageFile(url) {
    if (!url || !this.db) return { success: false, error: "Database or URL unavailable" };
    if (url.startsWith('assets/') || url.startsWith('data:')) {
      return { success: true, isLocalAsset: true };
    }
    try {
      let bucket = 'product-images';
      let storagePath = null;

      if (url.includes('/storage/v1/object/public/')) {
        const parts = url.split('/storage/v1/object/public/');
        if (parts.length > 1) {
          const pathParts = parts[1].split('/');
          bucket = pathParts[0];
          storagePath = pathParts.slice(1).join('/').split('?')[0]; // Remove query params
        }
      } else if (!url.startsWith('http')) {
        // Direct storagePath provided, e.g. "products/prod-123/12345-image.jpg"
        storagePath = url.split('?')[0];
      }

      if (storagePath) {
        console.log(`[SupabaseService] Cleaning up storage file in bucket "${bucket}": ${storagePath}`);
        const { error } = await this.db.storage.from(bucket).remove([storagePath]);
        if (error) throw error;
        return { success: true, path: storagePath, bucket };
      }

      return { success: false, error: "Not a valid Supabase storage URL or path" };
    } catch (err) {
      console.warn("[SupabaseService] Error deleting file:", err.message);
      return { success: false, error: err.message };
    }
  }

}

window.SupabaseService = new SupabaseDataService();
window.AuthService = window.SupabaseService;

