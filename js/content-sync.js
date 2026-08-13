/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Live Website Content Sync & Maintenance Guard
   Dynamically binds Firestore content to customer-facing pages
   ═══════════════════════════════════════════════════════════ */

(function initLiveContentSync() {
  console.log("[ContentSync] Initializing live website content synchronization.");

  // Check database availability
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
    console.log("[ContentSync] Waiting for Firebase initialization...");
    window.addEventListener('load', () => setTimeout(startSyncListeners, 500));
  } else {
    startSyncListeners();
  }

  function startSyncListeners() {
    const db = window.firebaseDb || (firebase.firestore ? firebase.firestore() : null);
    if (!db) return;

    // 1. Maintenance Mode Guard
    db.collection("settings").doc("site").onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        handleMaintenanceMode(data.maintenanceMode);
      }
    }, (err) => console.warn("[ContentSync] Site settings listener notice:", err.message));

    // 2. Live Gold Rates Sync
    db.collection("gold_rates").where("isActive", "==", true).onSnapshot((snap) => {
      const rates = { '24K': 9240, '22K': 8470, '18K': 6930 };
      snap.forEach(doc => {
        const d = doc.data();
        if (d.purity && d.ratePerGram) rates[d.purity] = d.ratePerGram;
      });
      syncGoldRatesUI(rates);
    }, (err) => console.warn("[ContentSync] Gold rates sync notice:", err.message));

    // 3. Homepage & Hero Section Sync
    try {
      const cachedHp = localStorage.getItem("cj_setting_homepage");
      if (cachedHp) {
        const parsed = JSON.parse(cachedHp);
        if (parsed.hero) syncHeroSectionUI(parsed.hero);
      }
    } catch(e) {}

    db.collection("settings").doc("homepage").get().then((doc) => {
      if (doc.exists && doc.data().hero) {
        syncHeroSectionUI(doc.data().hero);
      }
    }).catch(() => {});

    db.collection("settings").doc("homepage").onSnapshot((doc) => {
      if (doc.exists && doc.data().hero) {
        syncHeroSectionUI(doc.data().hero);
      }
    }, (err) => console.warn("[ContentSync] Hero settings sync notice:", err.message));

    // 4. Branding & Contact Details Sync
    db.collection("settings").doc("branding").onSnapshot((doc) => {
      if (doc.exists) {
        syncBrandingUI(doc.data());
      }
    }, (err) => console.warn("[ContentSync] Branding settings sync notice:", err.message));

    // 5. SEO Meta Settings Sync
    db.collection("settings").doc("seo").onSnapshot((doc) => {
      if (doc.exists) {
        syncSEOUI(doc.data());
      }
    }, (err) => console.warn("[ContentSync] SEO sync notice:", err.message));

    // 6. Products Collection Sync
    db.collection("products").where("isActive", "==", true).onSnapshot((snap) => {
      const products = [];
      snap.forEach(d => products.push({ id: d.id, ...d.data() }));
      syncProductsUI(products);
    }, (err) => console.warn("[ContentSync] Products sync notice:", err.message));
  }

  /**
   * Render Luxury Maintenance Overlay if maintenance mode is enabled by Admin
   */
  function handleMaintenanceMode(isMaintenance) {
    let overlay = document.querySelector('#maintenance-mode-overlay');

    if (isMaintenance) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'maintenance-mode-overlay';
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at center, #1a1d26 0%, #0b0c10 100%);
          z-index: 999999; display: flex; align-items: center; justify-content: center;
          padding: 2rem; text-align: center; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
        `;
        overlay.innerHTML = `
          <div style="max-width: 500px; background: rgba(19, 21, 27, 0.95); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 20px; padding: 3rem 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f4d068 0%, #d4af37 50%, #a3821a 100%); border-radius: 16px; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; color: #000; font-size: 2rem; font-weight: 800; box-shadow: 0 4px 25px rgba(212, 175, 55, 0.4);">
              C
            </div>
            <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem; background: linear-gradient(135deg, #f4d068 0%, #d4af37 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">CHINNI JEWELS</h1>
            <h2 style="font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: 1rem;">Under Scheduled Maintenance</h2>
            <p style="color: #9aa1b1; font-size: 0.9rem; line-height: 1.6; margin-bottom: 2rem;">
              We are currently updating our 1 Gram Gold collection and live gold rates. We will be back online shortly. Thank you for your patience.
            </p>
            <div style="font-size: 0.8rem; color: #d4af37; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">
              ✨ Pure Gold. Simply Yours. ✨
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    }
  }

  /**
   * Dynamically Update Gold Rates across customer UI
   */
  function syncGoldRatesUI(rates) {
    const rate24K = rates['24K'] || 9240;
    const rate22K = rates['22K'] || 8470;
    const rate18K = rates['18K'] || 6930;

    // Update rate cards on index.html and stock.html
    const set = (sel, val) => {
      document.querySelectorAll(sel).forEach(el => {
        el.textContent = '₹' + val.toLocaleString('en-IN');
      });
    };

    set('[data-gold-rate-24k]', rate24K);
    set('[data-gold-rate-22k]', rate22K);
    set('[data-gold-rate-18k]', rate18K);
    set('.rate-value-24k', rate24K);
    set('.rate-value-22k', rate22K);

    // Broadcast event for custom pricing scripts
    window.dispatchEvent(new CustomEvent('goldRatesUpdated', { detail: rates }));
  }

  /**
   * Dynamically Update Hero Section Content
   */
  function syncHeroSectionUI(hero) {
    if (!hero) return;

    if (hero.badge) {
      const badgeEl = document.querySelector('.hero-label .t-label');
      if (badgeEl) badgeEl.textContent = hero.badge;
    }

    if (hero.heading) {
      const headingEl = document.querySelector('.hero-heading');
      if (headingEl) {
        headingEl.innerHTML = hero.heading.replace(/\n/g, '<br><em>') + '</em>';
      }
    }

    if (hero.subtitle) {
      const subEl = document.querySelector('.hero-subtitle');
      if (subEl) subEl.textContent = hero.subtitle;
    }

    if (hero.imageUrl) {
      const imgEl = document.querySelector('.hero-image img');
      if (imgEl) imgEl.src = hero.imageUrl;
    }

    if (hero.visible === false) {
      const heroSec = document.querySelector('.hero');
      if (heroSec) heroSec.style.display = 'none';
    } else {
      const heroSec = document.querySelector('.hero');
      if (heroSec) heroSec.style.display = '';
    }
  }

  /**
   * Dynamically Update Branding & Contact Links
   */
  function syncBrandingUI(brand) {
    if (!brand) return;

    if (brand.whatsapp) {
      // Update global WhatsApp button links
      document.querySelectorAll('[data-wa-general]').forEach(btn => {
        const msg = `Hello! I'm interested in your 1 Gram Gold products at CHINNI JEWELS.`;
        btn.href = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(msg)}`;
      });
    }

    if (brand.phone) {
      document.querySelectorAll('[data-brand-phone]').forEach(el => el.textContent = brand.phone);
    }

    if (brand.address) {
      document.querySelectorAll('[data-brand-address]').forEach(el => el.textContent = brand.address);
    }
  }

  /**
   * Dynamically Update SEO Meta Tags
   */
  function syncSEOUI(seo) {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    if (seo.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', seo.description);
    }
  }

  /**
   * Dynamically Render Products Grid
   */
  function syncProductsUI(products) {
    if (!products || !products.length) return;
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: products }));
  }

})();
