/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Main JavaScript
   ═══════════════════════════════════════════════════════════ */

const WA_NUMBER = '916304702907';

/* ── Utility ── */
function waLink(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ══════════════════════════════════════════════════════════
   NAVBAR
   ══════════════════════════════════════════════════════════ */
(function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (!navbar) return;

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  // Mobile menu
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
})();

/* ══════════════════════════════════════════════════════════
   HERO IMAGE REVEAL
   ══════════════════════════════════════════════════════════ */
(function initHeroReveal() {
  const heroImg = document.querySelector('.hero-image');
  if (!heroImg) return;

  setTimeout(() => heroImg.classList.add('revealed'), 200);
})();

/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL (INTERSECTION OBSERVER)
   ══════════════════════════════════════════════════════════ */
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
   COLLECTION FILTER TABS
   ══════════════════════════════════════════════════════════ */
(function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  const cards = document.querySelectorAll('.product-card[data-category]');

  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        if (match) {
          card.style.display = '';
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          });
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   WISHLIST TOGGLE
   ══════════════════════════════════════════════════════════ */
(function initWishlist() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('liked');
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   PRODUCT GALLERY (product.html)
   ══════════════════════════════════════════════════════════ */
(function initProductGallery() {
  const mainImg = document.querySelector('.main-image-wrap img');
  const thumbs = document.querySelectorAll('.thumb-item');

  if (!mainImg || !thumbs.length) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');

      const src = thumb.querySelector('img').src;
      mainImg.style.opacity = '0';
      mainImg.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        mainImg.src = src;
        mainImg.style.opacity = '1';
      }, 250);
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   QUANTITY SELECTOR
   ══════════════════════════════════════════════════════════ */
(function initQtySelector() {
  const minusBtn = document.querySelector('.qty-btn.minus');
  const plusBtn = document.querySelector('.qty-btn.plus');
  const qtyInput = document.querySelector('.qty-input');

  if (!qtyInput) return;

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
    const baseGold = 9240;
    const making = 280;
    const gstRate = 0.03;
    const goldVal = baseGold * qty;
    const makingVal = making * qty;
    const gst = Math.round((goldVal + makingVal) * gstRate);
    const total = goldVal + makingVal + gst;

    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = '₹' + val.toLocaleString('en-IN');
    };

    set('.gold-value-price', goldVal);
    set('.making-charges-price', makingVal);
    set('.gst-price', gst);
    set('.total-price', total);
    set('.sticky-price', total);
  }
})();

/* ══════════════════════════════════════════════════════════
   ACCORDION (product.html)
   ══════════════════════════════════════════════════════════ */
(function initAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));

      // Open clicked (if was closed)
      if (!isOpen) item.classList.add('open');
    });
  });

  // Open first by default
  const first = document.querySelector('.accordion-item');
  if (first) first.classList.add('open');
})();

/* ══════════════════════════════════════════════════════════
   CHECKOUT MULTI-STEP & LIVE BACKEND SUMMARY
   ══════════════════════════════════════════════════════════ */
(function initCheckout() {
  const step1 = document.querySelector('#step-1');
  const step2 = document.querySelector('#step-2');
  const nextBtn = document.querySelector('#next-step-btn');
  const backBtn = document.querySelector('#back-step-btn');
  const stepNums = document.querySelectorAll('.progress-step');

  if (!step1) return;

  // Load checkout summary dynamically
  (async function loadCheckoutSummary() {
    const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || parseInt(sessionStorage.getItem('cninni_selected_qty')) || 1;
    let product = null;

    if (window.ApiClient) {
      const res = await ApiClient.getProducts();
      if (res.success && res.data && res.data.length > 0) {
        product = res.data[0];
      }
    }

    if (product) {
      sessionStorage.setItem('chinni_selected_product_id', product.id);
      const goldVal = product.base_price * qty;
      const makingVal = product.making_charge * qty;
      const gstVal = Math.round((goldVal + makingVal) * (product.gst_percentage / 100));
      const grandTotal = goldVal + makingVal + gstVal;

      const imgEl = document.querySelector('#checkout-prod-img');
      const nameEl = document.querySelector('#checkout-prod-name');
      const metaEl = document.querySelector('#checkout-prod-meta');
      const qtyEl = document.querySelector('#checkout-prod-qty');
      const goldValEl = document.querySelector('#checkout-gold-val');
      const makingValEl = document.querySelector('#checkout-making-val');
      const gstEl = document.querySelector('#checkout-gst');
      const totalEl = document.querySelector('#checkout-total');

      if (imgEl && product.images && product.images.length > 0) imgEl.src = product.images[0].image_url;
      if (nameEl) nameEl.textContent = product.name;
      if (metaEl) metaEl.textContent = `${product.purity} · 999 Purity · ${product.weight_grams} Gram`;
      if (qtyEl) qtyEl.textContent = `Qty: ${qty}`;
      if (goldValEl) goldValEl.textContent = '₹' + goldVal.toLocaleString('en-IN');
      if (makingValEl) makingValEl.textContent = '₹' + makingVal.toLocaleString('en-IN');
      if (gstEl) gstEl.textContent = '₹' + gstVal.toLocaleString('en-IN');
      if (totalEl) totalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
    }
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

      if (!valid) return;

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
   WHATSAPP ORDER GENERATOR (Backend Order Creation)
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
    const qty = parseInt(sessionStorage.getItem('chinni_selected_qty')) || parseInt(sessionStorage.getItem('cninni_selected_qty')) || 1;

    // Disable button & show loading status
    orderBtn.disabled = true;
    orderBtn.innerHTML = `Creating WhatsApp Order...`;

    let productId = sessionStorage.getItem('chinni_selected_product_id') || sessionStorage.getItem('cninni_selected_product_id');
    if (!productId && window.ApiClient) {
      const prodRes = await ApiClient.getProducts();
      if (prodRes.success && prodRes.data && prodRes.data.length > 0) {
        productId = prodRes.data[0].id;
      }
    }

    const payload = {
      customer_name: name,
      phone: phone,
      email: email || undefined,
      address: address,
      city: city,
      state: state,
      pincode: pincode,
      payment_method: paymentPref,
      payment_preference: paymentPref,
      items: [
        {
          product_id: productId || "seed-product-1",
          quantity: qty
        }
      ]
    };

    let orderId = generateOrderId();
    let waUrl = waLink(`NEW GOLD ORDER: ${orderId}`);

    if (window.ApiClient) {
      const res = await ApiClient.createOrder(payload);
      if (res.success && res.data) {
        orderId = res.data.order_number;
        waUrl = res.data.whatsapp_url;
        if (res.data.whatsapp_message) {
          sessionStorage.setItem('chinni_wa_msg', res.data.whatsapp_message);
        }
      }
    }

    sessionStorage.setItem('chinni_order_id', orderId);
    sessionStorage.setItem('chinni_order_name', name);
    sessionStorage.setItem('chinni_wa_url', waUrl);

    // Open WhatsApp deep link
    window.open(waUrl, '_blank');

    // Redirect to Success confirmation page
    window.location.href = 'success.html';
  });
})();

/* ══════════════════════════════════════════════════════════
   SUCCESS PAGE
   ══════════════════════════════════════════════════════════ */
(function initSuccessPage() {
  const orderIdEl = document.querySelector('.order-id-value');
  if (!orderIdEl) return;

  const storedId = sessionStorage.getItem('chinni_order_id') || sessionStorage.getItem('cninni_order_id') || generateOrderId();
  orderIdEl.textContent = storedId;

  const waBtn = document.querySelector('#open-whatsapp-btn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const waUrl = sessionStorage.getItem('chinni_wa_url') || sessionStorage.getItem('cninni_wa_url') || waLink(`NEW ORDER: ${storedId}`);
      window.open(waUrl, '_blank');
    });
  }
})();

/* ── Generate Order ID ── */
function generateOrderId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `G1G-${date}-${rand}`;
}

/* ══════════════════════════════════════════════════════════
   GLOBAL WHATSAPP CTA BUTTONS
   ══════════════════════════════════════════════════════════ */
(function initGlobalWAButtons() {
  document.querySelectorAll('[data-wa-order]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productSlug = btn.dataset.waOrder || 'Signature Gold Coin';
      sessionStorage.setItem('chinni_selected_product_slug', productSlug);
      window.location.href = 'checkout.html';
    });
  });

  document.querySelectorAll('[data-wa-general]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = `Hello! I'm interested in your 1 Gram Gold products at CHINNI JEWELS. Please help me.`;
      window.open(waLink(msg), '_blank');
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   STOCK PAGE INTERACTIVITY (stock.html)
   ══════════════════════════════════════════════════════════ */
(function initStockPage() {
  const searchInput = document.querySelector('#stock-search');
  const viewGridBtn = document.querySelector('#view-grid-btn');
  const viewTableBtn = document.querySelector('#view-table-btn');
  const gridContainer = document.querySelector('#stock-grid-view');
  const tableContainer = document.querySelector('#stock-table-view');
  const bulkQtyInput = document.querySelector('#bulk-qty');
  const bulkOrderBtn = document.querySelector('#bulk-order-wa-btn');

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      // Filter Grid Items
      document.querySelectorAll('.stock-grid-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });

      // Filter Table Rows
      document.querySelectorAll('.stock-table-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // View Switcher (Grid vs Table)
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

  // Bulk Calculator
  if (bulkQtyInput) {
    const updateBulkCalc = () => {
      const qty = Math.max(1, parseInt(bulkQtyInput.value) || 1);
      const ratePerGram = 9240;
      const baseMaking = 280;
      // Discount making charges for bulk (e.g. 20% off making charges for 10+ grams)
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

      const isDiscounted = discountRatio < 1.0;
      const noteEl = document.querySelector('#bulk-discount-note');
      if (noteEl) {
        noteEl.textContent = isDiscounted 
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

  // Bulk WhatsApp Order Button
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

