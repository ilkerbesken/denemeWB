class ZoomManager {
    constructor(app) {
        this.app = app;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.isEditingZoom = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.zoomSpeed = 0.1;

        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        // UI is created in index.html, we just attach listeners here
        // But if we want to be fully modular, we could checking if elements exist
        // For now, we assume elements will be in index.html as per plan
    }

    setupEventListeners() {
        // Wheel Zoom (Ctrl + Wheel) & Pan (Wheel)
        this.app.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // UI Buttons
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');
        const zoomFitBtn = document.getElementById('zoomFitBtn');

        if (zoomFitBtn) zoomFitBtn.addEventListener('click', () => this.fitToWidth(10));
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => this.enableZoomInput());
            zoomResetBtn.title = "Değer girmek için tıklayın";
        }
    }

    getLogicalDims() {
        if (this.app.canvasSettings && this.app.canvasSettings.getLogicalSize) {
            return this.app.canvasSettings.getLogicalSize();
        }
        return { width: CANVAS_CONSTANTS.LOGICAL_WIDTH, height: CANVAS_CONSTANTS.LOGICAL_HEIGHT };
    }

    handleWheel(e) {
        e.preventDefault();

        const { width: logicalW } = this.getLogicalDims();
        const cssW = this.app.canvas.clientWidth;
        const scale = (cssW > 0) ? (logicalW / cssW) : 1;

        // Check for PINCH ZOOM (Trackpad) or Ctrl+Wheel
        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;

            // Mouse pozisyonunu mantıksal koordinata çevir
            const logicX = e.offsetX * scale;
            const logicY = e.offsetY * scale;

            this.zoomAtPoint(logicX, logicY, factor);
        } else {
            // Pan - Pan miktarını da ölçekle
            this.pan.x -= e.deltaX * scale;
            this.pan.y -= e.deltaY * scale;
            this.updateUI();
            this.clampPan(); // Clamping will handle constraints and redraw/render
            this.syncActivePageByScroll();
        }
    }

    clampPan() {
        if (!this.app.pageManager) return;

        const dpr = window.devicePixelRatio || 1;
        // Sabit mantıksal boyutlar
        const { width: logicalW, height: logicalH } = this.getLogicalDims();

        // 1. Yatay kısıtlama (Esnek yatay kaydırma)
        const pageWidth = this.app.pageManager.getPageWidth();
        const scaledWidth = pageWidth * this.zoom;

        if (scaledWidth > logicalW) {
            // Eğer sayfa ekrana sığmıyorsa kaydırmaya izin ver ama sınırları koru
            const minPanX = logicalW - scaledWidth;
            if (this.pan.x > 0) this.pan.x = 0;
            if (this.pan.x < minPanX) this.pan.x = minPanX;
        } else {
            // Eğer sığıyorsa ortala
            this.pan.x = (logicalW - scaledWidth) / 2;
        }

        // 2. Dikey sınırlama (Kısıt #1 ve #2)
        const totalHeight = this.app.pageManager.getTotalHeight();
        const scaledHeight = totalHeight * this.zoom;

        // Üst sınır: İlk sayfanın tepesini geçme
        if (this.pan.y > 0) this.pan.y = 0;

        // Alt sınır: Son sayfanın altını geçme
        if (scaledHeight > logicalH) {
            const minPanY = logicalH - scaledHeight;
            if (this.pan.y < minPanY) this.pan.y = minPanY;
        } else {
            // Eğer tüm döküman ekrana sığıyorsa tepede kalsın
            // this.pan.y = 0; // Bu satırı kaldırdım ki serbestçe pan yapılabilsin veya ortalansın
            this.pan.y = (logicalH - scaledHeight) / 2; // Dikeyde de ortalayalım eğer sığıyorsa
            if (this.pan.y < 0) this.pan.y = 0; // Ama asla yukarı taşmasın (isteğe bağlı)
        }

        this.app.redrawOffscreen();
        this.app.render();
    }

    syncActivePageByScroll() {
        if (!this.app.pageManager) return;

        // Mantıksal yükseklik üzerinden hesapla
        const { height: canvasH } = this.getLogicalDims();
        const viewportCenterY = -this.pan.y / this.zoom + (canvasH / (2 * this.zoom));
        const activeIndex = this.app.pageManager.getPageIndexAt(viewportCenterY);
        if (activeIndex !== this.app.pageManager.currentPageIndex) {
            this.app.pageManager.switchPage(activeIndex, false);
        }
    }

    zoomAtPoint(x, y, factor) {
        const oldZoom = this.zoom;
        let newZoom = oldZoom * factor;
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        const worldX = (x - this.pan.x) / oldZoom;
        const worldY = (y - this.pan.y) / oldZoom;

        this.pan.x = x - worldX * newZoom;
        this.pan.y = y - worldY * newZoom;
        this.zoom = newZoom;

        this.updateUI();
        this.clampPan();
    }

    zoomIn() {
        const { width: logicalW, height: logicalH } = this.getLogicalDims();
        const center = { x: logicalW / 2, y: logicalH / 2 };
        this.zoomAtPoint(center.x, center.y, 1.25);
    }

    zoomOut() {
        const { width: logicalW, height: logicalH } = this.getLogicalDims();
        const center = { x: logicalW / 2, y: logicalH / 2 };
        this.zoomAtPoint(center.x, center.y, 0.8);
    }

    fitToWidth(marginPX = 10) {
        const cssW = this.app.canvas.clientWidth;
        if (!cssW) return;

        const { width: logicalW } = this.getLogicalDims();
        const scale = logicalW / cssW; // map CSS px to Logic px
        const marginLogic = marginPX * scale;

        const pageWidth = this.app.pageManager.getPageWidth();

        // Target: pageWidth * zoom = logicalW - 2 * marginLogic
        // zoom = (logicalW - 2 * marginLogic) / pageWidth
        let targetZoom = (logicalW - 2 * marginLogic) / pageWidth;

        // Apply limits
        targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));

        this.zoom = targetZoom;

        // Center horizontally
        // scaledWidth (visible) = pageWidth * zoom
        // space = logicalW - scaledWidth
        // pan.x = space / 2
        const scaledWidth = pageWidth * this.zoom;
        this.pan.x = (logicalW - scaledWidth) / 2;

        // Reset vertical pan to top
        this.pan.y = 0;

        this.updateUI();
        this.clampPan();
        this.app.redrawOffscreen();
        this.app.render();
    }

    resetZoom() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.updateUI();
        this.clampPan();
    }

    getPointerWorldPos(e) {
        // Returns { x, y, pressure } in logic coordinates

        const { width: logicalW } = this.getLogicalDims();
        const cssW = this.app.canvas.clientWidth;
        const scale = (cssW > 0) ? (logicalW / cssW) : 1;

        // Mouse (CSS pixel) -> Logic Pixel
        let screenX = e.offsetX * scale;
        let screenY = e.offsetY * scale;

        const worldX = (screenX - this.pan.x) / this.zoom;
        const worldY = (screenY - this.pan.y) / this.zoom;

        const pressure = e.pressure !== undefined ? e.pressure : 0.5;

        return {
            x: worldX,
            y: worldY,
            pressure: pressure
        };
    }

    updateUI() {
        if (this.isEditingZoom) return;
        const display = document.getElementById('zoomLevelDisplay');
        if (display) {
            display.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    enableZoomInput() {
        if (this.isEditingZoom) return;
        this.isEditingZoom = true;

        const display = document.getElementById('zoomLevelDisplay');
        const btn = document.getElementById('zoomResetBtn');
        if (!display || !btn) {
            this.isEditingZoom = false;
            return;
        }

        const currentVal = Math.round(this.zoom * 100);
        display.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentVal;
        input.className = 'zoom-input';

        btn.appendChild(input);
        input.focus();
        input.select();

        // Stop propagation so clicking input doesn't trigger button click loop or other things
        input.addEventListener('click', (e) => e.stopPropagation());

        const save = () => {
            let val = parseInt(input.value);
            if (!isNaN(val)) {
                val = Math.max(10, Math.min(500, val));
                const { width: logicalW, height: logicalH } = this.getLogicalDims();
                const center = { x: logicalW / 2, y: logicalH / 2 };
                const targetZoom = val / 100;
                const factor = targetZoom / this.zoom;
                this.zoomAtPoint(center.x, center.y, factor);
            }
            this.finishEditingZoom();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                this.isEditingZoom = false;
                this.finishEditingZoom();
            }
        });

        input.addEventListener('blur', () => {
            if (this.isEditingZoom) save();
        });
    }

    finishEditingZoom() {
        this.isEditingZoom = false;
        const display = document.getElementById('zoomLevelDisplay');
        const btn = document.getElementById('zoomResetBtn');

        if (btn) {
            const input = btn.querySelector('input');
            if (input) btn.removeChild(input);
        }

        if (display) {
            display.style.display = 'inline';
        }

        this.updateUI();
    }

    // ... Methods below (enableZoomInput, finishEditingZoom) remain largely same but omitted here for brevity 
    // since I'm targeting replacements. But wait, I need to keep enableZoomInput.
    // I will use replace_file_content for the block from handleWheel to end of updatePan or getPointerWorldPos.

    // ...

    startPan(e) {
        this.isPanning = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.app.canvas.style.cursor = 'grabbing';
    }

    updatePan(e) {
        if (!this.isPanning) return;

        const { width: logicalW } = this.getLogicalDims();
        const cssW = this.app.canvas.clientWidth;
        const scale = (cssW > 0) ? (logicalW / cssW) : 1;

        const deltaX = (e.clientX - this.lastMousePos.x) * scale;
        const deltaY = (e.clientY - this.lastMousePos.y) * scale;

        this.pan.x += deltaX;
        this.pan.y += deltaY;

        this.lastMousePos = { x: e.clientX, y: e.clientY };

        this.updateUI();
        this.clampPan();

        // Sayfalar arası geçişi senkronize et
        this.syncActivePageByScroll();
    }

    endPan() {
        this.isPanning = false;
        // Cursor reset is handled by App based on key state or tool
    }
}
