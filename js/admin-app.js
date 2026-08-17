/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Simplified Admin Dashboard Controller
   Focused on: Product Names & Shipping Price Settings
   ═══════════════════════════════════════════════════════════ */

class AdminApp {
  constructor() {
    this.currentView = 'products';
    this.products = [];
    this.init();
  }

  init() {
    console.log("[AdminApp] Initializing Simplified Admin Controller.");
    this.bindAuth();
    this.bindNavigation();
    this.bindProductEvents();
    this.bindShippingEvents();
  }

  /* ══════════════════════════════════════════════════════════
     1. AUTHENTICATION & SECURITY GUARD
     ══════════════════════════════════════════════════════════ */
  bindAuth() {
    const loginForm = document.querySelector('#admin-login-form');
    const logoutBtn = document.querySelector('#logout-btn');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#auth-email').value.trim();
        const password = document.querySelector('#auth-password').value;
        const errorEl = document.querySelector('#auth-error-msg');
        const submitBtn = document.querySelector('#login-submit-btn');

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        const res = await window.AuthService.loginWithEmail(email, password);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Dashboard';

        if (!res.success) {
          errorEl.textContent = res.error || "Authentication failed. Check credentials.";
          errorEl.style.display = 'block';
          return;
        }

        const access = await window.AdminService.checkAdminAccess(res.user);
        if (access.authorized) {
          const authScreen = document.querySelector('#admin-auth-screen');
          const appContainer = document.querySelector('#admin-app');
          if (authScreen) authScreen.style.display = 'none';
          if (appContainer) appContainer.style.display = 'flex';
          this.updateSidebarUserProfile(res.user, access.profile);
          this.loadCurrentView();
        } else {
          errorEl.textContent = "Access Denied: Your account does not have ADMIN or STAFF privileges.";
          errorEl.style.display = 'block';
          await window.AuthService.logout();
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.AuthService.logout();
        window.location.reload();
      });
    }

    // Monitor Auth state changes
    window.AuthService.onAuthChange(async (user, profile) => {
      const authScreen = document.querySelector('#admin-auth-screen');
      const appContainer = document.querySelector('#admin-app');

      if (user) {
        window.AdminService.currentUser = user;
        const access = await window.AdminService.checkAdminAccess(user);
        window.AdminService.userProfile = access.profile || profile;

        if (access.authorized) {
          if (authScreen) authScreen.style.display = 'none';
          if (appContainer) appContainer.style.display = 'flex';
          this.updateSidebarUserProfile(user, access.profile);
          this.loadCurrentView();
        } else {
          if (authScreen) authScreen.style.display = 'flex';
          if (appContainer) appContainer.style.display = 'none';
        }
      } else {
        if (authScreen) authScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
      }
    });
  }

  updateSidebarUserProfile(user, profile) {
    const nameEl = document.querySelector('#sidebar-user-name');
    const initialEl = document.querySelector('#sidebar-user-initial');
    const roleEl = document.querySelector('#sidebar-user-role');

    const name = profile?.full_name || user?.email?.split('@')[0] || "Admin";
    if (nameEl) nameEl.textContent = name;
    if (initialEl) initialEl.textContent = name.charAt(0).toUpperCase();
    if (roleEl) roleEl.textContent = (profile?.role || "ADMIN").toUpperCase();
  }

  /* ══════════════════════════════════════════════════════════
     2. NAVIGATION & VIEW SWITCHER
     ══════════════════════════════════════════════════════════ */
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.dataset.view;
        this.switchView(targetView);
      });
    });

    const mobileToggle = document.querySelector('#mobile-toggle-btn');
    const sidebar = document.querySelector('#admin-sidebar');
    const backdrop = document.querySelector('#sidebar-backdrop');

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        if (backdrop) backdrop.classList.toggle('active');
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('active');
        backdrop.classList.remove('active');
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update Nav Highlights
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update Header Title
    const titleEl = document.querySelector('#current-view-title');
    if (titleEl) {
      const titles = {
        products: "Product Name Management",
        shipping: "Shipping Price Settings"
      };
      titleEl.textContent = titles[viewName] || "Admin Dashboard";
    }

    // Toggle View Panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    this.loadCurrentView();
  }

  async loadCurrentView() {
    if (this.currentView === 'products') {
      await this.loadProductsData();
    } else if (this.currentView === 'shipping') {
      this.loadShippingData();
    }
  }

  /* ══════════════════════════════════════════════════════════
     3. PRODUCT NAME MANAGEMENT
     ══════════════════════════════════════════════════════════ */
  async loadProductsData() {
    const tbody = document.querySelector('#products-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading products...</td></tr>`;

    let products = [];
    try {
      if (window.AdminService && window.AdminService.getProducts) {
        products = await window.AdminService.getProducts();
      }
    } catch (e) {
      console.warn("Could not fetch remote products, fallback to default", e);
    }

    if (!products || products.length === 0) {
      products = [
        {
          id: 'p1111111-1111-1111-1111-111111111111',
          name: 'Signature Gold Coin',
          slug: 'signature-gold-coin',
          image_url: 'assets/hero_gold_coin.png',
          active: true
        }
      ];
    }

    this.products = products;
    this.renderProductsTable(products);
  }

  renderProductsTable(products) {
    const tbody = document.querySelector('#products-table-tbody');
    if (!tbody) return;

    if (!products || products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No products found. Click "+ Add Product" above.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const img = p.image_url || p.images?.[0] || 'assets/hero_gold_coin.png';
      return `
        <tr>
          <td>
            <img src="${img}" alt="${p.name}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.2);" onerror="this.src='assets/hero_gold_coin.png'" />
          </td>
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--gold-light);">1 Gram Pure Gold</div>
          </td>
          <td>
            <code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #9aa1b1;">${p.slug || p.id}</code>
          </td>
          <td>
            <span class="badge ${p.active !== false ? 'badge-success' : 'badge-warning'}">${p.active !== false ? 'ACTIVE' : 'INACTIVE'}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${p.id}" style="padding: 6px 14px; font-size: 0.82rem;">
              ✏️ Edit Name
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind Edit Buttons
    tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const prod = this.products.find(p => p.id === id);
        if (prod) this.openEditProductModal(prod);
      });
    });
  }

  bindProductEvents() {
    const openAddBtn = document.querySelector('#btn-open-add-product-modal');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => {
        this.openAddProductModal();
      });
    }

    const saveBtn = document.querySelector('#btn-save-product-submit');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleSaveProduct();
      });
    }
  }

  openAddProductModal() {
    document.querySelector('#product-modal-title').textContent = "Add Product";
    document.querySelector('#pm-id').value = "";
    document.querySelector('#pm-name').value = "";
    document.querySelector('#pm-image-url-input').value = "assets/hero_gold_coin.png";
    this.openModal('product-modal');
  }

  openEditProductModal(prod) {
    document.querySelector('#product-modal-title').textContent = "Edit Product Name";
    document.querySelector('#pm-id').value = prod.id || "";
    document.querySelector('#pm-name').value = prod.name || "";
    document.querySelector('#pm-image-url-input').value = prod.image_url || prod.images?.[0] || "assets/hero_gold_coin.png";
    this.openModal('product-modal');
  }

  async handleSaveProduct() {
    const id = document.querySelector('#pm-id').value;
    const name = document.querySelector('#pm-name').value.trim();
    const imageUrl = document.querySelector('#pm-image-url-input').value.trim() || 'assets/hero_gold_coin.png';

    if (!name) {
      alert("Please enter a product name.");
      return;
    }

    const saveBtn = document.querySelector('#btn-save-product-submit');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      if (id) {
        // Update product name in list / remote
        const existing = this.products.find(p => p.id === id);
        if (existing) {
          existing.name = name;
          existing.image_url = imageUrl;
        }
        if (window.AdminService && window.AdminService.updateProduct) {
          await window.AdminService.updateProduct(id, { name: name, image_url: imageUrl });
        }
      } else {
        const newProduct = {
          id: 'p_' + Date.now(),
          name: name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          image_url: imageUrl,
          active: true
        };
        this.products.push(newProduct);
        if (window.AdminService && window.AdminService.createProduct) {
          await window.AdminService.createProduct(newProduct);
        }
      }

      // Also cache selected product name for quick store preview
      sessionStorage.setItem('chinni_selected_product_name', name);
      this.closeModal('product-modal');
      this.showToast(`Product name "${name}" saved successfully!`);
      this.renderProductsTable(this.products);
    } catch (err) {
      console.error("Save product error:", err);
      this.showToast(`Saved locally: ${name}`);
      this.closeModal('product-modal');
      this.renderProductsTable(this.products);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product Name";
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. SHIPPING PRICE SETTINGS
     ══════════════════════════════════════════════════════════ */
  loadShippingData() {
    const input = document.querySelector('#input-shipping-price');
    const badge = document.querySelector('#current-shipping-badge');
    const savedPrice = localStorage.getItem('chinni_shipping_price') || '150';

    if (input) input.value = savedPrice;
    if (badge) badge.textContent = `₹${savedPrice}`;
  }

  bindShippingEvents() {
    const form = document.querySelector('#shipping-settings-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const priceInput = document.querySelector('#input-shipping-price');
        const badge = document.querySelector('#current-shipping-badge');
        const price = priceInput ? priceInput.value.trim() : '150';

        localStorage.setItem('chinni_shipping_price', price);
        if (badge) badge.textContent = `₹${price}`;

        this.showToast(`Shipping Price updated to ₹${price} successfully!`);
      });
    }
  }

  /* ── Modal & Toast Helpers ── */
  openModal(modalId) {
    const modal = document.querySelector(`#${modalId}`);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.querySelector(`#${modalId}`);
    if (modal) modal.classList.remove('active');
  }

  showToast(message) {
    let container = document.querySelector('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.style.cssText = `
      background: #13151b; color: #fff; border: 1px solid var(--gold);
      padding: 12px 20px; border-radius: 8px; font-size: 0.88rem; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Plus Jakarta Sans', sans-serif;
      margin-top: 8px; display: flex; align-items: center; gap: 8px;
    `;
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AdminApp();
});
