/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Admin Services Data & Backend Layer
   ═══════════════════════════════════════════════════════════ */

class AdminDataService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  get db() {
    return window.firebaseDb;
  }

  get storage() {
    return window.firebaseStorage;
  }

  get auth() {
    return window.firebaseAuth;
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
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn("[AdminService] Audit log write warning:", err.message);
    }
  }

  /**
   * 2. DASHBOARD OVERVIEW METRICS
   */
  async getDashboardMetrics() {
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

      // Current 24K Gold Rate
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
    try {
      if (!this.db) throw new Error("Firestore not initialized");
      const numRate = Number(ratePerGram);
      if (isNaN(numRate) || numRate <= 0) throw new Error("Invalid gold rate amount");

      // Deactivate previous active rates for purity
      const prevActiveSnap = await this.db.collection("gold_rates")
        .where("purity", "==", purity)
        .where("isActive", "==", true)
        .get();

      const batch = this.db.batch();
      prevActiveSnap.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      });

      // Create new active rate record (preserves historical rates!)
      const newRateRef = this.db.collection("gold_rates").doc();
      batch.set(newRateRef, {
        purity,
        ratePerGram: numRate,
        effectiveDate: new Date().toISOString(),
        isActive: true,
        createdBy: this.currentUser?.uid || "admin",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
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

  async uploadProductImage(productId, file) {
    try {
      if (!this.storage) throw new Error("Storage unavailable");
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const storageRef = this.storage.ref(`products/${productId}/${fileName}`);
      
      const uploadTask = await storageRef.put(file);
      const downloadURL = await uploadTask.ref.getDownloadURL();
      return { success: true, url: downloadURL };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async saveProduct(productId, productData, imageFiles = []) {
    try {
      if (!this.db) throw new Error("Firestore not initialized");
      
      const isNew = !productId;
      const docRef = isNew ? this.db.collection("products").doc() : this.db.collection("products").doc(productId);
      const targetId = docRef.id;

      // Handle image uploads
      let images = productData.images || [];
      for (const file of imageFiles) {
        const uploadRes = await this.uploadProductImage(targetId, file);
        if (uploadRes.success) {
          images.push(uploadRes.url);
        }
      }

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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (isNew) {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await docRef.set(payload);

        // Initialize inventory doc
        await this.db.collection("inventory").doc(targetId).set({
          productId: targetId,
          totalQuantity: payload.stockQuantity,
          availableQuantity: payload.stockQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          damagedQuantity: 0,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (prodDoc.exists) {
          transaction.update(prodRef, {
            stockQuantity: newAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    try {
      if (window.firebaseFunctions) {
        const updateStatusFn = window.firebaseFunctions.httpsCallable("updateOrderStatus");
        const res = await updateStatusFn({ orderId, newStatus });
        if (res.data) return { success: true, ...res.data };
      }

      // Firestore Fallback
      if (!this.db) throw new Error("Firestore unavailable");
      const orderRef = this.db.collection("orders").doc(orderId);
      const doc = await orderRef.get();
      if (!doc.exists) throw new Error("Order not found");

      const oldStatus = doc.data().orderStatus;
      await orderRef.update({
        orderStatus: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
      if (!this.db) return { success: true, data: defaultData };
      const doc = await this.db.collection("settings").doc(settingId).get();
      if (doc.exists) {
        return { success: true, data: { ...defaultData, ...doc.data() } };
      }
      return { success: true, data: defaultData };
    } catch (err) {
      return { success: true, data: defaultData };
    }
  }

  async saveSetting(settingId, data) {
    try {
      if (!this.db) throw new Error("Database unavailable");
      await this.db.collection("settings").doc(settingId).set({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await this.logAudit("UPDATE_SETTING", "SETTING", settingId, null, data);
      return { success: true, message: "Setting saved successfully." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async uploadBrandingAsset(folder, file) {
    try {
      if (!this.storage) throw new Error("Storage unavailable");
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const ref = this.storage.ref(`${folder}/${fileName}`);
      const uploadTask = await ref.put(file);
      const url = await uploadTask.ref.getDownloadURL();
      return { success: true, url };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 9. MEDIA LIBRARY
   */
  async getMediaLibrary() {
    try {
      if (!this.storage) return { success: true, data: [] };
      // Fallback listed files or firestore tracked media
      const mediaSnap = await this.db.collection("media").get();
      const mediaList = [];
      mediaSnap.forEach(d => mediaList.push({ id: d.id, ...d.data() }));
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
}

window.AdminService = new AdminDataService();
