/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAM GOLD — Admin Dashboard Controller
   Focused on: Product Names & Images, Shipping Price, Hero Section, & AI Studio
   ═══════════════════════════════════════════════════════════ */

class AdminApp {
  constructor() {
    this.currentView = 'products';
    this.products = [];
    this.init();
  }

  init() {
    console.log("[AdminApp] Initializing Admin Controller with AI Image Studio.");
    this.bindAuth();
    this.bindNavigation();
    this.bindProductEvents();
    this.bindShippingEvents();
    this.bindHeroEvents();
    this.bindAIStudioEvents();
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
        products: "Product Name & Image Management",
        shipping: "Shipping Price Settings",
        hero: "Hero Section Content & Image Editor"
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
    } else if (this.currentView === 'hero') {
      this.loadHeroData();
    }
  }

  /* ══════════════════════════════════════════════════════════
     3. PRODUCT NAME & IMAGE MANAGEMENT
     ══════════════════════════════════════════════════════════ */
  async loadProductsData() {
    const tbody = document.querySelector('#products-table-tbody');
    if (!tbody) return;

    let products = [];
    // 1. Check local storage first for instant display
    try {
      const localProds = localStorage.getItem('chinni_products');
      if (localProds) {
        const parsed = JSON.parse(localProds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          products = parsed;
        }
      }
    } catch(e) {}

    // Render local/cached products immediately so user never sees empty screen
    if (products.length > 0) {
      this.products = products;
      this.renderProductsTable(products);
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading products...</td></tr>`;
    }

    // 2. Fetch remote products from Supabase/Backend to update local cache
    try {
      if (window.AdminService && window.AdminService.getProducts) {
        const res = await window.AdminService.getProducts();
        let remoteProducts = [];
        if (Array.isArray(res) && res.length > 0) {
          remoteProducts = res;
        } else if (res && Array.isArray(res.data) && res.data.length > 0) {
          remoteProducts = res.data;
        }

        if (remoteProducts.length > 0) {
          // Merge local modifications if present
          const localMap = new Map((this.products || []).map(p => [p.id, p]));
          const merged = remoteProducts.map(rp => {
            const loc = localMap.get(rp.id);
            return loc ? { ...rp, ...loc } : rp;
          });
          this.products = merged;
          localStorage.setItem('chinni_products', JSON.stringify(merged));
          this.renderProductsTable(merged);
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote products, fallback to local cache", e);
    }

    if (!Array.isArray(this.products) || this.products.length === 0) {
      this.products = [
        {
          id: 'e1111111-1111-1111-1111-111111111111',
          name: 'Signature Gold Coin',
          slug: 'signature-gold-coin',
          image_url: 'assets/hero_gold_coin.png',
          imageUrl: 'assets/hero_gold_coin.png',
          price: 9520,
          price_inr: 9520,
          selling_price: 9520,
          active: true
        },
        {
          id: 'e2222222-2222-2222-2222-222222222222',
          name: 'Filigree Gold Pendant',
          slug: 'filigree-gold-pendant',
          image_url: 'assets/product_gold_pendant.png',
          imageUrl: 'assets/product_gold_pendant.png',
          price: 9680,
          price_inr: 9680,
          selling_price: 9680,
          active: true
        },
        {
          id: 'e3333333-3333-3333-3333-333333333333',
          name: 'Gold Coin Gift Box',
          slug: 'gold-coin-gift-box',
          image_url: 'assets/product_gold_gift.png',
          imageUrl: 'assets/product_gold_gift.png',
          price: 9820,
          price_inr: 9820,
          selling_price: 9820,
          active: true
        },
        {
          id: 'e4444444-4444-4444-4444-444444444444',
          name: 'Temple Gold Coin',
          slug: 'temple-gold-coin',
          image_url: 'assets/featured_product.png',
          imageUrl: 'assets/featured_product.png',
          price: 9520,
          price_inr: 9520,
          selling_price: 9520,
          active: true
        },
        {
          id: 'e5555555-5555-5555-5555-555555555555',
          name: 'Classic Gold Bangle',
          slug: 'classic-gold-bangle',
          image_url: 'assets/product_gold_pendant.png',
          imageUrl: 'assets/product_gold_pendant.png',
          price: 8750,
          price_inr: 8750,
          selling_price: 8750,
          active: true
        },
        {
          id: 'e6666666-6666-6666-6666-666666666666',
          name: 'Pure Gold Bar',
          slug: 'pure-gold-bar',
          image_url: 'assets/hero_gold_coin.png',
          imageUrl: 'assets/hero_gold_coin.png',
          price: 9620,
          price_inr: 9620,
          selling_price: 9620,
          active: true
        }
      ];
      localStorage.setItem('chinni_products', JSON.stringify(this.products));
      this.renderProductsTable(this.products);
    }
  }

  renderProductsTable(products) {
    const tbody = document.querySelector('#products-table-tbody');
    if (!tbody) return;

    if (!products || products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No products found. Click "+ Add Product" above.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const img = p.imageUrl || p.image_url || (p.images && p.images[0]) || 'assets/hero_gold_coin.png';
      const price = p.price || p.price_inr || p.selling_price || p.sellingPrice;
      const priceDisplay = price ? `₹${price.toLocaleString('en-IN')}` : '<span style="color:#9aa1b1;font-size:0.8rem;">Not set</span>';
      return `
        <tr>
          <td>
            <img src="${img}" alt="${p.name}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.2);" onerror="this.onerror=null; this.src='assets/hero_gold_coin.png'" />
          </td>
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--gold-light);">1 Gram Pure Gold</div>
          </td>
          <td>
            <span style="font-weight: 700; color: var(--gold-light); font-size: 0.95rem;">${priceDisplay}</span>
          </td>
          <td>
            <span class="badge ${p.active !== false ? 'badge-success' : 'badge-warning'}">${p.active !== false ? 'ACTIVE' : 'INACTIVE'}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${p.id}" style="padding: 6px 14px; font-size: 0.82rem;">
              ✏️ Edit
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

    // Close modal buttons (Cancel & X)
    const cancelBtn = document.querySelector('#product-modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('product-modal'));
    const closeXBtn = document.querySelector('#product-modal-close-x');
    if (closeXBtn) closeXBtn.addEventListener('click', () => this.closeModal('product-modal'));

    // Product Image Upload Trigger
    const prodUploadBtn = document.querySelector('#btn-trigger-product-upload');
    const prodFileInput = document.querySelector('#product-file-upload');
    const prodUrlInput = document.querySelector('#pm-image-url-input');
    const prodThumb = document.querySelector('#pm-image-preview-thumb');

    if (prodUploadBtn && prodFileInput) {
      prodUploadBtn.addEventListener('click', () => prodFileInput.click());
      prodFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          // Validate file size and format
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
            alert("Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP.");
            this.showToast("Upload failed: Invalid format");
            prodFileInput.value = '';
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            alert("Image file exceeds maximum limit of 5MB.");
            this.showToast("Upload failed: File too large");
            prodFileInput.value = '';
            return;
          }

          this.selectedProductFile = file;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            if (prodUrlInput) prodUrlInput.value = dataUrl;
            if (prodThumb) prodThumb.src = dataUrl;
            this.showToast("Product photo selected!");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (prodUrlInput && prodThumb) {
      prodUrlInput.addEventListener('input', () => {
        this.selectedProductFile = null; // Clear any selected upload file so URL takes precedence
        prodThumb.src = prodUrlInput.value.trim() || 'assets/hero_gold_coin.png';
      });
    }

    // AI Enhance Product Image Button
    const aiProductBtn = document.querySelector('#btn-ai-enhance-product');
    if (aiProductBtn) {
      aiProductBtn.addEventListener('click', () => {
        const currentSrc = prodUrlInput?.value.trim() || 'assets/hero_gold_coin.png';
        if (window.AIEditor) {
          window.AIEditor.openWithImage(currentSrc, prodThumb, (enhancedFile, dataUrl) => {
            if (prodUrlInput) prodUrlInput.value = dataUrl;
            if (prodThumb) prodThumb.src = dataUrl;
            this.selectedProductFile = enhancedFile; // Store the enhanced file for upload
          });
        }
      });
    }
  }

  openAddProductModal() {
    this.selectedProductFile = null;
    document.querySelector('#product-modal-title').textContent = "Add Product";
    document.querySelector('#pm-id').value = "";
    document.querySelector('#pm-name').value = "";
    const priceEl = document.querySelector('#pm-price');
    if (priceEl) priceEl.value = "";
    document.querySelector('#pm-image-url-input').value = "assets/hero_gold_coin.png";
    const thumb = document.querySelector('#pm-image-preview-thumb');
    if (thumb) thumb.src = "assets/hero_gold_coin.png";
    this.openModal('product-modal');
  }

  openEditProductModal(prod) {
    this.selectedProductFile = null;
    document.querySelector('#product-modal-title').textContent = "Edit Product Name, Price & Image";
    document.querySelector('#pm-id').value = prod.id || "";
    document.querySelector('#pm-name').value = prod.name || "";
    const priceEl = document.querySelector('#pm-price');
    if (priceEl) priceEl.value = prod.price || prod.price_inr || "";
    const img = prod.image_url || prod.images?.[0] || "assets/hero_gold_coin.png";
    document.querySelector('#pm-image-url-input').value = img;
    const thumb = document.querySelector('#pm-image-preview-thumb');
    if (thumb) thumb.src = img;
    this.openModal('product-modal');
  }

  async handleSaveProduct() {
    const id = document.querySelector('#pm-id').value;
    const name = document.querySelector('#pm-name').value.trim();
    const imageUrl = document.querySelector('#pm-image-url-input').value.trim() || 'assets/hero_gold_coin.png';
    const priceEl = document.querySelector('#pm-price');
    const price = priceEl ? (parseInt(priceEl.value, 10) || 0) : 0;

    if (!name) {
      alert("Please enter a product name.");
      return;
    }
    if (!price || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    const saveBtn = document.querySelector('#btn-save-product-submit');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    let finalImageUrl = imageUrl;
    let uploadSuccess = false;
    let oldImageUrl = null;

    if (id) {
      const existing = this.products.find(p => p.id === id);
      if (existing) {
        oldImageUrl = existing.image_url;
      }
    }

    try {
      if (this.selectedProductFile) {
        const uploadProductId = id || 'new_' + Date.now();
        saveBtn.textContent = "Uploading image...";
        const uploadRes = await window.AdminService.uploadProductImage(uploadProductId, this.selectedProductFile);
        if (uploadRes.success && uploadRes.url) {
          finalImageUrl = uploadRes.url;
          uploadSuccess = true;
        } else {
          throw new Error(uploadRes.error || "Image upload failed.");
        }
      }

      saveBtn.textContent = "Saving to database...";
      
      const payload = {
        name: name,
        image_url: finalImageUrl,
        imageUrl: finalImageUrl,
        price: price,
        price_inr: price,
        selling_price: price,
        sellingPrice: price,
        active: true
      };

      if (id) {
        const existing = this.products.find(p => p.id === id);
        if (existing) {
          Object.assign(existing, payload);
        }
        if (window.AdminService && window.AdminService.saveProduct) {
          try {
            await window.AdminService.saveProduct(id, payload);
          } catch (apiErr) {
            console.warn("Supabase saveProduct warning:", apiErr);
          }
        }
      } else {
        const targetId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Date.now();
        const newProduct = {
          id: targetId,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          ...payload
        };
        this.products.push(newProduct);
        if (window.AdminService && window.AdminService.saveProduct) {
          try {
            await window.AdminService.saveProduct(null, newProduct);
          } catch (apiErr) {
            console.warn("Supabase saveProduct creation warning:", apiErr);
          }
        }
      }

      // 1. Save updated products list to LocalStorage
      localStorage.setItem('chinni_products', JSON.stringify(this.products));

      // 2. Render updated products table immediately
      this.renderProductsTable(this.products);

      // 3. Dispatch global live update event across app & tabs
      window.dispatchEvent(new CustomEvent('cj_products_changed', { detail: this.products }));

      if (uploadSuccess && oldImageUrl && window.AdminService.deleteOldStorageFile) {
        try {
          await window.AdminService.deleteOldStorageFile(oldImageUrl);
        } catch (delErr) {}
      }

      this.selectedProductFile = null;
      sessionStorage.setItem('chinni_selected_product_name', name);
      sessionStorage.setItem('chinni_selected_product_image', finalImageUrl);
      this.closeModal('product-modal');
      this.showToast(`Product "${name}" photo & details updated successfully!`);
    } catch (err) {
      console.error("Save product error:", err);
      alert("Failed to save product: " + err.message);
      this.showToast("Save failed!");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product";
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

  /* ══════════════════════════════════════════════════════════
     5. HERO SECTION & AI IMAGE EDITING
     ══════════════════════════════════════════════════════════ */
  getHeroDefaults() {
    return {
      badge: "Crafted in Pure Gold",
      heading: "Pure Gold.\nSimply Yours.",
      subtitle: "Discover our exquisite 1 Gram Gold collection, crafted for celebrations, gifting and timeless moments.",
      btnPrimary: "Explore Collection",
      btnSecondary: "Order on WhatsApp",
      mediaUrl: "assets/hero_gold_coin.png"
    };
  }

  loadHeroData() {
    const saved = localStorage.getItem('chinni_hero_settings');
    let hero = this.getHeroDefaults();
    if (saved) {
      try {
        hero = Object.assign(hero, JSON.parse(saved));
      } catch(e) {}
    }

    const badgeInput = document.querySelector('#hero-input-badge');
    const headingInput = document.querySelector('#hero-input-heading');
    const subtitleInput = document.querySelector('#hero-input-subtitle');
    const btnPrimaryInput = document.querySelector('#hero-input-btn-primary');
    const btnSecondaryInput = document.querySelector('#hero-input-btn-secondary');
    const mediaInput = document.querySelector('#hero-input-media-url');

    if (badgeInput) badgeInput.value = hero.badge || "";
    if (headingInput) headingInput.value = hero.heading || "";
    if (subtitleInput) subtitleInput.value = hero.subtitle || "";
    if (btnPrimaryInput) btnPrimaryInput.value = hero.btnPrimary || "";
    if (btnSecondaryInput) btnSecondaryInput.value = hero.btnSecondary || "";
    if (mediaInput) mediaInput.value = hero.mediaUrl || "assets/hero_gold_coin.png";

    this.updateHeroLivePreview();
  }

  updateHeroLivePreview() {
    const badgeVal = document.querySelector('#hero-input-badge')?.value || "Crafted in Pure Gold";
    const headingVal = document.querySelector('#hero-input-heading')?.value || "Pure Gold.\nSimply Yours.";
    const subtitleVal = document.querySelector('#hero-input-subtitle')?.value || "";
    const btnPrimaryVal = document.querySelector('#hero-input-btn-primary')?.value || "Explore Collection";
    const btnSecondaryVal = document.querySelector('#hero-input-btn-secondary')?.value || "Order on WhatsApp";
    const mediaVal = document.querySelector('#hero-input-media-url')?.value || "assets/hero_gold_coin.png";

    const prevBadge = document.querySelector('#preview-hero-badge');
    const prevHeading = document.querySelector('#preview-hero-heading');
    const prevSubtitle = document.querySelector('#preview-hero-subtitle');
    const prevBtnP = document.querySelector('#preview-hero-btn-primary');
    const prevBtnS = document.querySelector('#preview-hero-btn-secondary');
    const prevMedia = document.querySelector('#preview-hero-media');
    const prevMediaPath = document.querySelector('#preview-hero-media-path');

    if (prevBadge) prevBadge.textContent = badgeVal;

    if (prevHeading) {
      if (headingVal.includes('\n')) {
        const parts = headingVal.split('\n');
        prevHeading.innerHTML = `${parts[0]}<br><em style="color: var(--gold-light); font-style: italic;">${parts.slice(1).join(' ')}</em>`;
      } else {
        prevHeading.textContent = headingVal;
      }
    }

    if (prevSubtitle) prevSubtitle.textContent = subtitleVal;
    if (prevBtnP) prevBtnP.textContent = btnPrimaryVal;
    if (prevBtnS) prevBtnS.textContent = btnSecondaryVal;
    if (prevMediaPath) prevMediaPath.textContent = mediaVal.length > 50 ? mediaVal.substring(0, 48) + '...' : mediaVal;

    if (prevMedia) {
      prevMedia.src = mediaVal;
    }
  }

  bindHeroEvents() {
    const heroInputs = [
      '#hero-input-badge',
      '#hero-input-heading',
      '#hero-input-subtitle',
      '#hero-input-btn-primary',
      '#hero-input-btn-secondary',
      '#hero-input-media-url'
    ];

    heroInputs.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.addEventListener('input', () => this.updateHeroLivePreview());
        el.addEventListener('change', () => this.updateHeroLivePreview());
      }
    });

    // Preset Media Shortcuts
    document.querySelectorAll('.preset-media-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const mediaInput = document.querySelector('#hero-input-media-url');
        if (mediaInput && url) {
          mediaInput.value = url;
          this.updateHeroLivePreview();
        }
      });
    });

    // Hero Local Photo Upload
    const heroUploadBtn = document.querySelector('#btn-trigger-hero-upload');
    const heroFileInput = document.querySelector('#hero-file-upload');
    const heroMediaInput = document.querySelector('#hero-input-media-url');

    if (heroUploadBtn && heroFileInput) {
      heroUploadBtn.addEventListener('click', () => heroFileInput.click());
      heroFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.selectedHeroFile = file; // Store the selected file
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (heroMediaInput) heroMediaInput.value = ev.target.result;
            this.updateHeroLivePreview();
            this.showToast("Hero photo loaded! Click 'Save Hero Section' to apply.");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Hero AI Enhance Image Button
    const aiHeroBtn = document.querySelector('#btn-ai-enhance-hero');
    if (aiHeroBtn) {
      aiHeroBtn.addEventListener('click', () => {
        const currentSrc = heroMediaInput?.value.trim() || 'assets/hero_gold_coin.png';
        const previewImg = document.querySelector('#preview-hero-media');
        if (window.AIEditor) {
          window.AIEditor.openWithImage(currentSrc, previewImg, (enhancedFile, dataUrl) => {
            if (heroMediaInput) heroMediaInput.value = dataUrl;
            this.selectedHeroFile = enhancedFile; // Store the enhanced file
            this.updateHeroLivePreview();
          });
        }
      });
    }

    // Reset Defaults Button
    const resetBtn = document.querySelector('#btn-reset-hero-defaults');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const def = this.getHeroDefaults();
        document.querySelector('#hero-input-badge').value = def.badge;
        document.querySelector('#hero-input-heading').value = def.heading;
        document.querySelector('#hero-input-subtitle').value = def.subtitle;
        document.querySelector('#hero-input-btn-primary').value = def.btnPrimary;
        document.querySelector('#hero-input-btn-secondary').value = def.btnSecondary;
        document.querySelector('#hero-input-media-url').value = def.mediaUrl;
        this.updateHeroLivePreview();
        this.showToast("Hero section fields reset to default.");
      });
    }

    // Save Hero Form Submit
    const heroForm = document.querySelector('#hero-editor-form');
    if (heroForm) {
      heroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let finalImageUrl = document.querySelector('#hero-input-media-url')?.value.trim() || "assets/hero_gold_coin.png";
        
        const saveBtn = heroForm.querySelector('button[type="submit"]');
        const originalText = saveBtn ? saveBtn.textContent : "Save Hero Section";
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Uploading image...";
        }

        try {
          if (this.selectedHeroFile) {
            const uploadRes = await window.AdminService.uploadBrandingAsset('product-images', this.selectedHeroFile);
            if (uploadRes.success && uploadRes.url) {
              finalImageUrl = uploadRes.url;
              this.selectedHeroFile = null; // Clear it
            } else {
              console.warn("Hero image upload failed, using input value:", uploadRes.error);
            }
          }
        } catch (uploadErr) {
          console.error("Hero image upload error:", uploadErr);
        }

        if (saveBtn) {
          saveBtn.textContent = "Saving...";
        }

        const heroData = {
          badge: document.querySelector('#hero-input-badge')?.value.trim() || "Crafted in Pure Gold",
          heading: document.querySelector('#hero-input-heading')?.value.trim() || "Pure Gold.\nSimply Yours.",
          subtitle: document.querySelector('#hero-input-subtitle')?.value.trim() || "",
          btnPrimary: document.querySelector('#hero-input-btn-primary')?.value.trim() || "Explore Collection",
          btnSecondary: document.querySelector('#hero-input-btn-secondary')?.value.trim() || "Order on WhatsApp",
          mediaUrl: finalImageUrl,
          imageUrl: finalImageUrl,
          updatedAt: Date.now()
        };

        // 1. Save to LocalStorage
        localStorage.setItem('chinni_hero_settings', JSON.stringify(heroData));

        // 2. Sync to Supabase Settings if available
        if (window.AdminService && window.AdminService.saveSetting) {
          try {
            await window.AdminService.saveSetting('homepage', { hero: heroData });
          } catch(err) {
            console.warn("Could not sync to remote settings:", err);
          }
        }

        // 3. Dispatch global event
        window.dispatchEvent(new CustomEvent('cj_setting_updated', {
          detail: { settingId: 'homepage', data: { hero: heroData } }
        }));

        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }

        this.showToast("Hero Section & Image updated successfully!");
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     6. AI IMAGE STUDIO TOP-LEVEL ACCESS
     ══════════════════════════════════════════════════════════ */
  bindAIStudioEvents() {
    const triggers = ['#sidebar-open-ai-studio', '#header-ai-studio-btn'];
    triggers.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.AIEditor) {
            window.AIEditor.openWithImage('assets/hero_gold_coin.png', null, (file, dataUrl) => {
              this.showToast("Enhanced image ready for download or store usage!");
            });
          }
        });
      }
    });
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

function initAdminApp() {
  if (!window.app) {
    window.app = new AdminApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminApp);
} else {
  initAdminApp();
}

