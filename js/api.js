/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — API Client Adapter (Firebase Native Integration)
   Connects existing UI seamlessly to Firebase Firestore & Cloud Functions
   ═══════════════════════════════════════════════════════════ */

class ApiClient {
  static async request(endpoint, options = {}) {
    console.log(`[ApiClient Adapter] Request endpoint: ${endpoint}`);
    return { success: true, data: null };
  }

  // Gold Rates
  static async getGoldRates() {
    if (window.FirebaseService) {
      return window.FirebaseService.getGoldRates();
    }
    return {
      success: true,
      data: { '24K': 9240, '22K': 8470, '18K': 6930 }
    };
  }

  // Products
  static async getProducts(params = {}) {
    if (window.FirebaseService) {
      return window.FirebaseService.getProducts(params);
    }
    return { success: true, data: [] };
  }

  static async getProductBySlugOrId(idOrSlug) {
    if (window.FirebaseService) {
      return window.FirebaseService.getProductBySlugOrId(idOrSlug);
    }
    return { success: false, error: "Firebase service unavailable" };
  }

  // Inventory
  static async getInventory() {
    if (window.FirebaseService) {
      const res = await window.FirebaseService.getProducts();
      const invList = (res.data || []).map(p => ({
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        available_quantity: p.stock_quantity || 10,
        reserved_quantity: 0,
        sold_quantity: 0,
        damaged_quantity: 0
      }));
      return { success: true, data: invList };
    }
    return { success: true, data: [] };
  }

  // Orders
  static async createOrder(orderData) {
    if (window.FirebaseService) {
      return window.FirebaseService.createOrder(orderData);
    }
    return { success: false, error: "Firebase service unavailable" };
  }

  static async getOrder(orderIdOrNumber) {
    try {
      if (!window.firebaseDb) return { success: false, error: "Database unavailable" };
      const doc = await window.firebaseDb.collection("orders").doc(orderIdOrNumber).get();
      if (doc.exists) {
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }

      const snap = await window.firebaseDb.collection("orders").where("orderNumber", "==", orderIdOrNumber).limit(1).get();
      if (!snap.empty) {
        const d = snap.docs[0];
        return { success: true, data: { id: d.id, ...d.data() } };
      }

      return { success: false, error: "Order not found" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Admin Dashboard Analytics
  static async getAdminDashboard() {
    try {
      if (!window.firebaseDb) return { success: true, data: { totalOrders: 0, totalSales: 0 } };
      const ordersSnap = await window.firebaseDb.collection("orders").get();
      let totalSales = 0;
      let totalOrders = 0;

      ordersSnap.forEach(d => {
        totalOrders++;
        totalSales += (d.data().totalAmount || 0);
      });

      return {
        success: true,
        data: {
          totalOrders,
          totalSales,
          pendingOrders: totalOrders,
          completedOrders: 0
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

window.ApiClient = ApiClient;
