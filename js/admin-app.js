/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Admin Dashboard Application Controller
   ═══════════════════════════════════════════════════════════ */

class AdminApp {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    console.log("[AdminApp] Initializing Admin Controller.");
    this.bindAuth();
    this.bindNavigation();
    this.bindGlobalEvents();
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
        if (!access.authorized) {
          errorEl.textContent = "Access Denied: Your account does not have ADMIN or STAFF privileges.";
          errorEl.style.display = 'block';
          await window.AuthService.logout();
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await window.AuthService.logout();
        window.location.reload();
      });
    }

    // Monitor Firebase Auth changes
    window.AuthService.onAuthChange(async (user, profile) => {
      const authScreen = document.querySelector('#admin-auth-screen');
      const appContainer = document.querySelector('#admin-app');

      if (user) {
        window.AdminService.currentUser = user;
        const access = await window.AdminService.checkAdminAccess(user);
        window.AdminService.userProfile = access.profile || profile;

        if (access.authorized) {
          authScreen.style.display = 'none';
          appContainer.style.display = 'flex';
          this.updateSidebarUserProfile(user, access.profile);
          this.loadCurrentView();
        } else {
          authScreen.style.display = 'flex';
          appContainer.style.display = 'none';
        }
      } else {
        authScreen.style.display = 'flex';
        appContainer.style.display = 'none';
      }
    });
  }

  updateSidebarUserProfile(user, profile) {
    const nameEl = document.querySelector('#sidebar-user-name');
    const roleEl = document.querySelector('#sidebar-user-role');
    const avatarEl = document.querySelector('#sidebar-user-avatar');

    const name = profile?.fullName || user.displayName || user.email.split('@')[0];
    const role = profile?.role || 'STAFF';

    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

    // Restrict staff from user management
    const userNavItem = document.querySelector('[data-view="users"]');
    if (userNavItem) {
      userNavItem.style.display = (role === 'ADMIN') ? 'flex' : 'none';
    }
  }

  /* ══════════════════════════════════════════════════════════
     2. NAVIGATION & VIEW SWITCHING
     ══════════════════════════════════════════════════════════ */
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const mobileToggle = document.querySelector('#mobile-toggle-btn');
    const backdrop = document.querySelector('#sidebar-backdrop');
    const sidebar = document.querySelector('#admin-sidebar');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.switchView(view);

        // Close mobile drawer if open
        if (sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          backdrop.classList.remove('active');
        }
      });
    });

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav link
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update Page Header Title
    const titleEl = document.querySelector('#current-view-title');
    if (titleEl) {
      const titles = {
        dashboard: "Dashboard Overview",
        website: "Website Content & Sections",
        hero: "Hero Section Editor",
        branding: "Brand & Store Settings",
        products: "Product Catalog",
        categories: "Categories",
        gold_rates: "Gold Rate Management",
        inventory: "Inventory Stock Control",
        orders: "Customer Orders Directory",
        customers: "Customer Records",
        whatsapp: "WhatsApp Settings",
        media: "Media Storage Library",
        seo: "SEO & Search Engines",
        users: "Admin & Staff Users",
        audit_logs: "System Audit Trail",
        settings: "General Website Settings"
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
    switch (this.currentView) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'website':
        await this.loadWebsiteSectionsData();
        break;
      case 'hero':
        await this.loadHeroData();
        break;
      case 'branding':
        await this.loadBrandData();
        break;
      case 'products':
        await this.loadProductsData();
        break;
      case 'categories':
        await this.loadCategoriesData();
        break;
      case 'gold_rates':
        await this.loadGoldRatesData();
        break;
      case 'inventory':
        await this.loadInventoryData();
        break;
      case 'orders':
        await this.loadOrdersData();
        break;
      case 'customers':
        await this.loadCustomersData();
        break;
      case 'whatsapp':
        await this.loadWhatsAppSettingsData();
        break;
      case 'media':
        await this.loadMediaLibraryData();
        break;
      case 'seo':
        await this.loadSEOData();
        break;
      case 'users':
        await this.loadUsersData();
        break;
      case 'audit_logs':
        await this.loadAuditLogsData();
        break;
      case 'settings':
        await this.loadGeneralSettingsData();
        break;
    }
  }

  /* ══════════════════════════════════════════════════════════
     3. VIEW LOADERS & HANDLERS
     ══════════════════════════════════════════════════════════ */

  // --- DASHBOARD OVERVIEW ---
  async loadDashboardData() {
    const res = await window.AdminService.getDashboardMetrics();
    if (res.success) {
      const d = res.data;
      document.querySelector('#metric-today-sales').textContent = '₹' + d.todaySales.toLocaleString('en-IN');
      document.querySelector('#metric-today-orders').textContent = d.todayOrders;
      document.querySelector('#metric-pending-orders').textContent = d.pendingOrders;
      document.querySelector('#metric-low-stock').textContent = d.lowStockCount;
      document.querySelector('#header-gold-rate-val').textContent = `₹${d.currentGoldRate}/g`;
    }

    // Load recent orders
    const ordersRes = await window.AdminService.getOrders();
    const tbody = document.querySelector('#dashboard-recent-orders-tbody');
    if (!ordersRes.success || !ordersRes.data.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No recent orders recorded yet.</td></tr>`;
      return;
    }

    const recent = ordersRes.data.slice(0, 5);
    tbody.innerHTML = recent.map(o => `
      <tr>
        <td><strong>${o.orderNumber || o.id}</strong></td>
        <td>${o.customerName || 'Customer'}</td>
        <td>${o.phone || 'N/A'}</td>
        <td>₹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${o.orderStatus === 'PENDING' ? 'badge-warning' : (o.orderStatus === 'CONFIRMED' ? 'badge-success' : 'badge-secondary')}">${o.orderStatus || 'PENDING'}</span></td>
        <td>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN') : 'Today'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="app.viewOrderDetails('${o.id}')">View</button></td>
      </tr>
    `).join('');
  }

  // --- WEBSITE SECTIONS ---
  async loadWebsiteSectionsData() {
    const sections = [
      { id: 'hero', name: 'Hero Section', active: true },
      { id: 'gold_rate', name: 'Live Gold Rate Card', active: true },
      { id: 'featured_products', name: 'Featured Products Slider', active: true },
      { id: 'collection', name: 'Product Collection Grid', active: true },
      { id: 'why_choose_us', name: 'Why Choose Us Benefits', active: true },
      { id: 'brand_story', name: 'Brand Story / About', active: true },
      { id: 'whatsapp_cta', name: 'WhatsApp Call-To-Action Banner', active: true },
      { id: 'contact', name: 'Contact & Map Section', active: true },
      { id: 'footer', name: 'Footer & Copyright', active: true }
    ];

    const container = document.querySelector('#website-sections-list');
    container.innerHTML = sections.map(sec => `
      <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 600; color: #fff;">${sec.name}</span>
        <label class="switch">
          <input type="checkbox" data-sec-id="${sec.id}" ${sec.active ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
  }

  // --- HERO DATA ---
  async loadHeroData() {
    const res = await window.AdminService.getSetting('homepage');
    if (res.success && res.data.hero) {
      const h = res.data.hero;
      if (h.badge) document.querySelector('#hero-badge').value = h.badge;
      if (h.heading) document.querySelector('#hero-heading').value = h.heading;
      if (h.subtitle) document.querySelector('#hero-subtitle').value = h.subtitle;
      if (h.btnPrimary) document.querySelector('#hero-btn-primary').value = h.btnPrimary;
      if (h.btnSecondary) document.querySelector('#hero-btn-secondary').value = h.btnSecondary;
    }
  }

  // --- BRAND DATA ---
  async loadBrandData() {
    const res = await window.AdminService.getSetting('branding');
    if (res.success && res.data) {
      const b = res.data;
      if (b.name) document.querySelector('#brand-name').value = b.name;
      if (b.tagline) document.querySelector('#brand-tagline').value = b.tagline;
      if (b.phone) document.querySelector('#brand-phone').value = b.phone;
      if (b.whatsapp) document.querySelector('#brand-whatsapp').value = b.whatsapp;
      if (b.email) document.querySelector('#brand-email').value = b.email;
      if (b.hours) document.querySelector('#brand-hours').value = b.hours;
      if (b.address) document.querySelector('#brand-address').value = b.address;
    }
  }

  // --- PRODUCTS DATA ---
  async loadProductsData() {
    const res = await window.AdminService.getProducts();
    const tbody = document.querySelector('#products-table-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No products found in Firestore. Click "+ Add New Product" to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(p => `
      <tr>
        <td><img src="${p.imageUrl || 'assets/hero_gold_coin.png'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);" /></td>
        <td><strong>${p.name}</strong></td>
        <td><code>${p.sku || 'N/A'}</code></td>
        <td>${p.weightGrams || 1.0} g</td>
        <td>${p.purity || '24K'}</td>
        <td>₹${p.makingCharge || 280}</td>
        <td><strong>${p.stockQuantity || 0}</strong></td>
        <td><span class="badge ${p.isActive !== false ? 'badge-success' : 'badge-secondary'}">${p.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="app.editProduct('${p.id}')">Edit</button>
          <button class="btn ${p.isActive !== false ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="app.toggleProduct('${p.id}', ${!(p.isActive !== false)})">${p.isActive !== false ? 'Deactivate' : 'Activate'}</button>
        </td>
      </tr>
    `).join('');
  }

  // --- CATEGORIES DATA ---
  async loadCategoriesData() {
    // Standard catalog categories loader
  }

  // --- GOLD RATES DATA ---
  async loadGoldRatesData() {
    const res = await window.AdminService.getGoldRates();
    const tbody = document.querySelector('#gold-rates-history-tbody');
    
    if (res.success && res.data.length) {
      tbody.innerHTML = res.data.map(r => `
        <tr>
          <td><strong>${r.purity}</strong></td>
          <td>₹${(r.ratePerGram || 0).toLocaleString('en-IN')}</td>
          <td>${r.effectiveDate ? new Date(r.effectiveDate).toLocaleString('en-IN') : 'N/A'}</td>
          <td><span class="badge ${r.isActive ? 'badge-success' : 'badge-secondary'}">${r.isActive ? 'CURRENT' : 'HISTORICAL'}</span></td>
        </tr>
      `).join('');

      // Update Top Cards
      res.data.forEach(r => {
        if (r.isActive) {
          const card = document.querySelector(`#rate-card-${r.purity.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
          if (card) card.textContent = `₹${r.ratePerGram.toLocaleString('en-IN')} / Gram`;
        }
      });
    }
  }

  // --- INVENTORY DATA ---
  async loadInventoryData() {
    const res = await window.AdminService.getInventory();
    const tbody = document.querySelector('#inventory-table-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No inventory records available.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(i => `
      <tr>
        <td><strong>${i.name}</strong></td>
        <td><code>${i.sku}</code></td>
        <td><strong style="font-size: 1.1rem; color: #fff;">${i.availableQuantity}</strong></td>
        <td>${i.reservedQuantity}</td>
        <td>${i.soldQuantity}</td>
        <td><span class="badge ${i.status === 'IN_STOCK' ? 'badge-success' : (i.status === 'LOW_STOCK' ? 'badge-warning' : 'badge-danger')}">${i.status.replace(/_/g, ' ')}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="app.openStockModal('${i.productId}', '${i.name.replace(/'/g, "\\'")}')">+ Adjust Stock</button>
        </td>
      </tr>
    `).join('');
  }

  // --- ORDERS DATA ---
  async loadOrdersData() {
    const filter = document.querySelector('#order-status-filter')?.value || 'ALL';
    const res = await window.AdminService.getOrders(filter);
    const tbody = document.querySelector('#orders-table-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No orders match the selected filter (${filter}).</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(o => `
      <tr>
        <td><strong>${o.orderNumber || o.id}</strong></td>
        <td>${o.customerName || 'Customer'}</td>
        <td>${o.phone || 'N/A'}</td>
        <td>₹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-info">${o.paymentMethod || 'UPI'}</span></td>
        <td><span class="badge ${o.orderStatus === 'CONFIRMED' ? 'badge-success' : (o.orderStatus === 'CANCELLED' ? 'badge-danger' : 'badge-warning')}">${o.orderStatus || 'PENDING'}</span></td>
        <td>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN') : 'Today'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="app.updateStatusPrompt('${o.id}', '${o.orderStatus}')">Change Status</button>
        </td>
      </tr>
    `).join('');
  }

  // --- CUSTOMERS DATA ---
  async loadCustomersData() {
    const res = await window.AdminService.getCustomers();
    const tbody = document.querySelector('#customers-table-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No customer profiles recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td><strong>${c.fullName || c.name || 'Customer'}</strong></td>
        <td>${c.email || 'N/A'}</td>
        <td>${c.phone || 'N/A'}</td>
        <td><span class="badge badge-secondary">${c.role || 'CUSTOMER'}</span></td>
        <td><span class="badge badge-success">ACTIVE</span></td>
      </tr>
    `).join('');
  }

  // --- WHATSAPP SETTINGS ---
  async loadWhatsAppSettingsData() {
    const res = await window.AdminService.getSetting('whatsapp');
    if (res.success && res.data) {
      if (res.data.number) document.querySelector('#wa-business-number').value = res.data.number;
      if (res.data.template) document.querySelector('#wa-order-template').value = res.data.template;
    }
  }

  // --- MEDIA LIBRARY ---
  async loadMediaLibraryData() {
    const res = await window.AdminService.getProducts();
    const grid = document.querySelector('#media-library-grid');
    if (!res.success || !res.data.length) {
      grid.innerHTML = `<p style="color: var(--text-muted);">No images found in library.</p>`;
      return;
    }

    const images = [];
    res.data.forEach(p => {
      if (p.images) images.push(...p.images);
      else if (p.imageUrl) images.push(p.imageUrl);
    });

    grid.innerHTML = images.map(url => `
      <div style="position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
        <img src="${url}" style="width:100%; height:100%; object-fit: cover;" />
        <button onclick="navigator.clipboard.writeText('${url}'); app.showToast('Image URL copied to clipboard!', 'success');" style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.7); color: #fff; border: none; padding: 3px 6px; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">Copy</button>
      </div>
    `).join('');
  }

  // --- SEO DATA ---
  async loadSEOData() {
    const res = await window.AdminService.getSetting('seo');
    if (res.success && res.data) {
      if (res.data.title) document.querySelector('#seo-title').value = res.data.title;
      if (res.data.description) document.querySelector('#seo-desc').value = res.data.description;
      if (res.data.keywords) document.querySelector('#seo-keywords').value = res.data.keywords;
    }
  }

  // --- USERS DATA ---
  async loadUsersData() {
    const res = await window.AdminService.getUsers();
    const tbody = document.querySelector('#users-table-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No user accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td><strong>${u.fullName || 'User'}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'ADMIN' ? 'badge-success' : 'badge-info'}">${u.role || 'STAFF'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="app.changeRolePrompt('${u.id}', '${u.role}')">Change Role</button>
        </td>
      </tr>
    `).join('');
  }

  // --- AUDIT LOGS DATA ---
  async loadAuditLogsData() {
    const res = await window.AdminService.getAuditLogs();
    const tbody = document.querySelector('#audit-logs-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No audit logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(l => `
      <tr>
        <td>${l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString('en-IN') : 'Just now'}</td>
        <td>${l.userEmail || 'system'}</td>
        <td><strong>${l.action}</strong></td>
        <td><code>${l.entityType} (${l.entityId || 'N/A'})</code></td>
      </tr>
    `).join('');
  }

  // --- GENERAL SETTINGS DATA ---
  async loadGeneralSettingsData() {
    const res = await window.AdminService.getSetting('site');
    if (res.success && res.data) {
      document.querySelector('#setting-maintenance-mode').checked = Boolean(res.data.maintenanceMode);
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. ACTIONS, MODALS & EVENT HANDLERS
     ══════════════════════════════════════════════════════════ */
  bindGlobalEvents() {
    // Quick Action Buttons
    document.querySelector('#header-quick-add-btn')?.addEventListener('click', () => this.openAddProductModal());
    document.querySelector('#qa-add-product')?.addEventListener('click', () => this.openAddProductModal());
    document.querySelector('#btn-open-add-product-modal')?.addEventListener('click', () => this.openAddProductModal());

    document.querySelector('#qa-add-stock')?.addEventListener('click', () => this.switchView('inventory'));
    document.querySelector('#btn-inventory-add-stock')?.addEventListener('click', () => this.switchView('inventory'));
    document.querySelector('#qa-update-rate')?.addEventListener('click', () => this.switchView('gold_rates'));
    document.querySelector('#qa-view-orders')?.addEventListener('click', () => this.switchView('orders'));
    document.querySelector('#btn-view-all-orders')?.addEventListener('click', () => this.switchView('orders'));

    // Save Buttons
    document.querySelector('#btn-save-product-submit')?.addEventListener('click', (e) => this.handleSaveProduct(e));
    document.querySelector('#btn-submit-stock-adjust')?.addEventListener('click', (e) => this.handleSubmitStockAdjust(e));
    document.querySelector('#save-hero-btn')?.addEventListener('click', () => this.handleSaveHero());
    document.querySelector('#save-brand-btn')?.addEventListener('click', () => this.handleSaveBrand());
    document.querySelector('#save-whatsapp-settings-btn')?.addEventListener('click', () => this.handleSaveWhatsApp());
    document.querySelector('#save-seo-btn')?.addEventListener('click', () => this.handleSaveSEO());
    document.querySelector('#save-general-settings-btn')?.addEventListener('click', () => this.handleSaveGeneralSettings());

    // Order status filter dropdown
    document.querySelector('#order-status-filter')?.addEventListener('change', () => this.loadOrdersData());
  }

  openModal(modalId) {
    const el = document.querySelector(`#${modalId}`);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.querySelector(`#${modalId}`);
    if (el) el.classList.remove('active');
  }

  showToast(message, type = 'success') {
    const container = document.querySelector('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- Product Handlers ---
  openAddProductModal() {
    document.querySelector('#product-modal-form').reset();
    document.querySelector('#pm-id').value = '';
    document.querySelector('#product-modal-title').textContent = 'Add New Product';
    this.openModal('product-modal');
  }

  async editProduct(productId) {
    const res = await window.AdminService.getProducts();
    if (!res.success) return;
    const p = res.data.find(item => item.id === productId);
    if (!p) return;

    document.querySelector('#pm-id').value = p.id;
    document.querySelector('#pm-name').value = p.name;
    document.querySelector('#pm-sku').value = p.sku || '';
    document.querySelector('#pm-weight').value = p.weightGrams || 1.0;
    document.querySelector('#pm-purity').value = p.purity || '24K / 999';
    document.querySelector('#pm-making').value = p.makingCharge || 280;
    document.querySelector('#pm-gst').value = p.gstPercentage || 3;
    document.querySelector('#pm-stock').value = p.stockQuantity || 0;
    document.querySelector('#pm-threshold').value = p.lowStockThreshold || 5;
    document.querySelector('#pm-description').value = p.description || '';

    document.querySelector('#product-modal-title').textContent = 'Edit Product';
    this.openModal('product-modal');
  }

  async handleSaveProduct(e) {
    e.preventDefault();
    const id = document.querySelector('#pm-id').value;
    const name = document.querySelector('#pm-name').value.trim();
    if (!name) {
      this.showToast("Product name is required", "error");
      return;
    }

    const payload = {
      name,
      sku: document.querySelector('#pm-sku').value.trim(),
      categoryId: document.querySelector('#pm-category').value,
      weightGrams: document.querySelector('#pm-weight').value,
      purity: document.querySelector('#pm-purity').value,
      makingCharge: document.querySelector('#pm-making').value,
      gstPercentage: document.querySelector('#pm-gst').value,
      stockQuantity: document.querySelector('#pm-stock').value,
      lowStockThreshold: document.querySelector('#pm-threshold').value,
      description: document.querySelector('#pm-description').value.trim()
    };

    const filesInput = document.querySelector('#pm-images');
    const imageFiles = filesInput?.files ? Array.from(filesInput.files) : [];

    const submitBtn = document.querySelector('#btn-save-product-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const res = await window.AdminService.saveProduct(id || null, payload, imageFiles);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Product';

    if (res.success) {
      this.showToast(res.message, 'success');
      this.closeModal('product-modal');
      await this.loadProductsData();
    } else {
      this.showToast(res.error || "Failed to save product", 'error');
    }
  }

  async toggleProduct(productId, targetActive) {
    if (confirm(`Are you sure you want to ${targetActive ? 'activate' : 'deactivate'} this product?`)) {
      const res = await window.AdminService.toggleProductStatus(productId, targetActive);
      if (res.success) {
        this.showToast(`Product ${targetActive ? 'activated' : 'deactivated'}`, 'success');
        await this.loadProductsData();
      }
    }
  }

  // --- Gold Rate Handler ---
  async promptRateUpdate(purity) {
    const newRateStr = prompt(`Enter new rate per gram for ${purity} (in ₹):`, "9240");
    if (newRateStr) {
      const newRate = Number(newRateStr);
      if (isNaN(newRate) || newRate <= 0) {
        this.showToast("Invalid rate value entered", "error");
        return;
      }
      const res = await window.AdminService.updateGoldRate(purity, newRate);
      if (res.success) {
        this.showToast(res.message, 'success');
        await this.loadGoldRatesData();
        await this.loadDashboardData();
      } else {
        this.showToast(res.error, 'error');
      }
    }
  }

  // --- Stock Adjustment Handler ---
  openStockModal(productId, productName) {
    document.querySelector('#sa-product-id').value = productId;
    document.querySelector('#sa-product-name').value = productName;
    document.querySelector('#sa-quantity').value = '10';
    document.querySelector('#sa-reason').value = 'Stock restock received';
    this.openModal('stock-modal');
  }

  async handleSubmitStockAdjust(e) {
    e.preventDefault();
    const productId = document.querySelector('#sa-product-id').value;
    const actionType = document.querySelector('#sa-action-type').value;
    const qty = parseInt(document.querySelector('#sa-quantity').value) || 0;
    const reason = document.querySelector('#sa-reason').value.trim();

    const delta = actionType === 'REMOVE' ? -qty : qty;
    const res = await window.AdminService.adjustStock(productId, delta, actionType, reason);
    if (res.success) {
      this.showToast(`Stock updated successfully. New available stock: ${res.newStock}`, 'success');
      this.closeModal('stock-modal');
      await this.loadInventoryData();
    } else {
      this.showToast(res.error || "Stock update failed", 'error');
    }
  }

  // --- Order Status Change Handler ---
  async updateStatusPrompt(orderId, currentStatus) {
    const nextStatus = prompt(`Current Status: ${currentStatus}\nEnter new status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED):`, currentStatus);
    if (nextStatus && nextStatus !== currentStatus) {
      const res = await window.AdminService.updateOrderStatus(orderId, nextStatus.toUpperCase());
      if (res.success) {
        this.showToast(`Order status updated to ${nextStatus.toUpperCase()}`, 'success');
        await this.loadOrdersData();
      } else {
        this.showToast(res.error, 'error');
      }
    }
  }

  // --- User Role Change Handler ---
  async changeRolePrompt(userId, currentRole) {
    const newRole = prompt(`Current Role: ${currentRole}\nEnter new role (ADMIN or STAFF):`, currentRole);
    if (newRole && newRole !== currentRole) {
      const res = await window.AdminService.updateUserRole(userId, newRole.toUpperCase());
      if (res.success) {
        this.showToast(res.message, 'success');
        await this.loadUsersData();
      } else {
        this.showToast(res.error, 'error');
      }
    }
  }

  // --- Setting Save Handlers ---
  async handleSaveHero() {
    const heroData = {
      badge: document.querySelector('#hero-badge').value.trim(),
      heading: document.querySelector('#hero-heading').value.trim(),
      subtitle: document.querySelector('#hero-subtitle').value.trim(),
      btnPrimary: document.querySelector('#hero-btn-primary').value.trim(),
      btnSecondary: document.querySelector('#hero-btn-secondary').value.trim(),
      visible: document.querySelector('#hero-visible').checked
    };
    const res = await window.AdminService.saveSetting('homepage', { hero: heroData });
    if (res.success) this.showToast("Hero section updated live!", 'success');
  }

  async handleSaveBrand() {
    const brandData = {
      name: document.querySelector('#brand-name').value.trim(),
      tagline: document.querySelector('#brand-tagline').value.trim(),
      phone: document.querySelector('#brand-phone').value.trim(),
      whatsapp: document.querySelector('#brand-whatsapp').value.trim(),
      email: document.querySelector('#brand-email').value.trim(),
      hours: document.querySelector('#brand-hours').value.trim(),
      address: document.querySelector('#brand-address').value.trim()
    };
    const res = await window.AdminService.saveSetting('branding', brandData);
    if (res.success) this.showToast("Brand settings saved!", 'success');
  }

  async handleSaveWhatsApp() {
    const waData = {
      number: document.querySelector('#wa-business-number').value.trim(),
      template: document.querySelector('#wa-order-template').value.trim()
    };
    const res = await window.AdminService.saveSetting('whatsapp', waData);
    if (res.success) this.showToast("WhatsApp configuration saved!", 'success');
  }

  async handleSaveSEO() {
    const seoData = {
      title: document.querySelector('#seo-title').value.trim(),
      description: document.querySelector('#seo-desc').value.trim(),
      keywords: document.querySelector('#seo-keywords').value.trim()
    };
    const res = await window.AdminService.saveSetting('seo', seoData);
    if (res.success) this.showToast("SEO settings updated!", 'success');
  }

  async handleSaveGeneralSettings() {
    const siteData = {
      maintenanceMode: document.querySelector('#setting-maintenance-mode').checked,
      showGoldRate: document.querySelector('#setting-show-gold-rate').checked,
      allowOrders: document.querySelector('#setting-allow-orders').checked
    };
    const res = await window.AdminService.saveSetting('site', siteData);
    if (res.success) this.showToast("General website settings saved!", 'success');
  }
}

// Instantiate Admin App Controller
window.app = new AdminApp();
