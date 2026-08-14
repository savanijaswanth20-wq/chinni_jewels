/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Main JavaScript
   ═══════════════════════════════════════════════════════════ */

const WA_NUMBER = '916304702907';

/* ── Utility Functions ── */
function waLink(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

function showToast(message, type = 'gold') {
  let container = document.querySelector('#customer-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'customer-toast-container';
    container.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #13151b; color: #fff; border: 1px solid rgba(212, 175, 55, 0.4);
    padding: 12px 20px; border-radius: 30px; font-size: 0.88rem; font-weight: 500;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;
    opacity: 0; transform: translateY(20px); pointer-events: auto;
  `;
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function updateCartBadge() {
  const wishlist = JSON.parse(localStorage.getItem('chinni_wishlist') || '[]');
  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.textContent = wishlist.length;
  });
}

/* ══════════════════════════════════════════════════════════
   NAVBAR & SEARCH & CART BUTTONS
   ══════════════════════════════════════════════════════════ */
(function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  // Mobile menu toggle & controls
  if (hamburger && mobileNav) {
    function openMenu() {
      hamburger.classList.add('open');
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mobileNav.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('click', (e) => {
      if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  updateCartBadge();
})();

/* ══════════════════════════════════════════════════════════
   GLOBAL EVENT DELEGATION (WHATSAPP, WISHLIST, SEARCH, CART)
   ══════════════════════════════════════════════════════════ */
document.addEventListener('click', (e) => {
  // 1. Search Button Click
  const searchBtn = e.target.closest('#search-btn, button[aria-label="Search"]');
  if (searchBtn) {
    e.preventDefault();
    const stockSearch = document.querySelector('#stock-search');
    if (stockSearch) {
      stockSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      stockSearch.focus();
    } else {
      openSearchModal();
    }
    return;
  }

  // 2. Cart Icon Click
  const cartBtn = e.target.closest('a.nav-icon-btn[aria-label="Cart"]');
  if (cartBtn) {
    e.preventDefault();
    window.location.href = 'checkout.html';
    return;
  }

  // 3. Wishlist Toggle Button
  const wishlistBtn = e.target.closest('.wishlist-btn');
  if (wishlistBtn) {
    e.preventDefault();
    e.stopPropagation();
    wishlistBtn.classList.toggle('liked');

    const card = wishlistBtn.closest('.product-card');
    const name = card ? (card.querySelector('.product-card-name')?.textContent.trim() || 'Signature Gold Item') : 'Signature Gold Item';

    let wishlist = JSON.parse(localStorage.getItem('chinni_wishlist') || '[]');
    const isLiked = wishlistBtn.classList.contains('liked');

    if (isLiked) {
      if (!wishlist.includes(name)) wishlist.push(name);
      showToast(`Added "${name}" to Wishlist`);
    } else {
      wishlist = wishlist.filter(item => item !== name);
      showToast(`Removed "${name}" from Wishlist`);
    }

    localStorage.setItem('chinni_wishlist', JSON.stringify(wishlist));
    updateCartBadge();
    return;
  }

  // 4. WhatsApp Order Button (data-wa-order)
  const waOrderBtn = e.target.closest('[data-wa-order]');
  if (waOrderBtn) {
    e.preventDefault();
    const productSlug = waOrderBtn.dataset.waOrder || 'Signature Gold Coin';
    sessionStorage.setItem('chinni_selected_product_slug', productSlug);
    sessionStorage.setItem('chinni_selected_product_name', productSlug);
    window.location.href = 'checkout.html';
    return;
  }

  // 5. WhatsApp General Inquiry Button (data-wa-general)
  const waGenBtn = e.target.closest('[data-wa-general]');
  if (waGenBtn) {
    e.preventDefault();
    const msg = `Hello! I'm interested in your 1 Gram Gold products at CHINNI JEWELS. Please help me with pricing and availability.`;
    window.open(waLink(msg), '_blank');
    return;
  }

  // 6. View Product / View Item Card Links
  const viewProdLink = e.target.closest('a[href="product.html"], a[href^="product.html?"]');
  if (viewProdLink) {
    const card = viewProdLink.closest('.product-card');
    if (card) {
      const nameEl = card.querySelector('.product-card-name');
      if (nameEl) {
        const name = nameEl.textContent.trim();
        sessionStorage.setItem('chinni_selected_product_name', name);
        sessionStorage.setItem('chinni_selected_product_slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      }
    }
  }
});

/* ══════════════════════════════════════════════════════════
   SEARCH OVERLAY MODAL
   ══════════════════════════════════════════════════════════ */
function openSearchModal() {
  let modal = document.querySelector('#global-search-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(11, 12, 16, 0.92); backdrop-filter: blur(12px);
      z-index: 999999; display: flex; flex-direction: column; align-items: center;
      padding: 5rem 1.5rem; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
    `;
    modal.innerHTML = `
      <div style="width: 100%; max-width: 600px; position: relative;">
        <button id="close-search-modal" style="position: absolute; right: 0; top: -50px; background: none; border: none; color: #d4af37; font-size: 2rem; cursor: pointer;">✕</button>
        <div style="position: relative; margin-bottom: 2rem;">
          <input type="text" id="global-search-input" placeholder="Search gold coins, bars, jewellery..." style="
            width: 100%; padding: 1.2rem 1.5rem; background: #181b24; border: 1px solid rgba(212,175,55,0.4);
            border-radius: 12px; color: #fff; font-size: 1.1rem; outline: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          " />
        </div>
        <div id="search-modal-results" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto;">
          <div style="color: #9aa1b1; font-size: 0.9rem; text-align: center;">Type to search live stock...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#close-search-modal').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    const input = modal.querySelector('#global-search-input');
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const resultsContainer = modal.querySelector('#search-modal-results');
      if (!q) {
        resultsContainer.innerHTML = `<div style="color: #9aa1b1; font-size: 0.9rem; text-align: center;">Type to search live stock...</div>`;
        return;
      }

      const liveProducts = window.allFirestoreProducts || [];
      const defaultCatalog = [
        { name: "Signature Gold Coin", category: "Coins", price: "₹9,520", purity: "24K", id: "sig-gold-coin" },
        { name: "Lakshmi Embossed Gold Coin", category: "Coins", price: "₹9,550", purity: "24K", id: "lakshmi-gold-coin" },
        { name: "Swiss Minted Gold Bar", category: "Bars", price: "₹9,620", purity: "24K", id: "swiss-gold-bar" },
        { name: "Filigree Gold Pendant", category: "Jewellery", price: "₹9,680", purity: "24K", id: "filigree-pendant" },
        { name: "Classic Gold Bangle", category: "Jewellery", price: "₹8,750", purity: "22K", id: "classic-bangle" },
        { name: "Velvet Box Gold Gift Set", category: "Gifts", price: "₹9,820", purity: "24K", id: "velvet-gift-set" },
        { name: "Lotus Floral Gold Coin", category: "Coins", price: "₹9,580", purity: "24K", id: "lotus-gold-coin" }
      ];

      const itemsToSearch = liveProducts.length ? liveProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.categoryName || p.purity || 'Coins',
        price: '₹' + calculateProductPrice(p).toLocaleString('en-IN'),
        purity: p.purity || '24K'
      })) : defaultCatalog;

      const matches = itemsToSearch.filter(item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.purity.toLowerCase().includes(q));
      if (!matches.length) {
        resultsContainer.innerHTML = `<div style="color: #9aa1b1; font-size: 0.9rem; text-align: center;">No items found matching "${q}"</div>`;
        return;
      }

      resultsContainer.innerHTML = matches.map(item => `
        <div class="search-result-item" data-id="${item.id || ''}" data-name="${item.name}" style="
          background: #1e222e; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem 1.25rem;
          display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s ease;
        ">
          <div>
            <div style="font-weight: 600; color: #fff; margin-bottom: 2px;">${item.name}</div>
            <div style="font-size: 0.8rem; color: #d4af37;">${item.purity} Pure Gold · ${item.category}</div>
          </div>
          <div style="font-weight: 700; color: #fff;">${item.price}</div>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.dataset.name;
          const id = item.dataset.id;
          if (id) sessionStorage.setItem('chinni_selected_product_id', id);
          sessionStorage.setItem('chinni_selected_product_name', name);
          sessionStorage.setItem('chinni_selected_product_slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          modal.style.display = 'none';
          window.location.href = 'product.html';
        });
      });
    });
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.querySelector('#global-search-input').focus(), 100);
}

/* ══════════════════════════════════════════════════════════
   HERO IMAGE REVEAL & SCROLL REVEAL
   ══════════════════════════════════════════════════════════ */
(function initHeroReveal() {
  const heroImg = document.querySelector('.hero-image');
  if (!heroImg) return;
  setTimeout(() => heroImg.classList.add('revealed'), 200);
})();

(function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   COLLECTION & STOCK FILTER TABS
   ══════════════════════════════════════════════════════════ */
(function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;

      // Filter Grid Cards
      document.querySelectorAll('.product-card[data-category]').forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
      });

      // Filter Table Rows (stock.html)
      document.querySelectorAll('.stock-table-row[data-category]').forEach(row => {
        const match = filter === 'all' || row.dataset.category === filter;
        row.style.display = match ? '' : 'none';
      });
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   PRODUCT PAGE CONTROLLER (product.html)
   ══════════════════════════════════════════════════════════ */
(function initProductPage() {
  const titleEl = document.querySelector('.product-title');
  if (!titleEl) return;

  // Restore or load product data from sessionStorage / URL
  const selectedName = sessionStorage.getItem('chinni_selected_product_name') || 'Signature Gold Coin';
  if (selectedName && selectedName !== 'Signature Gold Coin') {
    titleEl.textContent = selectedName;
    const breadcrumbEl = document.querySelector('.product-breadcrumb span');
    if (breadcrumbEl) breadcrumbEl.textContent = selectedName;
  }

  // Gallery Thumbnails Click Handler
  const mainImg = document.querySelector('.main-image-wrap img');
  const thumbs = document.querySelectorAll('.thumb-item');
  if (mainImg && thumbs.length) {
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const src = thumb.querySelector('img').src;
        mainImg.style.opacity = '0';
        mainImg.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
          mainImg.src = src;
          mainImg.style.opacity = '1';
        }, 200);
      });
    });
  }

  // Quantity Selector Buttons
  const minusBtn = document.querySelector('.qty-btn.minus');
  const plusBtn = document.querySelector('.qty-btn.plus');
  const qtyInput = document.querySelector('.qty-input');

  if (qtyInput) {
    let savedQty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || 1;
    qtyInput.value = savedQty;

    function updateQty(val) {
      const n = Math.max(1, Math.min(10, val));
      qtyInput.value = n;
      sessionStorage.setItem('chinni_selected_qty', n);
      updateTotal(n);
    }

    if (minusBtn) minusBtn.addEventListener('click', () => updateQty(+qtyInput.value - 1));
    if (plusBtn) plusBtn.addEventListener('click', () => updateQty(+qtyInput.value + 1));
    qtyInput.addEventListener('change', () => updateQty(+qtyInput.value));

    function updateTotal(qty) {
      const storedId = sessionStorage.getItem('chinni_selected_product_id');
      const selectedName = titleEl ? titleEl.textContent : 'Signature Gold Coin';
      const products = window.allFirestoreProducts || [];
      const activeProduct = products.find(p => p.id === storedId || p.name === selectedName) || null;

      const { goldVal, makingVal, gstVal, grandTotal } = computeProductTotals(activeProduct, qty);

      const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = '₹' + val.toLocaleString('en-IN');
      };

      set('.gold-value-price', goldVal);
      set('.making-charges-price', makingVal);
      set('.gst-price', gstVal);
      set('.total-price', grandTotal);
      set('.sticky-price', grandTotal);
    }

    updateTotal(savedQty);
  }

  // "Buy Now" Button Listener
  const buyNowBtn = document.querySelector('.product-actions .btn-primary');
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentQty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
      sessionStorage.setItem('chinni_selected_qty', currentQty);
      if (titleEl) sessionStorage.setItem('chinni_selected_product_name', titleEl.textContent);
      window.location.href = 'checkout.html';
    });
  }

  // Accordion Header Toggles
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  const firstAcc = document.querySelector('.accordion-item');
  if (firstAcc) firstAcc.classList.add('open');
})();

/* ══════════════════════════════════════════════════════════
   CHECKOUT MULTI-STEP & DYNAMIC SUMMARY (checkout.html)
   ══════════════════════════════════════════════════════════ */
(function initCheckout() {
  const step1 = document.querySelector('#step-1');
  const step2 = document.querySelector('#step-2');
  const nextBtn = document.querySelector('#next-step-btn');
  const backBtn = document.querySelector('#back-step-btn');
  const stepNums = document.querySelectorAll('.progress-step');

  if (!step1) return;

  // Dynamically populate checkout summary for selected product & quantity
  (async function loadCheckoutSummary() {
    const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || parseInt(sessionStorage.getItem('cninni_selected_qty')) || 1;
    const storedId = sessionStorage.getItem('chinni_selected_product_id');
    const selectedName = sessionStorage.getItem('chinni_selected_product_name') || sessionStorage.getItem('chinni_selected_product_slug') || "Signature Gold Coin";

    let product = null;
    let rates24k = 9240;

    if (window.ApiClient) {
      try {
        const ratesRes = await ApiClient.getGoldRates();
        if (ratesRes && ratesRes.success && ratesRes.data && ratesRes.data['24K']) {
          rates24k = Number(ratesRes.data['24K']) || 9240;
        }
      } catch(e) {}

      try {
        const res = await ApiClient.getProducts();
        if (res && res.success && res.data && res.data.length > 0) {
          product = res.data.find(p => p.id === storedId || p.name.toLowerCase() === selectedName.toLowerCase() || p.slug === selectedName) || res.data[0];
        }
      } catch(e) {}
    }

    const productName = product ? product.name : (selectedName !== 'signature-gold-coin' ? selectedName : "Signature Gold Coin");
    const { goldVal, makingVal, gstVal, grandTotal, weight, purity } = computeProductTotals(product, qty, rates24k);

    const nameEl = document.querySelector('#checkout-prod-name');
    const metaEl = document.querySelector('#checkout-prod-meta');
    const qtyEl = document.querySelector('#checkout-prod-qty');
    const goldValEl = document.querySelector('#checkout-gold-val');
    const makingValEl = document.querySelector('#checkout-making-val');
    const gstEl = document.querySelector('#checkout-gst');
    const totalEl = document.querySelector('#checkout-total');
    const imgEl = document.querySelector('#checkout-prod-img');

    if (nameEl) nameEl.textContent = productName;
    if (metaEl && product) metaEl.textContent = `${purity} · ${weight} Gram`;
    if (qtyEl) qtyEl.textContent = `Qty: ${qty}`;
    if (goldValEl) goldValEl.textContent = '₹' + goldVal.toLocaleString('en-IN');
    if (makingValEl) makingValEl.textContent = '₹' + makingVal.toLocaleString('en-IN');
    if (gstEl) gstEl.textContent = '₹' + gstVal.toLocaleString('en-IN');
    if (totalEl) totalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
    if (imgEl && product) imgEl.src = getCacheBustedImageUrl(product);
  })();

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const required = step1.querySelectorAll('[required]');
      let valid = true;
      required.forEach(input => {
        if (!input.value.trim()) {
          input.style.borderColor = '#e74c3c';
          input.focus();
          valid = false;
        } else {
          input.style.borderColor = '';
        }
      });

      if (!valid) {
        showToast("Please fill in all required customer details.", "error");
        return;
      }

      step1.style.display = 'none';
      step2.style.display = 'block';
      stepNums[0]?.classList.remove('active');
      stepNums[0]?.classList.add('done');
      stepNums[1]?.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      step2.style.display = 'none';
      step1.style.display = 'block';
      stepNums[1]?.classList.remove('active');
      stepNums[0]?.classList.remove('done');
      stepNums[0]?.classList.add('active');
    });
  }
})();

/* ══════════════════════════════════════════════════════════
   WHATSAPP ORDER GENERATION
   ══════════════════════════════════════════════════════════ */
(function initWhatsappOrder() {
  const orderBtn = document.querySelector('#place-order-btn');
  if (!orderBtn) return;

  orderBtn.addEventListener('click', async () => {
    const name = document.querySelector('#f-name')?.value.trim() || 'Customer';
    const phone = document.querySelector('#f-phone')?.value.trim() || '';
    const email = document.querySelector('#f-email')?.value.trim() || '';
    const address = document.querySelector('#f-address')?.value.trim() || '';
    const city = document.querySelector('#f-city')?.value.trim() || '';
    const state = document.querySelector('#f-state')?.value.trim() || '';
    const pincode = document.querySelector('#f-pincode')?.value.trim() || '';
    const paymentPref = document.querySelector('#f-payment-preference')?.value || 'UPI';
    const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || 1;
    const productName = sessionStorage.getItem('chinni_selected_product_name') || 'Signature Gold Coin';

    orderBtn.disabled = true;
    orderBtn.innerHTML = `Creating WhatsApp Order...`;

    let orderId = generateOrderId();
    const messageText = `👑 *NEW GOLD ORDER — CHINNI JEWELS*\n\n` +
      `*Order ID:* ${orderId}\n` +
      `*Product:* ${productName}\n` +
      `*Quantity:* ${qty} unit(s)\n` +
      `*Payment:* ${paymentPref}\n\n` +
      `*Customer Details:*\n` +
      `Name: ${name}\n` +
      `Phone: ${phone}\n` +
      `Address: ${address}, ${city}, ${state} - ${pincode}\n\n` +
      `Please confirm my order and share payment instructions. Thank you!`;

    let waUrl = waLink(messageText);

    if (window.ApiClient) {
      try {
        const payload = {
          customer_name: name,
          phone: phone,
          email: email || undefined,
          address: `${address}, ${city}, ${state} - ${pincode}`,
          payment_method: paymentPref,
          items: [{ product_id: productName, quantity: qty }]
        };
        const res = await ApiClient.createOrder(payload);
        if (res.success && res.data) {
          if (res.data.order_number) orderId = res.data.order_number;
          if (res.data.whatsapp_url) waUrl = res.data.whatsapp_url;
        }
      } catch (err) {
        console.warn("[Order] Backend creation fallback to direct link:", err);
      }
    }

    sessionStorage.setItem('chinni_order_id', orderId);
    sessionStorage.setItem('chinni_order_name', name);
    sessionStorage.setItem('chinni_wa_url', waUrl);

    window.open(waUrl, '_blank');
    window.location.href = 'success.html';
  });
})();

/* ══════════════════════════════════════════════════════════
   SUCCESS PAGE CONTROLLER (success.html)
   ══════════════════════════════════════════════════════════ */
(function initSuccessPage() {
  const orderIdEl = document.querySelector('.order-id-value');
  if (!orderIdEl) return;

  const storedId = sessionStorage.getItem('chinni_order_id') || generateOrderId();
  orderIdEl.textContent = storedId;

  const waBtn = document.querySelector('#open-whatsapp-btn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const waUrl = sessionStorage.getItem('chinni_wa_url') || waLink(`NEW ORDER: ${storedId}`);
      window.open(waUrl, '_blank');
    });
  }
})();

function generateOrderId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `G1G-${date}-${rand}`;
}

/* ══════════════════════════════════════════════════════════
   STOCK PAGE CONTROLLER (stock.html)
   ══════════════════════════════════════════════════════════ */
(function initStockPage() {
  const searchInput = document.querySelector('#stock-search');
  const viewGridBtn = document.querySelector('#view-grid-btn');
  const viewTableBtn = document.querySelector('#view-table-btn');
  const gridContainer = document.querySelector('#stock-grid-view');
  const tableContainer = document.querySelector('#stock-table-view');
  const bulkQtyInput = document.querySelector('#bulk-qty');
  const bulkOrderBtn = document.querySelector('#bulk-order-wa-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      document.querySelectorAll('.stock-grid-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
      });

      document.querySelectorAll('.stock-table-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });
  }

  if (viewGridBtn && viewTableBtn && gridContainer && tableContainer) {
    viewGridBtn.addEventListener('click', () => {
      viewGridBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      gridContainer.style.display = 'grid';
      tableContainer.style.display = 'none';
    });

    viewTableBtn.addEventListener('click', () => {
      viewTableBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      gridContainer.style.display = 'none';
      tableContainer.style.display = 'block';
    });
  }

  if (bulkQtyInput) {
    const updateBulkCalc = () => {
      const qty = Math.max(1, parseInt(bulkQtyInput.value) || 1);
      const ratePerGram = 9240;
      const baseMaking = 280;
      const discountRatio = qty >= 10 ? 0.8 : (qty >= 5 ? 0.9 : 1.0);
      const makingPerGram = Math.round(baseMaking * discountRatio);

      const goldTotal = ratePerGram * qty;
      const makingTotal = makingPerGram * qty;
      const gstTotal = Math.round((goldTotal + makingTotal) * 0.03);
      const grandTotal = goldTotal + makingTotal + gstTotal;

      const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = '₹' + val.toLocaleString('en-IN');
      };

      set('#bulk-gold-val', goldTotal);
      set('#bulk-making-val', makingTotal);
      set('#bulk-gst-val', gstTotal);
      set('#bulk-grand-total', grandTotal);

      const noteEl = document.querySelector('#bulk-discount-note');
      if (noteEl) {
        noteEl.textContent = discountRatio < 1.0
          ? `🎉 Bulk discount applied! (${Math.round((1 - discountRatio) * 100)}% off making charges)`
          : `Tip: Order 5+ units to unlock bulk making charge discounts.`;
      }
    };

    bulkQtyInput.addEventListener('input', updateBulkCalc);
    document.querySelectorAll('.bulk-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bulkQtyInput.value = btn.dataset.qty;
        updateBulkCalc();
      });
    });

    updateBulkCalc();
  }

  if (bulkOrderBtn) {
    bulkOrderBtn.addEventListener('click', () => {
      const qty = document.querySelector('#bulk-qty')?.value || 1;
      const total = document.querySelector('#bulk-grand-total')?.textContent || '';
      const msg = `👑 *BULK STOCK INQUIRY — CHINNI JEWELS*\n\n` +
        `Quantity: *${qty} Grams* (24K Pure Gold Coins)\n` +
        `Estimated Total: *${total}*\n\n` +
        `Hello! I would like to place a bulk gold stock order. Please share availability and payment terms.`;
      window.open(waLink(msg), '_blank');
    });
  }
})();

/* ══════════════════════════════════════════════════════════
   DYNAMIC FIRESTORE PRODUCT RENDERERS (SINGLE SOURCE OF TRUTH)
   ══════════════════════════════════════════════════════════ */

/**
 * Format image URL with cache buster query parameter to prevent browser/CDN stale image display
 */
function getCacheBustedImageUrl(product) {
  let url = product.imageUrl || product.image_url || (product.images && product.images[0]) || "assets/hero_gold_coin.png";
  if (!url) return "assets/hero_gold_coin.png";
  if (!url.startsWith('data:') && !url.includes('v=')) {
    const v = product.updatedAt ? new Date(product.updatedAt).getTime() : Date.now();
    url += (url.includes('?') ? '&' : '?') + `v=${v}`;
  }
  return url;
}

/**
 * Calculate estimated retail price based on gold rate & making charges
 */
function calculateProductPrice(product, rate24k = 9240) {
  const weight = Number(product?.weightGrams || product?.weight) || 1.0;
  const making = Number(product?.makingCharge || product?.making_charge) || 280;
  const purityMultiplier = (product?.purity || '').includes('22K') ? (8470 / 9240) : ((product?.purity || '').includes('18K') ? (6930 / 9240) : 1.0);
  const goldVal = rate24k * purityMultiplier * weight;
  const subtotal = goldVal + (making * weight);
  const gst = Math.round(subtotal * 0.03);
  return Math.round(subtotal + gst);
}

/**
 * Compute detailed product price breakdown for given quantity
 */
function computeProductTotals(product, qty = 1, rates24k = 9240) {
  const purity = product?.purity || '24K';
  const weight = Number(product?.weightGrams || product?.weight) || 1.0;
  const makingCharge = Number(product?.makingCharge || product?.making_charge) || 280;
  const gstRate = (Number(product?.gstPercentage || product?.gst_percentage) || 3) / 100;

  let goldRatePerGram = rates24k;
  if (purity.includes('22K')) goldRatePerGram = Math.round(rates24k * (8470 / 9240));
  else if (purity.includes('18K')) goldRatePerGram = Math.round(rates24k * (6930 / 9240));

  const goldVal = Math.round(goldRatePerGram * weight * qty);
  const makingVal = Math.round(makingCharge * weight * qty);
  const subtotal = goldVal + makingVal;
  const gstVal = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + gstVal;

  return { goldVal, makingVal, gstVal, grandTotal, weight, purity };
}

/**
 * 1. Render Homepage Collection Grid (index.html)
 */
window.renderCollectionProductsGrid = function(products) {
  const container = document.querySelector('#collection .product-grid');
  if (!container || !products || !products.length) return;

  container.innerHTML = products.map((p, idx) => {
    const imgUrl = getCacheBustedImageUrl(p);
    const price = calculateProductPrice(p);
    const cat = p.categoryId || (p.categoryName ? p.categoryName.toLowerCase() : 'coins');

    return `
      <div class="product-card reveal visible" data-category="${cat}" data-product-id="${p.id}">
        <div class="product-card-image">
          <img src="${imgUrl}" alt="${p.name} — CHINNI JEWELS" loading="lazy" onerror="this.onerror=null; this.src='assets/hero_gold_coin.png';" />
          ${p.isFeatured ? '<span class="product-card-badge">Bestseller</span>' : ''}
          <button class="wishlist-btn" aria-label="Add to wishlist">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="product-card-info">
          <div class="product-card-meta">
            <span>${p.purity || '24K'}</span>
            <div class="product-card-meta-dot"></div>
            <span>${p.purity ? p.purity : '999 Purity'}</span>
          </div>
          <h3 class="product-card-name">${p.name}</h3>
          <p class="product-card-weight">${p.weightGrams || 1.0} Gram</p>
          <div class="product-card-price">₹${price.toLocaleString('en-IN')}</div>
          <div class="product-card-actions">
            <a href="product.html?id=${p.id}" class="btn btn-primary" onclick="sessionStorage.setItem('chinni_selected_product_id', '${p.id}'); sessionStorage.setItem('chinni_selected_product_name', '${p.name}'); sessionStorage.setItem('chinni_selected_product_image', '${imgUrl}');">View Product</a>
            <a href="#" class="btn btn-outline" data-wa-order="${p.name}">Order</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

/**
 * 2. Render Live Stock Grid and Vault Table (stock.html)
 */
window.renderStockGridAndTable = function(products) {
  const gridContainer = document.querySelector('#stock-grid-view');
  const tableTbody = document.querySelector('#stock-table-tbody');
  if (!products || !products.length) return;

  if (gridContainer) {
    gridContainer.innerHTML = products.map(p => {
      const imgUrl = getCacheBustedImageUrl(p);
      const price = calculateProductPrice(p);
      const stock = p.stockQuantity !== undefined ? p.stockQuantity : 10;
      const cat = p.categoryId || 'coins';

      return `
        <div class="product-card stock-grid-item" data-category="${cat}" data-product-id="${p.id}">
          <div class="product-card-image">
            <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='assets/hero_gold_coin.png';" />
            <span class="badge-instock" style="position:absolute; top:14px; left:14px;">In Stock · ${stock} units</span>
            <button class="wishlist-btn" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          </div>
          <div class="product-card-info">
            <div class="product-card-meta">
              <span>SKU: ${p.sku || 'CN-24K-C01'}</span>
              <div class="product-card-meta-dot"></div>
              <span>${p.purity || '24K / 999'}</span>
            </div>
            <h3 class="product-card-name">${p.name}</h3>
            <p class="product-card-weight">${p.weightGrams || 1.0} Gram · Hallmarked</p>
            <div class="product-card-price">₹${price.toLocaleString('en-IN')}</div>
            <div class="product-card-actions">
              <a href="product.html?id=${p.id}" class="btn btn-primary" onclick="sessionStorage.setItem('chinni_selected_product_id', '${p.id}'); sessionStorage.setItem('chinni_selected_product_name', '${p.name}'); sessionStorage.setItem('chinni_selected_product_image', '${imgUrl}');">View Item</a>
              <a href="#" class="btn btn-outline" data-wa-order="${p.name} (SKU: ${p.sku || 'CN-24K'})">Order</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (tableTbody) {
    tableTbody.innerHTML = products.map(p => {
      const imgUrl = getCacheBustedImageUrl(p);
      const price = calculateProductPrice(p);
      const stock = p.stockQuantity !== undefined ? p.stockQuantity : 10;
      const cat = p.categoryId || 'coins';

      return `
        <tr class="stock-table-row" data-category="${cat}">
          <td>
            <div class="stock-item-cell">
              <img src="${imgUrl}" class="stock-thumb" alt="${p.name}" onerror="this.onerror=null; this.src='assets/hero_gold_coin.png';" />
              <div>
                <div class="stock-item-name">${p.name}</div>
                <div class="stock-item-sku">${p.sku || 'CN-24K-C01'}</div>
              </div>
            </div>
          </td>
          <td><span class="purity-pill">${p.purity || '24K / 999'}</span></td>
          <td>${p.weightGrams || 1.0} g</td>
          <td><span class="stock-status-pill in-stock">● In Stock (${stock})</span></td>
          <td><strong style="color: #fff;">₹${price.toLocaleString('en-IN')}</strong></td>
          <td>
            <a href="#" class="btn btn-primary btn-sm" data-wa-order="${p.name}">Buy Now</a>
          </td>
        </tr>
      `;
    }).join('');
  }
};

/**
 * 3. Render Product Page Main Image & Gallery (product.html)
 */
window.renderProductPageDetails = function(products) {
  const mainImg = document.querySelector('#main-product-img');
  if (!mainImg || !products || !products.length) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get('id');
  const storedId = sessionStorage.getItem('chinni_selected_product_id');
  const targetId = paramId || storedId;

  let activeProduct = products.find(p => p.id === targetId) || products[0];
  if (!activeProduct) return;

  const mainUrl = getCacheBustedImageUrl(activeProduct);
  mainImg.src = mainUrl;
  mainImg.onerror = function() {
    this.onerror = null;
    this.src = 'assets/hero_gold_coin.png';
  };

  const titleEl = document.querySelector('.product-title');
  if (titleEl) titleEl.textContent = activeProduct.name;

  const breadcrumbEl = document.querySelector('.product-breadcrumb span');
  if (breadcrumbEl) breadcrumbEl.textContent = activeProduct.name;

  // Dynamic Price Breakdown
  const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || (document.querySelector('.qty-input') ? (parseInt(document.querySelector('.qty-input').value) || 1) : 1);
  const { goldVal, makingVal, gstVal, grandTotal, weight } = computeProductTotals(activeProduct, qty);

  const goldValEl = document.querySelector('.gold-value-price');
  if (goldValEl) goldValEl.textContent = '₹' + goldVal.toLocaleString('en-IN');

  const makingEl = document.querySelector('.making-charges-price');
  if (makingEl) makingEl.textContent = '₹' + makingVal.toLocaleString('en-IN');

  const gstEl = document.querySelector('.gst-price');
  if (gstEl) gstEl.textContent = '₹' + gstVal.toLocaleString('en-IN');

  const totalEl = document.querySelector('.total-price');
  if (totalEl) totalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');

  const stickyEl = document.querySelector('.sticky-price');
  if (stickyEl) stickyEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');

  // Update Karat Badge
  const badgeEl = document.querySelector('.product-karat-badge');
  if (badgeEl) {
    badgeEl.innerHTML = `
      <span>${activeProduct.purity || '24K Gold'}</span>
      <span style="color: var(--gold-light);">·</span>
      <span>${(activeProduct.purity || '').includes('999') ? '999 Purity' : 'BIS Hallmarked'}</span>
      <span style="color: var(--gold-light);">·</span>
      <span>${weight} Gram</span>
    `;
  }

  // Update WhatsApp Button
  const waBtn = document.querySelector('.product-actions .btn-outline');
  if (waBtn) {
    waBtn.setAttribute('data-wa-order', `${activeProduct.name} (${weight}g, ${activeProduct.purity || '24K'})`);
  }

  // Render Thumbnails
  const thumbsContainer = document.querySelector('.gallery-thumbs');
  if (thumbsContainer) {
    const imagesList = (activeProduct.images && activeProduct.images.length) ? activeProduct.images : [mainUrl];
    thumbsContainer.innerHTML = imagesList.map((img, i) => {
      let cacheBusted = img;
      if (!cacheBusted.includes('v=')) {
        cacheBusted += (cacheBusted.includes('?') ? '&' : '?') + `v=${Date.now()}`;
      }
      return `
        <div class="thumb-item ${i === 0 ? 'active' : ''}">
          <img src="${cacheBusted}" alt="${activeProduct.name} thumbnail ${i + 1}" onerror="this.onerror=null; this.src='assets/hero_gold_coin.png';" />
        </div>
      `;
    }).join('');

    // Re-bind click handlers for thumbs
    thumbsContainer.querySelectorAll('.thumb-item').forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbsContainer.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const src = thumb.querySelector('img').src;
        mainImg.style.opacity = '0';
        setTimeout(() => {
          mainImg.src = src;
          mainImg.style.opacity = '1';
        }, 150);
      });
    });
  }
};

/**
 * 4. Render Checkout Page Summary Image (checkout.html)
 */
window.renderCheckoutSummary = function(products) {
  const checkoutImg = document.querySelector('#checkout-prod-img');
  if (!checkoutImg) return;

  const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || 1;
  const storedId = sessionStorage.getItem('chinni_selected_product_id');
  const storedName = sessionStorage.getItem('chinni_selected_product_name');

  let activeProduct = products?.find(p => p.id === storedId || p.name === storedName) || (products ? products[0] : null);
  
  if (activeProduct) {
    const imgUrl = getCacheBustedImageUrl(activeProduct);
    checkoutImg.src = imgUrl;
    
    const nameEl = document.querySelector('#checkout-prod-name');
    if (nameEl) nameEl.textContent = activeProduct.name;

    const metaEl = document.querySelector('#checkout-prod-meta');
    if (metaEl) metaEl.textContent = `${activeProduct.purity || '24K'} · ${activeProduct.weightGrams || activeProduct.weight || 1.0} Gram`;

    const qtyEl = document.querySelector('#checkout-prod-qty');
    if (qtyEl) qtyEl.textContent = `Qty: ${qty}`;

    const { goldVal, makingVal, gstVal, grandTotal } = computeProductTotals(activeProduct, qty);

    const goldValEl = document.querySelector('#checkout-gold-val');
    const makingValEl = document.querySelector('#checkout-making-val');
    const gstEl = document.querySelector('#checkout-gst');
    const totalEl = document.querySelector('#checkout-total');

    if (goldValEl) goldValEl.textContent = '₹' + goldVal.toLocaleString('en-IN');
    if (makingValEl) makingValEl.textContent = '₹' + makingVal.toLocaleString('en-IN');
    if (gstEl) gstEl.textContent = '₹' + gstVal.toLocaleString('en-IN');
    if (totalEl) totalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
  }
};

// Initial invocation if products were already cached in memory
if (window.allFirestoreProducts && window.allFirestoreProducts.length) {
  window.syncProductsUI?.(window.allFirestoreProducts);
}


