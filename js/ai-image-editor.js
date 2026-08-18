/* ═══════════════════════════════════════════════════════════
   CHINNI ONE GRAM GOLD — AI Image Editor & Jewelry Studio Enhancer
   Interactive Client-Side AI Image Processing & Filters
   ═══════════════════════════════════════════════════════════ */

class AIImageEditor {
  constructor() {
    this.activeSourceFile = null;
    this.originalImage = null;
    this.targetPreviewElement = null;
    this.onApplyCallback = null;
    this.isInitialized = false;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.isInitialized) return;
    this.createEditorModalHTML();
    this.bindEvents();
    this.isInitialized = true;
  }

  createEditorModalHTML() {
    if (document.querySelector('#ai-image-editor-modal')) return;
    if (!document.body) return;

    const modal = document.createElement('div');
    modal.id = 'ai-image-editor-modal';
    modal.className = 'admin-modal-backdrop';
    modal.style.cssText = 'z-index: 100000;';

    modal.innerHTML = `
      <div class="admin-modal-content" style="max-width: 840px; width: 95%;">
        <div class="modal-header" style="background: linear-gradient(135deg, #1f2330 0%, #13151b 100%); border-bottom: 1px solid rgba(212, 175, 55, 0.3);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #f4d068 0%, #d4af37 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #000; font-weight: 800;">✨</div>
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">AI Jewelry Image Studio & Enhancer</h3>
              <p style="margin: 0; font-size: 0.75rem; color: var(--gold);">Enhance gold luster, adjust studio lighting & crop for web</p>
            </div>
          </div>
          <button class="modal-close-btn" id="ai-modal-close-btn">✕</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem; background: #0e1015;">
          <div style="display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem;" class="ai-editor-grid">
            
            <!-- Canvas Preview Container -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #13151b; border: 1px dashed rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 1rem; min-height: 360px; position: relative;">
              <canvas id="ai-editor-canvas" style="max-width: 100%; max-height: 380px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); object-fit: contain;"></canvas>
              <div id="ai-loading-overlay" style="display: none; position: absolute; inset: 0; background: rgba(19, 21, 27, 0.85); border-radius: 12px; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #d4af37; border-radius: 50%; animation: aiSpin 0.8s linear infinite;"></div>
                <span style="color: #fff; font-size: 0.85rem; font-weight: 600;">Applying AI Enhancement...</span>
              </div>
            </div>

            <!-- AI Controls Panel -->
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              
              <!-- One-Click Preset Buttons -->
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--gold); letter-spacing: 0.5px; display: block; margin-bottom: 8px;">AI Presets</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <button type="button" class="btn btn-secondary btn-sm" id="preset-gold-sparkle" style="background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); color: #f4d068; font-weight: 600;">✨ 24K Gold Luster</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="preset-studio-light" style="background: #1a1d26; color: #fff;">💡 Studio Lighting</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="preset-sharp-details" style="background: #1a1d26; color: #fff;">🔍 Ultra Sharp</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="preset-reset" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">↺ Reset Original</button>
                </div>
              </div>

              <!-- Manual Adjustment Sliders -->
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--gold); letter-spacing: 0.5px;">Fine Adjustments</label>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #ccc; margin-bottom: 3px;">
                    <span>Gold Warmth / Luster</span>
                    <span id="val-warmth">0%</span>
                  </div>
                  <input type="range" id="slider-warmth" min="-50" max="50" value="0" style="width: 100%; accent-color: #d4af37;" />
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #ccc; margin-bottom: 3px;">
                    <span>Brightness</span>
                    <span id="val-brightness">100%</span>
                  </div>
                  <input type="range" id="slider-brightness" min="50" max="150" value="100" style="width: 100%; accent-color: #d4af37;" />
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #ccc; margin-bottom: 3px;">
                    <span>Contrast</span>
                    <span id="val-contrast">100%</span>
                  </div>
                  <input type="range" id="slider-contrast" min="50" max="160" value="100" style="width: 100%; accent-color: #d4af37;" />
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #ccc; margin-bottom: 3px;">
                    <span>Saturation</span>
                    <span id="val-saturation">100%</span>
                  </div>
                  <input type="range" id="slider-saturation" min="50" max="160" value="100" style="width: 100%; accent-color: #d4af37;" />
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="modal-footer" style="background: #13151b; border-top: 1px solid rgba(212, 175, 55, 0.2); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Converts output to high-quality WebP format for fast loading</div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-secondary" id="ai-modal-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-primary" id="ai-modal-apply-btn" style="background: linear-gradient(135deg, #f4d068 0%, #d4af37 100%); color: #000; font-weight: 700;">Apply & Save AI Image</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add CSS Animation Keyframe for spinner
    if (!document.querySelector('#ai-editor-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-editor-styles';
      style.textContent = `
        @keyframes aiSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `;
      document.head.appendChild(style);
    }
  }

  bindEvents() {
    const closeBtn = document.querySelector('#ai-modal-close-btn');
    const cancelBtn = document.querySelector('#ai-modal-cancel-btn');
    const applyBtn = document.querySelector('#ai-modal-apply-btn');

    if (closeBtn) closeBtn.onclick = () => this.close();
    if (cancelBtn) cancelBtn.onclick = () => this.close();
    if (applyBtn) applyBtn.onclick = () => this.applyAndSave();

    // Preset Buttons
    document.querySelector('#preset-gold-sparkle')?.addEventListener('click', () => {
      this.animateProcessing(() => {
        this.setSliders({ warmth: 28, brightness: 108, contrast: 118, saturation: 125 });
      });
    });

    document.querySelector('#preset-studio-light')?.addEventListener('click', () => {
      this.animateProcessing(() => {
        this.setSliders({ warmth: 10, brightness: 118, contrast: 108, saturation: 105 });
      });
    });

    document.querySelector('#preset-sharp-details')?.addEventListener('click', () => {
      this.animateProcessing(() => {
        this.setSliders({ warmth: 5, brightness: 102, contrast: 130, saturation: 110 });
      });
    });

    document.querySelector('#preset-reset')?.addEventListener('click', () => {
      this.setSliders({ warmth: 0, brightness: 100, contrast: 100, saturation: 100 });
    });

    // Slider Listeners
    ['warmth', 'brightness', 'contrast', 'saturation'].forEach(param => {
      const slider = document.querySelector(`#slider-${param}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const valSpan = document.querySelector(`#val-${param}`);
          if (valSpan) {
            valSpan.textContent = param === 'warmth' ? (e.target.value > 0 ? `+${e.target.value}%` : `${e.target.value}%`) : `${e.target.value}%`;
          }
          this.renderCanvas();
        });
      }
    });
  }

  animateProcessing(callback) {
    const overlay = document.querySelector('#ai-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    setTimeout(() => {
      if (typeof callback === 'function') callback();
      if (overlay) overlay.style.display = 'none';
    }, 250);
  }

  setSliders({ warmth, brightness, contrast, saturation }) {
    if (warmth !== undefined) {
      const s = document.querySelector('#slider-warmth');
      if (s) s.value = warmth;
      const v = document.querySelector('#val-warmth');
      if (v) v.textContent = warmth > 0 ? `+${warmth}%` : `${warmth}%`;
    }
    if (brightness !== undefined) {
      const s = document.querySelector('#slider-brightness');
      if (s) s.value = brightness;
      const v = document.querySelector('#val-brightness');
      if (v) v.textContent = `${brightness}%`;
    }
    if (contrast !== undefined) {
      const s = document.querySelector('#slider-contrast');
      if (s) s.value = contrast;
      const v = document.querySelector('#val-contrast');
      if (v) v.textContent = `${contrast}%`;
    }
    if (saturation !== undefined) {
      const s = document.querySelector('#slider-saturation');
      if (s) s.value = saturation;
      const v = document.querySelector('#val-saturation');
      if (v) v.textContent = `${saturation}%`;
    }
    this.renderCanvas();
  }

  openWithImage(fileOrSrc, targetPreviewElement = null, callback = null) {
    this.init();
    this.targetPreviewElement = targetPreviewElement;
    this.onApplyCallback = callback;

    const modal = document.querySelector('#ai-image-editor-modal');
    if (!modal) return;

    modal.classList.add('active');

    if (fileOrSrc instanceof File || fileOrSrc instanceof Blob) {
      this.activeSourceFile = fileOrSrc;
      const reader = new FileReader();
      reader.onload = (e) => this.loadImageToCanvas(e.target.result);
      reader.readAsDataURL(fileOrSrc);
    } else if (typeof fileOrSrc === 'string') {
      this.loadImageToCanvas(fileOrSrc);
    }
  }

  loadImageToCanvas(srcUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.originalImage = img;
      this.setSliders({ warmth: 20, brightness: 106, contrast: 114, saturation: 110 });
    };
    img.src = srcUrl;
  }

  renderCanvas() {
    if (!this.originalImage) return;

    const canvas = document.querySelector('#ai-editor-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = this.originalImage.width;
    canvas.height = this.originalImage.height;

    const warmth = Number(document.querySelector('#slider-warmth')?.value || 0);
    const brightness = Number(document.querySelector('#slider-brightness')?.value || 100);
    const contrast = Number(document.querySelector('#slider-contrast')?.value || 100);
    const saturation = Number(document.querySelector('#slider-saturation')?.value || 100);

    // Apply Canvas Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);

    // Gold Warmth Filter Tint Overlay
    if (warmth !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = warmth > 0 ? 'overlay' : 'color';
      ctx.fillStyle = warmth > 0 ? `rgba(212, 175, 55, ${Math.abs(warmth) * 0.005})` : `rgba(100, 150, 200, ${Math.abs(warmth) * 0.005})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  applyAndSave() {
    const canvas = document.querySelector('#ai-editor-canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const fileName = `ai_enhanced_${Date.now()}.webp`;
      const enhancedFile = new File([blob], fileName, { type: 'image/webp' });
      const dataUrl = canvas.toDataURL('image/webp', 0.92);

      if (this.targetPreviewElement) {
        if (this.targetPreviewElement.tagName === 'IMG') {
          this.targetPreviewElement.src = dataUrl;
        }
      }

      if (typeof this.onApplyCallback === 'function') {
        this.onApplyCallback(enhancedFile, dataUrl);
      }

      if (window.app) {
        window.app.showToast("✨ AI Enhancement applied successfully!");
      }

      this.close();
    }, 'image/webp', 0.92);
  }

  close() {
    const modal = document.querySelector('#ai-image-editor-modal');
    if (modal) modal.classList.remove('active');
  }
}

window.AIEditor = new AIImageEditor();

