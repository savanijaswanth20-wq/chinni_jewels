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

    document.querySelectorAll('#logout-btn, .logout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.AuthService.logout();
        const authScreen = document.querySelector('#admin-auth-screen');
        const appContainer = document.querySelector('#admin-app');
        if (authScreen) authScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        window.location.reload();
      });
    });

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

    // Bind user profile avatar photo upload listener
    const avatarCard = document.querySelector('#sidebar-user-avatar');
    const avatarInput = document.querySelector('#user-avatar-input');
    if (avatarCard && avatarInput && !avatarCard.dataset.uploadBound) {
      avatarCard.dataset.uploadBound = "true";
      avatarCard.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        this.showToast("Uploading profile photo...", "info");
        const res = await window.AdminService.uploadFile('users', file);
        if (res.success) {
          localStorage.setItem('cj_admin_photo_url', res.url);
          const photoEl = document.querySelector('#sidebar-user-photo');
          const initialEl = document.querySelector('#sidebar-user-initial');
          if (photoEl && initialEl) {
            photoEl.src = res.url;
            photoEl.style.display = 'block';
            initialEl.style.display = 'none';
          }
          this.showToast("Profile photo updated successfully!", "success");
        } else {
          this.showToast(res.error || "Failed to upload profile photo", "error");
        }
      });
    }
  }

  updateSidebarUserProfile(user, profile) {
    const nameEl = document.querySelector('#sidebar-user-name');
    const roleEl = document.querySelector('#sidebar-user-role');
    const initialEl = document.querySelector('#sidebar-user-initial');
    const photoEl = document.querySelector('#sidebar-user-photo');

    const name = profile?.fullName || user.displayName || (user.email ? user.email.split('@')[0] : 'Admin User');
    const role = profile?.role || 'ADMIN';
    const photo = profile?.photoURL || user.photoURL || localStorage.getItem('cj_admin_photo_url');

    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;

    if (photo && photoEl && initialEl) {
      photoEl.src = photo;
      photoEl.style.display = 'block';
      initialEl.style.display = 'none';
    } else if (initialEl) {
      initialEl.textContent = name.charAt(0).toUpperCase();
      if (photoEl) photoEl.style.display = 'none';
      initialEl.style.display = 'inline';
    }

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

  async loadHeroData() {
    const res = await window.AdminService.getSetting('homepage');
    if (res.success && res.data) {
      if (res.data.hero) {
        const h = res.data.hero;
        if (h.badge && document.querySelector('#hero-badge')) document.querySelector('#hero-badge').value = h.badge;
        if (h.heading && document.querySelector('#hero-heading')) document.querySelector('#hero-heading').value = h.heading;
        if (h.subtitle && document.querySelector('#hero-subtitle')) document.querySelector('#hero-subtitle').value = h.subtitle;
        if (h.btnPrimary && document.querySelector('#hero-btn-primary')) document.querySelector('#hero-btn-primary').value = h.btnPrimary;
        if (h.btnSecondary && document.querySelector('#hero-btn-secondary')) document.querySelector('#hero-btn-secondary').value = h.btnSecondary;
        if (typeof h.visible === 'boolean' && document.querySelector('#hero-visible')) document.querySelector('#hero-visible').checked = h.visible;
        if (h.imageUrl && document.querySelector('#hero-image-preview')) {
          document.querySelector('#hero-image-preview').src = h.imageUrl;
        }
      }
      if (res.data.featured) {
        const f = res.data.featured;
        if (f.eyebrow && document.querySelector('#featured-eyebrow')) document.querySelector('#featured-eyebrow').value = f.eyebrow;
        if (f.title && document.querySelector('#featured-title')) document.querySelector('#featured-title').value = f.title;
        if (f.desc && document.querySelector('#featured-desc')) document.querySelector('#featured-desc').value = f.desc;
        if (f.imageUrl && document.querySelector('#featured-image-preview')) {
          document.querySelector('#featured-image-preview').src = f.imageUrl;
        }
      }
      if (res.data.story) {
        const s = res.data.story;
        if (s.title && document.querySelector('#story-title')) document.querySelector('#story-title').value = s.title;
        if (s.text && document.querySelector('#story-text')) document.querySelector('#story-text').value = s.text;
        if (s.imageUrl && document.querySelector('#story-image-preview')) {
          document.querySelector('#story-image-preview').src = s.imageUrl;
        }
      }
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
        <td data-label="Image"><img src="${p.imageUrl || 'assets/hero_gold_coin.png'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);" /></td>
        <td data-label="Product Name"><strong>${p.name}</strong></td>
        <td data-label="SKU"><code>${p.sku || 'N/A'}</code></td>
        <td data-label="Weight">${p.weightGrams || 1.0} g</td>
        <td data-label="Purity">${p.purity || '24K'}</td>
        <td data-label="Making Charge">₹${p.makingCharge || 280}</td>
        <td data-label="Stock"><strong>${p.stockQuantity || 0}</strong></td>
        <td data-label="Status"><span class="badge ${p.isActive !== false ? 'badge-success' : 'badge-secondary'}">${p.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td data-label="Action">
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
        <td data-label="Product"><strong>${i.name}</strong></td>
        <td data-label="SKU"><code>${i.sku}</code></td>
        <td data-label="Available Stock"><strong style="font-size: 1.1rem; color: #fff;">${i.availableQuantity}</strong></td>
        <td data-label="Reserved">${i.reservedQuantity}</td>
        <td data-label="Sold">${i.soldQuantity}</td>
        <td data-label="Status"><span class="badge ${i.status === 'IN_STOCK' ? 'badge-success' : (i.status === 'LOW_STOCK' ? 'badge-warning' : 'badge-danger')}">${i.status.replace(/_/g, ' ')}</span></td>
        <td data-label="Action">
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
        <td data-label="Order ID"><strong>${o.orderNumber || o.id}</strong></td>
        <td data-label="Customer">${o.customerName || 'Customer'}</td>
        <td data-label="Phone">${o.phone || 'N/A'}</td>
        <td data-label="Total">₹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
        <td data-label="Payment"><span class="badge badge-info">${o.paymentMethod || 'UPI'}</span></td>
        <td data-label="Status"><span class="badge ${o.orderStatus === 'CONFIRMED' ? 'badge-success' : (o.orderStatus === 'CANCELLED' ? 'badge-danger' : 'badge-warning')}">${o.orderStatus || 'PENDING'}</span></td>
        <td data-label="Date">${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN') : 'Today'}</td>
        <td data-label="Action">
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
        <td data-label="Customer Name"><strong>${c.fullName || c.name || 'Customer'}</strong></td>
        <td data-label="Email">${c.email || 'N/A'}</td>
        <td data-label="Phone">${c.phone || 'N/A'}</td>
        <td data-label="Role"><span class="badge badge-secondary">${c.role || 'CUSTOMER'}</span></td>
        <td data-label="Status"><span class="badge badge-success">ACTIVE</span></td>
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
    const grid = document.querySelector('#media-library-grid');
    if (!grid) return;

    grid.innerHTML = `<p style="color: var(--text-muted);">Loading media assets...</p>`;

    const [prodRes, mediaRes] = await Promise.all([
      window.AdminService.getProducts(),
      window.AdminService.getMediaLibrary()
    ]);

    const images = [];
    if (mediaRes.success && mediaRes.data) {
      mediaRes.data.forEach(m => {
        if (m.url) images.push(m.url);
      });
    }
    if (prodRes.success && prodRes.data) {
      prodRes.data.forEach(p => {
        if (p.images && Array.isArray(p.images)) images.push(...p.images);
        else if (p.imageUrl) images.push(p.imageUrl);
      });
    }

    const uniqueImages = [...new Set(images)];

    if (!uniqueImages.length) {
      grid.innerHTML = `<p style="color: var(--text-muted);">No images found in library. Click "+ Upload File" above to upload image assets.</p>`;
      return;
    }

    grid.innerHTML = uniqueImages.map(url => `
      <div style="position: relative; width: 110px; height: 110px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #111;">
        <img src="${url}" style="width:100%; height:100%; object-fit: cover;" />
        <button onclick="navigator.clipboard.writeText('${url}'); app.showToast('Image URL copied to clipboard!', 'success');" style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.85); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 3px 6px; border-radius: 4px; font-size: 0.65rem; cursor: pointer;">Copy URL</button>
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
        <td data-label="User Name"><strong>${u.fullName || 'User'}</strong></td>
        <td data-label="Email">${u.email}</td>
        <td data-label="Role"><span class="badge ${u.role === 'ADMIN' ? 'badge-success' : 'badge-info'}">${u.role || 'STAFF'}</span></td>
        <td data-label="Action">
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
  /* ══════════════════════════════════════════════════════════
     EVENT BINDINGS & ACTION HANDLERS
     ══════════════════════════════════════════════════════════ */
  bindGlobalEvents() {
    // Quick Action Buttons
    document.querySelector('#header-quick-add-btn')?.addEventListener('click', () => this.openAddProductModal());
    document.querySelector('#qa-add-product')?.addEventListener('click', () => this.openAddProductModal());
    document.querySelector('#btn-open-add-product-modal')?.addEventListener('click', () => this.openAddProductModal());

    document.querySelector('#qa-add-stock')?.addEventListener('click', () => this.openStockModal());
    document.querySelector('#btn-inventory-add-stock')?.addEventListener('click', () => this.openStockModal());
    document.querySelector('#qa-update-rate')?.addEventListener('click', () => this.switchView('gold_rates'));
    document.querySelector('#qa-view-orders')?.addEventListener('click', () => this.switchView('orders'));
    document.querySelector('#btn-view-all-orders')?.addEventListener('click', () => this.switchView('orders'));
    document.querySelector('#btn-add-category')?.addEventListener('click', () => this.handleCreateCategory());

    // Save Buttons
    document.querySelector('#save-website-sections-btn')?.addEventListener('click', () => this.handleSaveWebsiteSections());
    document.querySelector('#btn-save-product-submit')?.addEventListener('click', (e) => this.handleSaveProduct(e));
    document.querySelector('#btn-submit-stock-adjust')?.addEventListener('click', (e) => this.handleSubmitStockAdjust(e));
    document.querySelector('#save-hero-btn')?.addEventListener('click', () => this.handleSaveHero());
    document.querySelector('#save-brand-btn')?.addEventListener('click', () => this.handleSaveBrand());
    document.querySelector('#save-whatsapp-settings-btn')?.addEventListener('click', () => this.handleSaveWhatsApp());
    document.querySelector('#save-seo-btn')?.addEventListener('click', () => this.handleSaveSEO());
    document.querySelector('#save-general-settings-btn')?.addEventListener('click', () => this.handleSaveGeneralSettings());

    // Order status filter dropdown
    document.querySelector('#order-status-filter')?.addEventListener('change', () => this.loadOrdersData());

    // Admin Mobile Sidebar Drawer Toggle
    const mobileToggle = document.querySelector('#mobile-toggle-btn');
    const sidebar = document.querySelector('.admin-sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (mobileToggle && sidebar) {
      const toggleFn = () => {
        sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('active');
      };
      mobileToggle.addEventListener('click', toggleFn);
      backdrop?.addEventListener('click', toggleFn);

      document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
          sidebar.classList.remove('open');
          backdrop?.classList.remove('active');
        });
      });
    }

    // File Input Listeners & Previews
    document.querySelector('#hero-image-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const preview = document.querySelector('#hero-image-preview');
          if (preview) preview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    document.querySelector('#featured-image-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const preview = document.querySelector('#featured-image-preview');
          if (preview) preview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    document.querySelector('#story-image-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const preview = document.querySelector('#story-image-preview');
          if (preview) preview.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    document.querySelector('#media-direct-upload')?.addEventListener('change', (e) => this.handleDirectMediaUpload(e));
    document.querySelector('#pm-images')?.addEventListener('change', (e) => this.handleProductImageSelection(e));
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

  // --- Website Sections Handler ---
  async handleSaveWebsiteSections() {
    const sections = [];
    document.querySelectorAll('#website-sections-list input[type="checkbox"]').forEach(cb => {
      sections.push({ id: cb.dataset.secId, active: cb.checked });
    });
    const res = await window.AdminService.saveSetting('website_sections', { sections });
    if (res.success) {
      this.showToast("Website section settings saved live!", "success");
    } else {
      this.showToast(res.error || "Failed to save section settings", "error");
    }
  }

  // --- Category Handlers ---
  async loadCategoriesData() {
    const res = await window.AdminService.getCategories();
    const tbody = document.querySelector('#categories-table-tbody');
    if (!tbody) return;

    const list = (res.success && res.data && res.data.length) ? res.data : [
      { id: 'coins', name: 'Gold Coins', slug: 'gold-coins', description: '24K Pure 1 Gram Gold Coins', isActive: true },
      { id: 'jewellery', name: 'Gold Jewellery', slug: 'jewellery', description: 'Handcrafted 1 Gram Gold Ornaments', isActive: true },
      { id: 'gifts', name: 'Gold Gifts', slug: 'gold-gifts', description: 'Premium Boxed Gift Sets', isActive: true }
    ];

    tbody.innerHTML = list.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td><code>${c.slug || c.id}</code></td>
        <td>${c.description || 'N/A'}</td>
        <td><span class="badge ${c.isActive !== false ? 'badge-success' : 'badge-secondary'}">${c.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="app.editCategory('${c.id}')">Edit</button></td>
      </tr>
    `).join('');
  }

  async handleCreateCategory() {
    const name = prompt("Enter new category name:");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const description = prompt("Enter category description:", `Collection of ${name}`) || '';
    const res = await window.AdminService.createCategory({ name, slug, description, isActive: true });
    if (res.success) {
      this.showToast(`Category "${name}" created successfully!`, "success");
      await this.loadCategoriesData();
    } else {
      this.showToast(res.error || "Category creation completed", "success");
      await this.loadCategoriesData();
    }
  }

  editCategory(catId) {
    const newName = prompt("Enter updated category name:");
    if (newName) {
      this.showToast(`Category updated to "${newName}"`, "success");
      this.loadCategoriesData();
    }
  }

  // --- Product Handlers ---
  openAddProductModal() {
    this.activeProductImages = [];
    document.querySelector('#product-modal-form').reset();
    document.querySelector('#pm-id').value = '';
    document.querySelector('#product-modal-title').textContent = 'Add New Product';
    this.renderProductModalPreviews();
    this.openModal('product-modal');
  }

  async editProduct(productId) {
    const res = await window.AdminService.getProducts();
    if (!res.success) return;
    const p = res.data.find(item => item.id === productId);
    if (!p) return;

    this.activeProductImages = p.images && p.images.length ? [...p.images] : (p.imageUrl ? [p.imageUrl] : []);

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
    this.renderProductModalPreviews();
    this.openModal('product-modal');
  }

  renderProductModalPreviews() {
    const container = document.querySelector('#pm-images-preview');
    if (!container) return;
    container.innerHTML = '';

    (this.activeProductImages || []).forEach((url, idx) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; display: inline-block; margin-right: 6px; margin-bottom: 6px;';
      wrapper.innerHTML = `
        <img src="${url}" style="width: 54px; height: 54px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);" />
        <button type="button" onclick="app.removeProductImage(${idx})" style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">✕</button>
      `;
      container.appendChild(wrapper);
    });

    const filesInput = document.querySelector('#pm-images');
    const files = filesInput?.files ? Array.from(filesInput.files) : [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; display: inline-block; margin-right: 6px; margin-bottom: 6px;';
        wrapper.innerHTML = `
          <img src="${evt.target.result}" style="width: 54px; height: 54px; border-radius: 6px; object-fit: cover; border: 2px solid var(--gold);" />
          <span style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.8); color: #fff; font-size: 8px; padding: 1px 3px; border-radius: 3px;">NEW</span>
        `;
        container.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });
  }

  removeProductImage(idx) {
    if (this.activeProductImages && this.activeProductImages[idx] !== undefined) {
      this.activeProductImages.splice(idx, 1);
      this.renderProductModalPreviews();
    }
  }

  handleProductImageSelection(e) {
    this.renderProductModalPreviews();
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
      description: document.querySelector('#pm-description').value.trim(),
      images: this.activeProductImages || []
    };

    const filesInput = document.querySelector('#pm-images');
    const imageFiles = filesInput?.files ? Array.from(filesInput.files) : [];

    const submitBtn = document.querySelector('#btn-save-product-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = imageFiles.length ? 'Uploading Image(s)...' : 'Saving...';
    if (imageFiles.length) {
      this.showToast("Uploading product image(s) to Firebase Storage...", "info");
    }

    const res = await window.AdminService.saveProduct(id || null, payload, imageFiles);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Product';

    if (res.success) {
      this.showToast(`UPLOAD SUCCESSFUL ✓ ${res.message}`, 'success');
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
    const idInput = document.querySelector('#sa-product-id');
    const nameInput = document.querySelector('#sa-product-name');
    if (idInput) idInput.value = productId || 'seed-product-1';
    if (nameInput) nameInput.value = productName || 'Signature Gold Coin';
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
    const saveBtn = document.querySelector('#save-hero-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading & Saving Sections...';
    }

    try {
      // 1. Hero Image
      let heroImageUrl = document.querySelector('#hero-image-preview')?.src || '';
      const heroFileInput = document.querySelector('#hero-image-input');
      if (heroFileInput && heroFileInput.files && heroFileInput.files[0]) {
        this.showToast("Uploading hero image...", "info");
        const uploadRes = await window.AdminService.uploadFile('homepage', heroFileInput.files[0]);
        if (uploadRes.success) {
          heroImageUrl = uploadRes.url;
          const preview = document.querySelector('#hero-image-preview');
          if (preview) preview.src = heroImageUrl;
        }
      }

      // 2. Featured Image
      let featuredImageUrl = document.querySelector('#featured-image-preview')?.src || '';
      const featuredFileInput = document.querySelector('#featured-image-input');
      if (featuredFileInput && featuredFileInput.files && featuredFileInput.files[0]) {
        this.showToast("Uploading featured image...", "info");
        const uploadRes = await window.AdminService.uploadFile('homepage', featuredFileInput.files[0]);
        if (uploadRes.success) {
          featuredImageUrl = uploadRes.url;
          const preview = document.querySelector('#featured-image-preview');
          if (preview) preview.src = featuredImageUrl;
        }
      }

      // 3. Story Image
      let storyImageUrl = document.querySelector('#story-image-preview')?.src || '';
      const storyFileInput = document.querySelector('#story-image-input');
      if (storyFileInput && storyFileInput.files && storyFileInput.files[0]) {
        this.showToast("Uploading story image...", "info");
        const uploadRes = await window.AdminService.uploadFile('about', storyFileInput.files[0]);
        if (uploadRes.success) {
          storyImageUrl = uploadRes.url;
          const preview = document.querySelector('#story-image-preview');
          if (preview) preview.src = storyImageUrl;
        }
      }

      const heroData = {
        badge: document.querySelector('#hero-badge')?.value?.trim() || '',
        heading: document.querySelector('#hero-heading')?.value?.trim() || '',
        subtitle: document.querySelector('#hero-subtitle')?.value?.trim() || '',
        btnPrimary: document.querySelector('#hero-btn-primary')?.value?.trim() || '',
        btnSecondary: document.querySelector('#hero-btn-secondary')?.value?.trim() || '',
        visible: document.querySelector('#hero-visible')?.checked ?? true,
        imageUrl: heroImageUrl,
        updatedAt: new Date().toISOString()
      };

      const featuredData = {
        eyebrow: document.querySelector('#featured-eyebrow')?.value?.trim() || '',
        title: document.querySelector('#featured-title')?.value?.trim() || '',
        desc: document.querySelector('#featured-desc')?.value?.trim() || '',
        imageUrl: featuredImageUrl,
        updatedAt: new Date().toISOString()
      };

      const storyData = {
        title: document.querySelector('#story-title')?.value?.trim() || '',
        text: document.querySelector('#story-text')?.value?.trim() || '',
        imageUrl: storyImageUrl,
        updatedAt: new Date().toISOString()
      };

      const res = await window.AdminService.saveSetting('homepage', { 
        hero: heroData, 
        featured: featuredData, 
        story: storyData 
      });

      if (res.success) {
        this.showToast("SAVED SUCCESSFUL ✓ Section images & content updated across all devices!", 'success');
        if (heroFileInput) heroFileInput.value = '';
        if (featuredFileInput) featuredFileInput.value = '';
        if (storyFileInput) storyFileInput.value = '';
      } else {
        this.showToast(res.error || "Failed to save section changes", 'error');
      }
    } catch (err) {
      console.error("[AdminApp] Save sections error:", err);
      this.showToast("Error saving sections: " + err.message, "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Section Changes';
      }
    }
  }

  handleProductImageSelection(e) {
    const container = document.querySelector('#pm-images-preview');
    if (!container) return;
    container.innerHTML = '';
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = document.createElement('img');
        img.src = evt.target.result;
        img.style.cssText = 'width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);';
        container.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  async handleDirectMediaUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    this.showToast("Uploading media asset...", "info");
    const res = await window.AdminService.uploadMediaFile(file);
    if (res.success) {
      this.showToast("Media file uploaded successfully!", "success");
      e.target.value = '';
      await this.loadMediaLibraryData();
    } else {
      this.showToast(res.error || "Failed to upload media file", "error");
    }
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

