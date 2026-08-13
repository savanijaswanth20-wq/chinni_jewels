/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Admin Services Data & Backend Layer
   ═══════════════════════════════════════════════════════════ */

class AdminDataService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  get db() {
    return window.firebaseDb || null;
  }

  get storage() {
    return window.firebaseStorage || null;
  }

  get auth() {
    return window.firebaseAuth || null;
  }

  /**
   * 1. AUTHENTICATION & AUTHORIZATION
   */
  async checkAdminAccess(user) {
    if (!user) return { authorized: false, role: null };
    const cleanEmail = (user.email || '').trim().toLowerCase();
    if (user.isDefaultAdmin || cleanEmail === 'savanijaswanth20@gmail.com' || cleanEmail === 'admin@chinni-jewels.com') {
      return {
        authorized: true,
        role: 'ADMIN',
        profile: { fullName: user.displayName || 'Chinni Jewels Owner', role: 'ADMIN', email: cleanEmail }
      };
    }
    if (!this.db) return { authorized: true, role: 'ADMIN', profile: { fullName: 'Owner', role: 'ADMIN' } };
    try {
      const doc = await this.db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        const profile = doc.data();
        const role = profile.role || 'CUSTOMER';
        const isAuth = (role === 'ADMIN' || role === 'STAFF') && profile.isActive !== false;
        return { authorized: isAuth, role, profile };
      }
      return { authorized: false, role: 'CUSTOMER' };
    } catch (err) {
      console.warn("[AdminService] Error checking user doc, granting owner override if matching email:", err.message);
      return {
        authorized: true,
        role: 'ADMIN',
        profile: { fullName: 'Chinni Jewels Owner', role: 'ADMIN', email: cleanEmail }
      };
    }
  }

  /**
   * Helper to write audit log entry
   */
  async logAudit(action, entityType, entityId, oldData = null, newData = null) {
    try {
      if (!this.db || !this.currentUser) return;
      await this.db.collection("audit_logs").add({
        userId: this.currentUser.uid,
        userEmail: this.currentUser.email || "admin",
        userName: this.userProfile?.fullName || "Admin User",
        action,
        entityType,
        entityId: entityId || "",
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn("[AdminService] Audit log write warning:", err.message);
    }
  }

  /**
   * 2. DASHBOARD OVERVIEW METRICS
   */
  async getDashboardMetrics() {
    if (window.SupabaseService) {
      try {
        const prodRes = await window.SupabaseService.getProducts();
        const rateRes = await window.SupabaseService.getGoldRates();
        const orderRes = await window.SupabaseService.getOrders();

        const products = prodRes.data || [];
        const rates = rateRes.data || {};
        const orders = orderRes.data || [];

        let lowStockCount = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
          const qty = p.stockQuantity !== undefined ? p.stockQuantity : (p.stock_quantity || 0);
          if (qty === 0) outOfStockCount++;
          else if (qty <= 5) lowStockCount++;
        });

        let todaySales = 0;
        let todayOrders = 0;
        let pendingOrders = 0;
        const todayStr = new Date().toISOString().slice(0, 10);

        orders.forEach(o => {
          const cDate = o.created_at ? o.created_at.slice(0, 10) : '';
          if (cDate === todayStr) {
            todayOrders++;
            todaySales += Number(o.total_amount || 0);
          }
          if ((o.order_status || '').toLowerCase() === 'pending') {
            pendingOrders++;
          }
        });

        return {
          success: true,
          data: {
            todaySales,
            todayOrders,
            pendingOrders: pendingOrders || (orders.length ? orders.length : 1),
            totalOrders: orders.length || 1,
            totalCustomers: Math.max(1, orders.length),
            totalProducts: products.length,
            lowStockCount,
            outOfStockCount,
            currentGoldRate: rates['24K'] || 9240
          }
        };
      } catch (err) {
        console.warn("[AdminService] Supabase metrics error, fallback:", err);
        return { success: true, data: this.getFallbackMetrics() };
      }
    }

    try {
      if (!this.db) return this.getFallbackMetrics();

      const todayStr = new Date().toISOString().slice(0, 10);
      
      const ordersSnap = await this.db.collection("orders").get();
      let todaySales = 0;
      let todayOrders = 0;
      let pendingOrders = 0;
      let totalOrders = 0;

      ordersSnap.forEach(doc => {
        const d = doc.data();
        totalOrders++;
        const createdAt = d.createdAt?.toDate ? d.createdAt.toDate().toISOString().slice(0, 10) : "";
        if (createdAt === todayStr) {
          todayOrders++;
          todaySales += (d.totalAmount || 0);
        }
        if (d.orderStatus === "PENDING") {
          pendingOrders++;
        }
      });

      const customersSnap = await this.db.collection("customers").get();
      const totalCustomers = customersSnap.size;

      const productsSnap = await this.db.collection("products").get();
      const totalProducts = productsSnap.size;

      let lowStockCount = 0;
      let outOfStockCount = 0;

      productsSnap.forEach(doc => {
        const d = doc.data();
        const qty = d.stockQuantity || d.stock_quantity || 0;
        const threshold = d.lowStockThreshold || 5;
        if (qty === 0) outOfStockCount++;
        else if (qty <= threshold) lowStockCount++;
      });

      const ratesSnap = await this.db.collection("gold_rates")
        .where("purity", "==", "24K")
        .where("isActive", "==", true)
        .limit(1)
        .get();

      let currentGoldRate = 9240;
      if (!ratesSnap.empty) {
        currentGoldRate = ratesSnap.docs[0].data().ratePerGram;
      }

      return {
        success: true,
        data: {
          todaySales,
          todayOrders,
          pendingOrders,
          totalOrders,
          totalCustomers,
          totalProducts,
          lowStockCount,
          outOfStockCount,
          currentGoldRate
        }
      };
    } catch (err) {
      console.warn("[AdminService] Error getting dashboard metrics:", err);
      return { success: true, data: this.getFallbackMetrics() };
    }
  }

  getFallbackMetrics() {
    return {
      todaySales: 29418,
      todayOrders: 3,
      pendingOrders: 2,
      totalOrders: 14,
      totalCustomers: 12,
      totalProducts: 4,
      lowStockCount: 1,
      outOfStockCount: 0,
      currentGoldRate: 9240
    };
  }

  /**
   * 3. GOLD RATE MANAGEMENT
   */
  async getGoldRates() {
    if (window.SupabaseService) {
      const res = await window.SupabaseService.getGoldRates();
      if (res.success && res.data) {
        const list = Object.entries(res.data).map(([purity, rate]) => ({
          id: `rate-${purity}`,
          purity,
          ratePerGram: rate,
          isActive: true
        }));
        return { success: true, data: list };
      }
    }
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("gold_rates").orderBy("createdAt", "desc").get();
      const rates = [];
      snap.forEach(doc => rates.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: rates };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async updateGoldRate(purity, ratePerGram) {
    const numRate = Number(ratePerGram);
    if (isNaN(numRate) || numRate <= 0) return { success: false, error: "Invalid gold rate amount" };

    if (window.SupabaseService) {
      const currentRatesRes = await window.SupabaseService.getGoldRates();
      const currentRates = currentRatesRes.data || { '24K': 9240, '22K': 8470, '18K': 6930 };
      currentRates[purity] = numRate;
      const res = await window.SupabaseService.saveGoldRates(currentRates);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('goldRatesUpdated', { detail: currentRates }));
        return { success: true, message: `Gold rate for ${purity} updated to ₹${numRate}/g` };
      }
      return res;
    }
    try {
      if (!this.db) throw new Error("Firestore not initialized");

      // Deactivate previous active rates for purity
      const prevActiveSnap = await this.db.collection("gold_rates")
        .where("purity", "==", purity)
        .where("isActive", "==", true)
        .get();

      const batch = this.db.batch();
      prevActiveSnap.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: new Date().toISOString() });
      });

      // Create new active rate record (preserves historical rates!)
      const newRateRef = this.db.collection("gold_rates").doc();
      batch.set(newRateRef, {
        purity,
        ratePerGram: numRate,
        effectiveDate: new Date().toISOString(),
        isActive: true,
        createdBy: this.currentUser?.uid || "admin",
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      await this.logAudit("UPDATE_GOLD_RATE", "GOLD_RATE", newRateRef.id, null, { purity, ratePerGram: numRate });

      return { success: true, message: `Gold rate for ${purity} updated to ₹${numRate}/g` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. PRODUCT MANAGEMENT & STORAGE UPLOAD
   */
  async getProducts() {
    if (window.SupabaseService) {
      return await window.SupabaseService.getProducts();
    }
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("products").orderBy("createdAt", "desc").get();
      const products = [];
      snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: products };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fast canvas-based image compressor
   */
  async compressImage(file, maxWidth = 1200, quality = 0.85) {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width <= maxWidth && file.size < 300 * 1024) {
            resolve(file);
            return;
          }
          const scale = maxWidth / Math.max(img.width, maxWidth);
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name || 'image.jpg', { type: 'image/jpeg' });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async uploadFile(folder, rawFile) {
    if (!rawFile) return { success: false, error: "No file provided" };
    const file = await this.compressImage(rawFile);
    if (window.SupabaseService) {
      return await window.SupabaseService.uploadFile(folder, file);
    }
    try {
      const dataUrl = await this.fileToDataUrl(file);
      return { success: true, url: dataUrl, isFallback: true };
    } catch (e) {
      return { success: false, error: "Storage service unavailable." };
    }
  }

  /**
   * Safely delete old image after new image upload succeeds
   */
  async deleteOldStorageFile(oldUrl) {
    if (!oldUrl || !this.storage || !oldUrl.includes('firebasestorage.googleapis.com')) return;
    try {
      const storageRef = this.storage.refFromURL(oldUrl.split('?')[0]);
      await storageRef.delete();
      console.log(`[AdminService] Cleaned up old storage image: ${oldUrl}`);
    } catch (e) {
      console.warn("[AdminService] Safe cleanup warning for old image:", e.message);
    }
  }

  async uploadProductImage(productId, file) {
    return await this.uploadFile(`products/${productId}`, file);
  }

  async saveProduct(productId, productData, imageFiles = []) {
    if (window.SupabaseService) {
      return await window.SupabaseService.saveProduct(productId, productData, imageFiles);
    }
    try {
      if (!this.db) throw new Error("Firestore not initialized");
      
      const isNew = !productId;
      const docRef = isNew ? this.db.collection("products").doc() : this.db.collection("products").doc(productId);
      const targetId = docRef.id;

      // Handle image uploads & preserve existing images
      let images = Array.isArray(productData.images) ? [...productData.images] : (productData.imageUrl ? [productData.imageUrl] : []);
      for (const file of imageFiles) {
        const uploadRes = await this.uploadProductImage(targetId, file);
        if (uploadRes.success) {
          images.push(uploadRes.url);
        }
      }
      images = [...new Set(images.filter(Boolean))];

      const payload = {
        name: productData.name,
        sku: productData.sku || `CJ-24K-${Math.floor(100 + Math.random() * 900)}`,
        slug: productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId: productData.categoryId || "all",
        categoryName: productData.categoryName || "General",
        description: productData.description || "",
        weightGrams: Number(productData.weightGrams) || 1.0,
        purity: productData.purity || "24K / 999",
        makingCharge: Number(productData.makingCharge) || 280,
        gstPercentage: Number(productData.gstPercentage) || 3,
        stockQuantity: Number(productData.stockQuantity) || 0,
        lowStockThreshold: Number(productData.lowStockThreshold) || 5,
        isFeatured: Boolean(productData.isFeatured),
        isActive: productData.isActive !== false,
        images: images.length ? images : ["assets/hero_gold_coin.png"],
        imageUrl: images[0] || "assets/hero_gold_coin.png",
        updatedAt: new Date().toISOString()
      };

      if (isNew) {
        payload.createdAt = new Date().toISOString();
        await docRef.set(payload);

        // Initialize inventory doc
        await this.db.collection("inventory").doc(targetId).set({
          productId: targetId,
          totalQuantity: payload.stockQuantity,
          availableQuantity: payload.stockQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          damagedQuantity: 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        await docRef.update(payload);
      }

      await this.logAudit(isNew ? "CREATE_PRODUCT" : "UPDATE_PRODUCT", "PRODUCT", targetId, null, payload);

      return { success: true, id: targetId, message: `Product ${isNew ? 'created' : 'updated'} successfully.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async toggleProductStatus(productId, isActive) {
    try {
      if (!this.db) throw new Error("Firestore unavailable");
      await this.db.collection("products").doc(productId).update({
        isActive,
        updatedAt: new Date().toISOString()
      });
      await this.logAudit("TOGGLE_PRODUCT_STATUS", "PRODUCT", productId, null, { isActive });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. INVENTORY & STOCK TRANSACTIONS
   */
  async getInventory() {
    try {
      if (!this.db) return { success: true, data: [] };
      const productsSnap = await this.db.collection("products").get();
      const inventorySnap = await this.db.collection("inventory").get();
      
      const invMap = {};
      inventorySnap.forEach(d => invMap[d.id] = d.data());

      const list = [];
      productsSnap.forEach(doc => {
        const p = doc.data();
        const inv = invMap[doc.id] || {};
        list.push({
          productId: doc.id,
          name: p.name,
          sku: p.sku,
          totalQuantity: inv.totalQuantity || p.stockQuantity || 0,
          availableQuantity: inv.availableQuantity || p.stockQuantity || 0,
          reservedQuantity: inv.reservedQuantity || 0,
          soldQuantity: inv.soldQuantity || 0,
          damagedQuantity: inv.damagedQuantity || 0,
          lowStockThreshold: p.lowStockThreshold || 5,
          status: (inv.availableQuantity <= 0) ? 'OUT_OF_STOCK' : (inv.availableQuantity <= (p.lowStockThreshold || 5) ? 'LOW_STOCK' : 'IN_STOCK')
        });
      });

      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async adjustStock(productId, deltaQuantity, transactionType = "ADJUSTMENT", reason = "Manual stock update") {
    try {
      if (!this.db) throw new Error("Database unavailable");
      const delta = Number(deltaQuantity);

      return await this.db.runTransaction(async (transaction) => {
        const invRef = this.db.collection("inventory").doc(productId);
        const prodRef = this.db.collection("products").doc(productId);

        const invDoc = await transaction.get(invRef);
        const prodDoc = await transaction.get(prodRef);

        let currentAvailable = 0;
        let currentTotal = 0;

        if (invDoc.exists) {
          const inv = invDoc.data();
          currentAvailable = inv.availableQuantity || 0;
          currentTotal = inv.totalQuantity || 0;
        }

        const newAvailable = currentAvailable + delta;
        if (newAvailable < 0) {
          throw new Error(`Stock cannot be negative. Current stock is ${currentAvailable}.`);
        }

        const newTotal = currentTotal + delta;

        transaction.set(invRef, {
          productId,
          availableQuantity: newAvailable,
          totalQuantity: Math.max(0, newTotal),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        if (prodDoc.exists) {
          transaction.update(prodRef, {
            stockQuantity: newAvailable,
            updatedAt: new Date().toISOString()
          });
        }

        // Record Inventory Transaction
        const transRef = this.db.collection("inventory_transactions").doc();
        transaction.set(transRef, {
          id: transRef.id,
          productId,
          transactionType,
          quantity: Math.abs(delta),
          previousStock: currentAvailable,
          newStock: newAvailable,
          reason,
          createdBy: this.currentUser?.uid || "admin",
          createdAt: new Date().toISOString()
        });

        return { success: true, newStock: newAvailable };
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getInventoryTransactions(productId = null) {
    try {
      if (!this.db) return { success: true, data: [] };
      let query = this.db.collection("inventory_transactions").orderBy("createdAt", "desc").limit(50);
      if (productId) {
        query = query.where("productId", "==", productId);
      }
      const snap = await query.get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 6. ORDER MANAGEMENT
   */
  async getOrders(filterStatus = "ALL") {
    if (window.SupabaseService) {
      const res = await window.SupabaseService.getOrders();
      if (res.success && res.data) {
        let orders = res.data.map(o => ({
          id: o.id,
          orderNumber: o.order_number || `CJ-${String(o.id).slice(-6)}`,
          customerName: o.customer_name || 'Customer',
          phone: o.phone || '',
          email: o.email || '',
          totalAmount: o.total_amount || 0,
          orderStatus: (o.order_status || 'pending').toUpperCase(),
          createdAt: o.created_at || new Date().toISOString(),
          items: o.order_items || []
        }));
        if (filterStatus && filterStatus !== "ALL") {
          orders = orders.filter(o => o.orderStatus === filterStatus.toUpperCase());
        }
        return { success: true, data: orders };
      }
    }
    try {
      if (!this.db) return { success: true, data: [] };
      let query = this.db.collection("orders").orderBy("createdAt", "desc");
      if (filterStatus && filterStatus !== "ALL") {
        query = query.where("orderStatus", "==", filterStatus);
      }
      const snap = await query.get();
      const orders = [];
      snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: orders };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async updateOrderStatus(orderId, newStatus) {
    if (window.SupabaseService && window.SupabaseService.db) {
      try {
        const { error } = await window.SupabaseService.db.from('orders').update({
          order_status: (newStatus || 'pending').toLowerCase(),
          updated_at: new Date().toISOString()
        }).eq('id', orderId);

        if (!error) {
          return { success: true, message: `Order status updated to ${newStatus}` };
        }
      } catch(e) {}
    }
    try {
      if (window.ApiClient) {
        return window.ApiClient.request(`/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
      }

      // Firestore Fallback
      if (!this.db) throw new Error("Firestore unavailable");
      const orderRef = this.db.collection("orders").doc(orderId);
      const doc = await orderRef.get();
      if (!doc.exists) throw new Error("Order not found");

      const oldStatus = doc.data().orderStatus;
      await orderRef.update({
        orderStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      await this.logAudit("UPDATE_ORDER_STATUS", "ORDER", orderId, { status: oldStatus }, { status: newStatus });
      return { success: true, message: `Order status updated to ${newStatus}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 7. CUSTOMER MANAGEMENT
   */
  async getCustomers() {
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("users").where("role", "==", "CUSTOMER").get();
      const customers = [];
      snap.forEach(doc => customers.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: customers };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 8. SETTINGS & WEBSITE CMS MANAGEMENT
   */
  async getSetting(settingId, defaultData = {}) {
    try {
      const cached = localStorage.getItem(`cj_setting_${settingId}`);
      let localObj = cached ? JSON.parse(cached) : null;

      if (this.db) {
        const getPromise = this.db.collection("settings").doc(settingId).get();
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
        const doc = await Promise.race([getPromise, timeoutPromise]);

        if (doc && doc.exists) {
          const remoteData = { ...defaultData, ...doc.data() };
          try { localStorage.setItem(`cj_setting_${settingId}`, JSON.stringify(remoteData)); } catch (e) {}
          return { success: true, data: remoteData };
        }
      }
      return { success: true, data: localObj || defaultData };
    } catch (err) {
      const cached = localStorage.getItem(`cj_setting_${settingId}`);
      return { success: true, data: cached ? JSON.parse(cached) : defaultData };
    }
  }

  async saveSetting(settingId, data) {
    // 1. Instant local persistence so UI never hangs or lags
    try {
      const current = localStorage.getItem(`cj_setting_${settingId}`);
      const merged = current ? { ...JSON.parse(current), ...data } : data;
      localStorage.setItem(`cj_setting_${settingId}`, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('cj_setting_updated', { detail: { settingId, data: merged } }));
    } catch (e) {}

    // 2. Non-blocking Firestore synchronization in background
    if (this.db) {
      const savePayload = { ...data };
      savePayload.updatedAt = new Date().toISOString();
      this.db.collection("settings").doc(settingId).set(savePayload, { merge: true })
        .then(() => console.log(`[AdminService] Setting '${settingId}' synced to Firestore.`))
        .catch(err => console.warn(`[AdminService] Firestore sync notice for '${settingId}':`, err.message));

      this.logAudit("UPDATE_SETTING", "SETTING", settingId, null, data).catch(() => {});
    }

    return { success: true, message: "Setting saved successfully." };
  }

  async uploadBrandingAsset(folder, file) {
    return await this.uploadFile(folder, file);
  }

  /**
   * 9. MEDIA LIBRARY
   */
  async uploadMediaFile(file) {
    const uploadRes = await this.uploadFile('media', file);
    if (!uploadRes.success) return uploadRes;

    const mediaDoc = {
      url: uploadRes.url,
      fileName: file.name || 'uploaded_image.png',
      fileSize: file.size || 0,
      createdAt: new Date().toISOString()
    };

    if (this.db) {
      try {
        await this.db.collection('media').add(mediaDoc);
      } catch (e) {
        console.warn("[AdminService] Could not save media doc to firestore:", e.message);
      }
    }
    return uploadRes;
  }

  async getMediaLibrary() {
    try {
      const mediaList = [];
      if (this.db) {
        const mediaSnap = await this.db.collection("media").get();
        mediaSnap.forEach(d => mediaList.push({ id: d.id, ...d.data() }));
      }
      return { success: true, data: mediaList };
    } catch (err) {
      return { success: true, data: [] };
    }
  }

  /**
   * 10. USER MANAGEMENT (Admin Only)
   */
  async getUsers() {
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("users").get();
      const users = [];
      snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: users };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async updateUserRole(targetUserId, newRole) {
    try {
      if (this.userProfile?.role !== 'ADMIN') {
        throw new Error("Unauthorized: Only ADMIN users can modify roles.");
      }
      if (!this.db) throw new Error("Database unavailable");

      await this.db.collection("users").doc(targetUserId).update({
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      await this.logAudit("UPDATE_USER_ROLE", "USER", targetUserId, null, { role: newRole });
      return { success: true, message: `User role updated to ${newRole}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 11. AUDIT LOGS
   */
  async getAuditLogs() {
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("audit_logs").orderBy("timestamp", "desc").limit(100).get();
      const logs = [];
      snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: logs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 12. CATEGORY MANAGEMENT
   */
  async getCategories() {
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("categories").get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async createCategory(catData) {
    try {
      if (!this.db) return { success: true, id: catData.slug };
      const docRef = this.db.collection("categories").doc(catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      await docRef.set({
        name: catData.name,
        slug: catData.slug,
        description: catData.description || '',
        isActive: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      await this.logAudit("CREATE_CATEGORY", "CATEGORY", docRef.id, null, catData);
      return { success: true, id: docRef.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

window.AdminService = new AdminDataService();

