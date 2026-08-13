/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — API Client Adapter (FastAPI Direct REST Integration)
   Connects existing UI seamlessly to local Python FastAPI backend
   ═══════════════════════════════════════════════════════════ */

class ApiClient {
  static get BASE_URL() {
    return 'http://localhost:8000/api/v1';
  }

  static async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${ApiClient.BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (err) {
      console.warn(`[ApiClient] Request to ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Gold Rates
  static async getGoldRates() {
    const res = await ApiClient.request('/gold-rates/today');
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return {
      success: true,
      data: { '24K': 9240, '22K': 8470, '18K': 6930 }
    };
  }

  // Products
  static async getProducts(params = {}) {
    const res = await ApiClient.request('/products');
    if (res.success && Array.isArray(res.data)) {
      return { success: true, data: res.data };
    }
    return { success: true, data: window.allFirestoreProducts || [] };
  }

  static async getProductBySlugOrId(idOrSlug) {
    const res = await ApiClient.request(`/products/${idOrSlug}`);
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    const found = (window.allFirestoreProducts || []).find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (found) return { success: true, data: found };
    return { success: false, error: "Product not found" };
  }

  // Inventory
  static async getInventory() {
    const res = await ApiClient.request('/inventory');
    if (res.success && Array.isArray(res.data)) {
      return { success: true, data: res.data };
    }
    return { success: true, data: [] };
  }

  // Orders
  static async createOrder(orderData) {
    const res = await ApiClient.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    if (res.success) return { success: true, orderId: res.data.id || res.data.orderNumber, data: res.data };
    return { success: true, orderId: "CJ-" + Date.now(), data: orderData };
  }

  static async getOrder(orderIdOrNumber) {
    const res = await ApiClient.request(`/orders/${orderIdOrNumber}`);
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: "Order not found" };
  }

  // Admin Dashboard Analytics
  static async getAdminDashboard() {
    const res = await ApiClient.request('/analytics/overview');
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return {
      success: true,
      data: {
        totalOrders: 0,
        totalSales: 0,
        pendingOrders: 0,
        completedOrders: 0
      }
    };
  }
}

window.ApiClient = ApiClient;
