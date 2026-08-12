/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — API Client
   Connects existing UI to FastAPI Backend REST Endpoints
   ═══════════════════════════════════════════════════════════ */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http'))
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:8000/api';

class ApiClient {
  static async request(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      const token = localStorage.getItem('chinni_token') || localStorage.getItem('cninni_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const json = await response.json();
      if (!response.ok || (json && json.success === false)) {
        const errMsg = json.error ? json.error.message : 'API Request failed';
        console.warn(`[API] ${endpoint} warning:`, errMsg);
        return { success: false, error: errMsg, data: null };
      }

      return json;
    } catch (err) {
      console.warn(`[API] Network error calling ${endpoint}:`, err);
      return { success: false, error: err.message, data: null };
    }
  }

  // Gold Rates
  static async getGoldRates() {
    return this.request('/gold-rates/latest');
  }

  // Products
  static async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/products${query ? '?' + query : ''}`;
    return this.request(url);
  }

  static async getProductBySlugOrId(idOrSlug) {
    return this.request(`/products/${idOrSlug}`);
  }

  // Inventory
  static async getInventory() {
    return this.request('/inventory');
  }

  // Orders
  static async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  static async getOrder(orderIdOrNumber) {
    return this.request(`/orders/${orderIdOrNumber}`);
  }

  // Admin Dashboard
  static async getAdminDashboard() {
    return this.request('/admin/dashboard');
  }
}
