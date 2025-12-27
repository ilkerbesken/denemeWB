class CanvasSettings {
    constructor() {
        this.settings = {
            size: 'full',
            orientation: 'landscape',
            backgroundColor: 'white',
            pattern: 'none',
            patternColor: 'rgba(0,0,0,0.15)', // Default
            patternSpacing: 20, // Default px
            patternThickness: 1 // Default px
        };

        // Gerçek boyutlar - 1 mm = 3.7795 piksel (96 DPI)
        this.sizes = {
            a6: { width: 397, height: 559 },      // 105 × 148 mm
            a5: { width: 559, height: 794 },      // 148 × 210 mm
            a4: { width: 794, height: 1123 },     // 210 × 297 mm
            a3: { width: 1123, height: 1587 },    // 297 × 420 mm
            letter: { width: 816, height: 1056 }, // 8.5 × 11 inch
            full: { width: 0, height: 0 }         // Tam ekran
        };

        this.colors = {
            white: '#ffffff',
            cream: '#fffef0',
            yellow: '#fffde7',
            red: '#ffebee',
            blue: '#e3f2fd',
            green: '#e8f5e9'
        };

        this.isPanelOpen = false;
    }

    togglePanel() {
        const panel = document.getElementById('canvasSettingsPanel');
        this.isPanelOpen = !this.isPanelOpen;
        panel.classList.toggle('show', this.isPanelOpen);
    }

    loadSettingsToPanel() {
        // Boyut seç
        document.getElementById('canvasSizeSelect').value = this.settings.size;

        // Oryantasyon seç
        document.querySelector(`input[name="orientation"][value="${this.settings.orientation}"]`).checked = true;

        // Renk seç
        document.querySelectorAll('.color-option-small[data-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === this.settings.backgroundColor);
        });
        const customBgBtn = document.getElementById('btnCustomBackground');
        if (customBgBtn && !this.colors[this.settings.backgroundColor]) {
            // Custom color logic for background
            // If the current BG is not in presets, activate custom btn
            let isPreset = false;
            document.querySelectorAll('.color-option-small[data-color]').forEach(b => {
                if (b.dataset.color === this.settings.backgroundColor) isPreset = true;
            });

            if (!isPreset && this.settings.backgroundColor !== 'white') { // Default white is preset
                // Set custom button color
                customBgBtn.style.backgroundColor = this.settings.backgroundColor;
                customBgBtn.dataset.color = this.settings.backgroundColor;
                customBgBtn.classList.add('active');
                customBgBtn.innerHTML = '';
            }
        }

        // Desen seç
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.pattern === this.settings.pattern);
        });

        // Desen Rengi Seç
        document.querySelectorAll('.color-option-small[data-pattern-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.patternColor === this.settings.patternColor);
        });
        const customPatternBtn = document.getElementById('btnCustomPatternColor');
        if (customPatternBtn) {
            let isPreset = false;
            document.querySelectorAll('.color-option-small[data-pattern-color]').forEach(b => {
                if (b.dataset.patternColor === this.settings.patternColor) isPreset = true;
            });
            if (!isPreset) {
                // If custom
                customPatternBtn.style.backgroundColor = this.settings.patternColor;
                customPatternBtn.dataset.patternColor = this.settings.patternColor;
                customPatternBtn.classList.add('active');
                customPatternBtn.innerHTML = '';
            } else {
                customPatternBtn.style.backgroundColor = 'white';
                customPatternBtn.classList.remove('active');
                customPatternBtn.innerHTML = '+';
            }
        }

        // Desen Aralığı
        const spacingSlider = document.getElementById('patternSpacingSlider');
        const spacingVal = document.getElementById('patternSpacingVal');
        if (spacingSlider) {
            spacingSlider.value = this.settings.patternSpacing || 20;
            if (spacingVal) spacingVal.textContent = (this.settings.patternSpacing || 20) + 'px';
        }

        // Desen Kalınlığı
        const thicknessSlider = document.getElementById('patternThicknessSlider');
        const thicknessVal = document.getElementById('patternThicknessVal');
        if (thicknessSlider) {
            thicknessSlider.value = this.settings.patternThickness || 1;
            if (thicknessVal) thicknessVal.textContent = (this.settings.patternThickness || 1) + 'px';
        }
    }

    applySettings(canvas, ctx, syncFromCanvas = null) {
        const dpr = window.devicePixelRatio || 1;
        let cssWidth, cssHeight;

        if (syncFromCanvas) {
            // Sync dimensions from another canvas (useful for offscreen cache)
            cssWidth = syncFromCanvas.clientWidth;
            cssHeight = syncFromCanvas.clientHeight;
        } else {
            const container = canvas.parentElement;
            if (container) {
                if (this.settings.size === 'full') {
                    cssWidth = container.clientWidth - 40;
                    cssHeight = container.clientHeight - 40;
                } else {
                    const size = this.sizes[this.settings.size];
                    let w = size.width;
                    let h = size.height;

                    if (this.settings.orientation === 'portrait') {
                        cssWidth = w;
                        cssHeight = h;
                    } else {
                        cssWidth = h;
                        cssHeight = w;
                    }

                    // Fit to screen
                    const maxWidth = container.clientWidth - 40;
                    const maxHeight = container.clientHeight - 40;
                    const scale = Math.min(maxWidth / cssWidth, maxHeight / cssHeight, 0.9);

                    if (scale < 1) {
                        cssWidth = Math.floor(cssWidth * scale);
                        cssHeight = Math.floor(cssHeight * scale);
                    }
                }
            } else {
                // Fallback for off-dom canvas with no sync target
                cssWidth = canvas.clientWidth || 800;
                cssHeight = canvas.clientHeight || 600;
            }
        }

        // Apply styles and dimensions
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);

        // Apply DPR scale to the coordinate system
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.scale(dpr, dpr);

        // Render background
        this.drawBackground(canvas, ctx, null, cssWidth, cssHeight, 1);
    }

    drawBackground(canvas, ctx, visibleBounds, explicitW = null, explicitH = null, zoom = 1) {
        let logicalW = explicitW || canvas.clientWidth || parseInt(canvas.style.width);
        let logicalH = explicitH || canvas.clientHeight || parseInt(canvas.style.height);

        // Final fallback to physical dimensions (normalized by DPR)
        if (!logicalW || isNaN(logicalW)) logicalW = canvas.width / (window.devicePixelRatio || 1);
        if (!logicalH || isNaN(logicalH)) logicalH = canvas.height / (window.devicePixelRatio || 1);

        let x = 0, y = 0, w = logicalW, h = logicalH;

        if (visibleBounds) {
            x = visibleBounds.x;
            y = visibleBounds.y;
            w = visibleBounds.width;
            h = visibleBounds.height;
        }

        // Arkaplan rengi
        ctx.fillStyle = this.colors[this.settings.backgroundColor] || this.settings.backgroundColor || '#ffffff';
        ctx.fillRect(x, y, w, h);

        // Desen çiz
        this.drawPattern(canvas, ctx, { x, y, w, h }, zoom);
    }

    drawPattern(canvas, ctx, bounds, zoom = 1) {
        const pattern = this.settings.pattern;

        if (pattern === 'none') return;

        const color = this.settings.patternColor || 'rgba(0,0,0,0.15)';
        const baseSpacing = parseInt(this.settings.patternSpacing) || 20;
        const baseThickness = parseFloat(this.settings.patternThickness) || 1;

        // Scale by zoom
        const spacing = baseSpacing * zoom;
        const thickness = baseThickness * zoom;

        ctx.strokeStyle = color;
        ctx.fillStyle = color; // For dots
        ctx.lineWidth = thickness;

        const startX = bounds.x;
        const startY = bounds.y;
        const endX = bounds.x + bounds.w;
        const endY = bounds.y + bounds.h;

        if (pattern === 'dots') {
            // Noktalı desen
            // Grid align
            const firstX = Math.floor(startX / spacing) * spacing;
            const firstY = Math.floor(startY / spacing) * spacing;

            for (let x = firstX; x < endX; x += spacing) {
                for (let y = firstY; y < endY; y += spacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, thickness * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (pattern === 'grid') {
            // Kareli desen
            const firstX = Math.floor(startX / spacing) * spacing;
            const firstY = Math.floor(startY / spacing) * spacing;

            ctx.beginPath();
            for (let x = firstX; x <= endX; x += spacing) {
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
            }
            for (let y = firstY; y <= endY; y += spacing) {
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
            }
            ctx.stroke();
        } else if (pattern === 'lines') {
            // Çizgili desen
            const firstY = Math.floor(startY / spacing) * spacing;

            ctx.beginPath();
            for (let y = firstY; y <= endY; y += spacing) {
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
            }
            ctx.stroke();
        }
    }

    getSizeLabel() {
        const labels = {
            a6: 'A6',
            a5: 'A5',
            a4: 'A4',
            a3: 'A3',
            letter: 'Letter',
            full: 'Tam Ekran'
        };
        return labels[this.settings.size];
    }
}
