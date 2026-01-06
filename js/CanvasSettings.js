class CanvasSettings {
    constructor() {
        this.settings = {
            size: 'a4',
            orientation: 'portrait',
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
        const oriInput = document.querySelector(`input[name="orientation"][value="${this.settings.orientation}"]`);
        if (oriInput) oriInput.checked = true;

        // Renk seç
        document.querySelectorAll('.color-option-rect[data-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === this.settings.backgroundColor);
        });

        // Desen seç
        document.querySelectorAll('.pattern-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.pattern === this.settings.pattern);
        });

        // Show/hide sub-options
        const patternGroup = document.getElementById('patternOptionsGroup');
        if (patternGroup) {
            patternGroup.style.display = (this.settings.pattern === 'none') ? 'none' : 'block';
        }

        // Desen Rengi Seç
        document.querySelectorAll('.color-option-rect[data-pattern-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.patternColor === this.settings.patternColor);
        });

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

        // Sabit mantıksal boyutlar - constants.js'den alınıyor
        const LOGICAL_WIDTH = CANVAS_CONSTANTS.LOGICAL_WIDTH;
        const LOGICAL_HEIGHT = CANVAS_CONSTANTS.LOGICAL_HEIGHT;

        let containerWidth, containerHeight;

        if (syncFromCanvas) {
            // Offscreen canvas için ana canvas'ın boyutlarını kullan
            canvas.width = syncFromCanvas.width;
            canvas.height = syncFromCanvas.height;

            // Offscreen canvas için CSS boyutu gerekmez
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            this.drawBackground(canvas, ctx, null, LOGICAL_WIDTH, LOGICAL_HEIGHT, 1);
            return;
        }

        // Ana canvas için container boyutlarını al
        const container = canvas.parentElement;
        if (container) {
            containerWidth = container.clientWidth - 40;
            containerHeight = container.clientHeight - 40;
        } else {
            containerWidth = 800;
            containerHeight = 600;
        }

        // Canvas'ın internal boyutunu sabit tut (yüksek çözünürlük için DPR ile çarp)
        canvas.width = Math.floor(LOGICAL_WIDTH * dpr);
        canvas.height = Math.floor(LOGICAL_HEIGHT * dpr);

        // CSS ile canvas'ı container'a sığdır (aspect ratio korunarak)
        const containerAspect = containerWidth / containerHeight;
        const canvasAspect = LOGICAL_WIDTH / LOGICAL_HEIGHT;

        let cssWidth, cssHeight;

        if (containerAspect > canvasAspect) {
            // Container daha geniş - yüksekliğe göre ölçekle
            cssHeight = containerHeight;
            cssWidth = cssHeight * canvasAspect;
        } else {
            // Container daha dar - genişliğe göre ölçekle
            cssWidth = containerWidth;
            cssHeight = cssWidth / canvasAspect;
        }

        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';

        // Koordinat sistemini ayarla
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Arka planı çiz
        this.drawBackground(canvas, ctx, null, LOGICAL_WIDTH, LOGICAL_HEIGHT, 1);
    }

    drawBackground(canvas, ctx, visibleBounds, explicitW = null, explicitH = null, zoom = 1, overrides = null) {
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
        const bgColor = (overrides && overrides.color) ? (this.colors[overrides.color] || overrides.color) : (this.colors[this.settings.backgroundColor] || this.settings.backgroundColor || '#ffffff');

        // Sayfa Gölgesi (Eğer tam ekran değilse)
        if (this.settings.size !== 'full') {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, w, h);
        }

        // Desen çiz
        this.drawPattern(canvas, ctx, { x, y, w, h }, zoom, overrides);
    }

    drawPattern(canvas, ctx, bounds, zoom = 1, overrides = null) {
        const pattern = (overrides && overrides.pattern) ? overrides.pattern : this.settings.pattern;

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
