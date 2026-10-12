/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAMGOLD — Live Website Content Sync & Maintenance Guard
   Dynamically binds Firestore content to customer-facing pages
   ═══════════════════════════════════════════════════════════ */

(function initLiveContentSync() {
  console.log("[ContentSync] Initializing live website content synchronization.");

  startSyncListeners();

  function startSyncListeners() {
    // 0. Local Storage Hero & Store Settings Sync
    try {
      const localHero = localStorage.getItem('chinni_hero_settings');
      if (localHero) {
        const parsed = JSON.parse(localHero);
        let updated = false;
        if (!parsed.mediaUrl || parsed.mediaUrl.includes('hero_gold_coin.png')) {
          parsed.mediaUrl = 'assets/showcase.mp4';
          updated = true;
        }
        if (parsed.heading && parsed.heading.includes('Pure Gold.')) {
          parsed.heading = parsed.heading.replace(/Pure Gold\./g, 'One Gram Gold.');
          updated = true;
        }
        if (updated) {
          localStorage.setItem('chinni_hero_settings', JSON.stringify(parsed));
        }
        syncHeroSectionUI(parsed);
      } else {
        syncHeroSectionUI({ heading: 'One Gram Gold.\nSimply Yours.', mediaUrl: 'assets/showcase.mp4' });
      }
    } catch(e) {}

    // 0.1 Local Storage Products Sync (Instant Local Updates)
    try {
      const localProds = localStorage.getItem('chinni_products');
      if (localProds) {
        const parsed = JSON.parse(localProds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          syncProductsUI(parsed);
        }
      }
    } catch(e) {}

    // 0.2 Cross-tab real-time storage listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'chinni_hero_settings' && e.newValue) {
        try { syncHeroSectionUI(JSON.parse(e.newValue)); } catch(err) {}
      }
      if (e.key === 'chinni_products' && e.newValue) {
        try { syncProductsUI(JSON.parse(e.newValue)); } catch(err) {}
      }
    });

    // 1. Live Gold Rates Sync
    if (window.ApiClient) {
      window.ApiClient.getGoldRates().then(res => {
        if (res.success && res.data) syncGoldRatesUI(res.data);
      }).catch(() => {});
    }

    // 2. Live Homepage & Section Images Sync from Supabase Database (Single Source of Truth)
    if (window.SupabaseService && window.SupabaseService.getWebsiteSettings) {
      window.SupabaseService.getWebsiteSettings().then(res => {
        if (res.success && res.data && res.data.homepage) {
          syncHomepageUI(res.data.homepage);
        }
      }).catch(() => {});
    }

    // 2.1 Contact Settings & Instagram Page Sync
    if (window.SupabaseService && window.SupabaseService.getContactSettings) {
      window.SupabaseService.getContactSettings().then(res => {
        if (res.success && res.data) {
          syncBrandingUI(res.data);
        }
      }).catch(() => {});
    }

    // 3. Supabase Realtime Listener for Section Images (Instant Cross-Device Sync)
    if (window.SupabaseService && window.SupabaseService.subscribeToSettings) {
      window.SupabaseService.subscribeToSettings((newSettings) => {
        if (newSettings && newSettings.homepage) {
          console.log("[ContentSync] Realtime section settings updated across devices:", newSettings.homepage);
          syncHomepageUI(newSettings.homepage);
        }
      });
    }

    window.addEventListener('cj_setting_updated', (e) => {
      if (e.detail && e.detail.settingId === 'homepage' && e.detail.data) {
        syncHomepageUI(e.detail.data);
      }
    });

    // 4. Products Collection Sync — SUPABASE IS SINGLE AUTHORITATIVE SOURCE OF TRUTH
    function fetchAndSyncProducts() {
      const fetcher = (window.SupabaseService && window.SupabaseService.getProducts)
        ? window.SupabaseService.getProducts()
        : (window.ApiClient ? window.ApiClient.getProducts() : null);

      if (fetcher) {
        fetcher.then(res => {
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            console.log("[ContentSync] Authoritative products retrieved from Supabase:", res.data.length);
            // SUPABASE IS AUTHORITATIVE: Use remote Supabase products directly!
            // Do NOT let local storage override newer Supabase records!
            try {
              localStorage.setItem('chinni_products', JSON.stringify(res.data));
            } catch(sErr) {}
            syncProductsUI(res.data);
          }
        }).catch(err => {
          console.error("[ContentSync] Error fetching products from Supabase:", err);
        });
      }
    }

    fetchAndSyncProducts();

    // 5. Supabase Realtime Subscription for Live Cross-Device Product Image Sync
    if (window.SupabaseService && window.SupabaseService.subscribeToProducts) {
      window.SupabaseService.subscribeToProducts((updatedProducts) => {
        console.log("[ContentSync] Realtime cross-device product image sync received!", updatedProducts);
        if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
          try {
            localStorage.setItem('chinni_products', JSON.stringify(updatedProducts));
          } catch(e) {}
          syncProductsUI(updatedProducts);
        }
      });
    }

    window.addEventListener('cj_products_changed', (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        syncProductsUI(e.detail);
      }
    });
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
            <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem; background: linear-gradient(135deg, #f4d068 0%, #d4af37 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">CHINNI ONE GRAMGOLD</h1>
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
        const text = String(hero.heading).replace(/Pure Gold\./g, 'One Gram Gold.');
        if (text.includes('\n')) {
          const parts = text.split('\n');
          headingEl.innerHTML = parts[0] + '<br><em>' + parts.slice(1).join(' ') + '</em>';
        } else {
          headingEl.innerHTML = text;
        }
      }
    }

    if (hero.subtitle) {
      const subEl = document.querySelector('.hero-subtitle');
      if (subEl) subEl.textContent = hero.subtitle;
    }

    if (hero.btnPrimary) {
      const btnPrimaryEl = document.querySelector('.hero-actions .btn-primary');
      if (btnPrimaryEl) {
        const svg = btnPrimaryEl.querySelector('svg');
        btnPrimaryEl.textContent = hero.btnPrimary;
        if (svg) btnPrimaryEl.prepend(svg);
      }
    }

    if (hero.btnSecondary) {
      const btnSecondaryEl = document.querySelector('.hero-actions .btn-outline');
      if (btnSecondaryEl) {
        const svg = btnSecondaryEl.querySelector('svg');
        btnSecondaryEl.textContent = hero.btnSecondary;
        if (svg) btnSecondaryEl.prepend(svg);
      }
    }

    let mediaUrl = (hero && (hero.mediaUrl || hero.imageUrl)) || 'assets/showcase.mp4';
    if (!mediaUrl || mediaUrl.includes('hero_gold_coin.png') || (!mediaUrl.endsWith('.mp4') && !mediaUrl.endsWith('.webm'))) {
      mediaUrl = 'assets/showcase.mp4';
    }

    if (mediaUrl) {
      const videoEl = document.querySelector('#hero-video');
      const imgEl = document.querySelector('#hero-fallback-img') || document.querySelector('.hero-image img');
      const isVideo = typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('showcase.mp4'));

      if (isVideo || !imgEl) {
        if (videoEl) {
          videoEl.style.display = 'block';
          videoEl.classList.remove('hidden');
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute('muted', '');
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('webkit-playsinline', '');
          if (!videoEl.src || (!videoEl.src.includes('showcase.mp4') && videoEl.src !== mediaUrl)) {
            videoEl.src = mediaUrl;
            videoEl.load();
          }
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(function() {
              videoEl.muted = true;
              videoEl.play().catch(function() {});
            });
          }
        }
        if (imgEl) {
          imgEl.style.display = 'none';
          imgEl.classList.add('hidden');
        }
      } else {
        if (videoEl) {
          videoEl.style.display = 'none';
          videoEl.classList.add('hidden');
          videoEl.pause();
        }
        if (imgEl) {
          imgEl.style.display = 'block';
          imgEl.classList.remove('hidden');
          imgEl.onerror = function() {
            this.onerror = null;
            this.src = 'assets/hero_gold_coin.png';
          };
          let finalUrl = mediaUrl;
          if (finalUrl && !finalUrl.startsWith('data:') && !finalUrl.includes('v=')) {
            const v = hero.updatedAt ? (hero.updatedAt.seconds || hero.updatedAt || Date.now()) : Date.now();
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + `v=${v}`;
          }
          imgEl.src = finalUrl;
        }
      }
    }

    if (hero.visible === false) {
      const heroSec = document.querySelector('.hero');
      if (heroSec) heroSec.style.display = 'none';
    } else {
      const heroSec = document.querySelector('.hero');
      if (heroSec) heroSec.style.display = '';
    }
  }

  function syncHomepageUI(data) {
    if (!data) return;
    if (data.hero) syncHeroSectionUI(data.hero);
    if (data.featured) syncFeaturedSectionUI(data.featured);
    if (data.story) syncStorySectionUI(data.story);
  }

  function syncFeaturedSectionUI(featured) {
    if (!featured) return;
    if (featured.eyebrow) {
      const el = document.querySelector('.featured-eyebrow');
      if (el) el.textContent = featured.eyebrow;
    }
    if (featured.title) {
      const el = document.querySelector('.featured-title');
      if (el) el.textContent = featured.title;
    }
    if (featured.desc) {
      const el = document.querySelector('.featured-desc');
      if (el) el.textContent = featured.desc;
    }
    if (featured.imageUrl) {
      const imgEl = document.querySelector('.featured-image img');
      if (imgEl) {
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = 'assets/featured_product.png';
        };
        let finalUrl = window.ApiClient ? window.ApiClient.resolveImageUrl(featured.imageUrl) : featured.imageUrl;
        if (finalUrl && !finalUrl.startsWith('data:') && !finalUrl.includes('v=')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + `v=${Date.now()}`;
        }
        imgEl.src = finalUrl;
      }
    }
  }

  function syncStorySectionUI(story) {
    if (!story) return;
    if (story.title) {
      const el = document.querySelector('.brand-story-title');
      if (el) el.textContent = story.title;
    }
    if (story.text) {
      const el = document.querySelector('.brand-story-text');
      if (el) el.textContent = story.text;
    }
    if (story.imageUrl) {
      const imgEl = document.querySelector('.brand-story-image img');
      if (imgEl) {
        let finalUrl = window.ApiClient ? window.ApiClient.resolveImageUrl(story.imageUrl) : story.imageUrl;
        if (finalUrl.includes('brand_story_lifestyle.png')) {
          finalUrl = 'assets/brand_story_banner.jpg';
        }
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = 'assets/brand_story_banner.jpg';
        };
        if (finalUrl && !finalUrl.startsWith('data:') && !finalUrl.includes('v=')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + `v=${Date.now()}`;
        }
        imgEl.src = finalUrl;
      }
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
        const msg = `Hello! I'm interested in your 1 Gram Gold products at CHINNI ONE GRAMGOLD.`;
        btn.href = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(msg)}`;
      });
    }

    if (brand.phone) {
      document.querySelectorAll('[data-brand-phone]').forEach(el => el.textContent = brand.phone);
    }

    if (brand.address) {
      document.querySelectorAll('[data-brand-address]').forEach(el => el.textContent = brand.address);
    }

    if (brand.instagram) {
      document.querySelectorAll('a[aria-label="Instagram"], [data-brand-instagram]').forEach(el => {
        el.href = brand.instagram;
      });
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
   * Dynamically Render Products Grid across index.html, stock.html, product.html, checkout.html
   */
  function syncProductsUI(products) {
    if (!products || !products.length) return;
    window.allFirestoreProducts = products;
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: products }));
    if (typeof window.renderCollectionProductsGrid === 'function') {
      window.renderCollectionProductsGrid(products);
    }
    if (typeof window.renderStockGridAndTable === 'function') {
      window.renderStockGridAndTable(products);
    }
    if (typeof window.renderProductPageDetails === 'function') {
      window.renderProductPageDetails(products);
    }
    if (typeof window.renderCheckoutSummary === 'function') {
      window.renderCheckoutSummary(products);
    }
  }

})();

