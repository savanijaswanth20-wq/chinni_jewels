/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAM GOLD — 3D Mouse-Tracked Tilt Engine
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Config ── */
  const TILT_MAX    = 12;   // max degrees tilt
  const SCALE_HOVER = 1.03; // slight zoom on hover
  const EASE        = 0.12; // lerp factor (lower = smoother/slower)

  /* ── State per card ── */
  const cards = new WeakMap();

  function lerp(a, b, t) { return a + (b - a) * t; }

  function initCard(el) {
    const state = { rx: 0, ry: 0, tx: 0, ty: 0, raf: null, hovering: false };
    cards.set(el, state);

    el.addEventListener('mouseenter', () => {
      state.hovering = true;
      el.style.transition = 'box-shadow 0.35s ease, border-color 0.35s ease';
      startLoop(el);
    });

    el.addEventListener('mousemove', (e) => {
      const rect  = el.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = e.clientX - cx;
      const dy    = e.clientY - cy;
      state.tx    =  (dx / (rect.width  / 2)) * TILT_MAX;
      state.ty    = -(dy / (rect.height / 2)) * TILT_MAX;
    });

    el.addEventListener('mouseleave', () => {
      state.hovering = false;
      state.tx = 0;
      state.ty = 0;
    });
  }

  function startLoop(el) {
    const state = cards.get(el);
    if (!state || state.raf) return;

    function tick() {
      state.rx = lerp(state.rx, state.ty, EASE);
      state.ry = lerp(state.ry, state.tx, EASE);

      const scale    = state.hovering ? SCALE_HOVER : 1.0;
      const currScale = lerp(
        parseFloat(el.dataset.scale || '1') || 1,
        scale,
        EASE
      );
      el.dataset.scale = currScale;

      el.style.transform =
        `perspective(900px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) scale3d(${currScale},${currScale},${currScale})`;

      const isSettled = Math.abs(state.rx) < 0.05 &&
                        Math.abs(state.ry) < 0.05 &&
                        Math.abs(currScale - 1) < 0.001 &&
                        !state.hovering;

      if (isSettled) {
        cancelAnimationFrame(state.raf);
        state.raf = null;
        state.rx  = 0;
        state.ry  = 0;
        el.dataset.scale = '1';
        el.style.transform = '';
      } else {
        state.raf = requestAnimationFrame(tick);
      }
    }

    state.raf = requestAnimationFrame(tick);
  }

  /* ── Parallax hero on mouse move ── */
  function initHeroParallax() {
    const heroImg = document.querySelector('.hero-image');
    if (!heroImg) return;

    let tx = 0, ty = 0, raf = null;

    document.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      tx = ((e.clientX - cx) / cx) * 6;
      ty = ((e.clientY - cy) / cy) * 4;
    });

    let rx = 0, ry = 0;
    function tick() {
      rx = lerp(rx, ty, 0.05);
      ry = lerp(ry, tx, 0.05);
      heroImg.style.animationPlayState = 'paused';
      heroImg.style.transform =
        `perspective(1000px) rotateX(${2 + rx * 0.5}deg) rotateY(${-3 + ry}deg) translateY(${-rx * 0.5}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // resume float anim when mouse leaves window
    document.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      heroImg.style.transform = '';
      heroImg.style.animationPlayState = 'running';
    });
  }

  /* ── Magnetic button effect ── */
  function initMagneticBtns() {
    document.querySelectorAll('.btn-primary, .btn-gold').forEach(btn => {
      let tx = 0, ty = 0, raf = null;

      btn.addEventListener('mousemove', (e) => {
        const r  = btn.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        tx = (e.clientX - cx) * 0.22;
        ty = (e.clientY - cy) * 0.22;
      });

      btn.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

      let cx = 0, cy = 0;
      function tick() {
        cx = lerp(cx, tx, 0.18);
        cy = lerp(cy, ty, 0.18);
        // Merge with existing transform from CSS (translateY from 3d-effects.css)
        btn.style.setProperty('--mag-x', `${cx}px`);
        btn.style.setProperty('--mag-y', `${cy}px`);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    });
  }

  /* ── Boot ── */
  function boot() {
    // Tilt cards
    document.querySelectorAll('.product-card, .why-card').forEach(initCard);

    // Hero parallax
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      initHeroParallax();
    }

    // Observe dynamically added product cards (e.g., after admin edits)
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.classList?.contains('product-card')) initCard(node);
            node.querySelectorAll?.('.product-card').forEach(initCard);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

