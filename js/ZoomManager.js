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

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => this.enableZoomInput());
            zoomResetBtn.title = "Değer girmek için tıklayın";
        }
    }

    handleWheel(e) {
        e.preventDefault();

        // Check for PINCH ZOOM (Trackpad) or Ctrl+Wheel
        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;
            this.zoomAtPoint(e.offsetX, e.offsetY, factor);
        } else {
            // Pan
            this.pan.x -= e.deltaX;
            this.pan.y -= e.deltaY;
            this.updateUI();
            this.app.redrawOffscreen(); // Optional: if background needs redraw? usually render() handles this.
            this.app.render();
        }
    }

    zoomAtPoint(x, y, factor) {
        const oldZoom = this.zoom;
        let newZoom = oldZoom * factor;
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        // Calculate offset to keep (x, y) stable
        // worldX = (screenX - panX) / oldZoom
        // worldX = (screenX - newPanX) / newZoom

        // (screenX - panX) / oldZoom = (screenX - newPanX) / newZoom
        // screenX/oldZoom - panX/oldZoom = screenX/newZoom - newPanX/newZoom
        // newPanX/newZoom = screenX/newZoom - worldX
        // newPanX = screenX - worldX * newZoom

        const worldX = (x - this.pan.x) / oldZoom;
        const worldY = (y - this.pan.y) / oldZoom;

        this.pan.x = x - worldX * newZoom;
        this.pan.y = y - worldY * newZoom;
        this.zoom = newZoom;

        this.updateUI();
        this.app.redrawOffscreen();
        this.app.render();
    }

    zoomIn() {
        const center = { x: this.app.canvas.width / 2, y: this.app.canvas.height / 2 };
        this.zoomAtPoint(center.x, center.y, 1.25);
    }

    zoomOut() {
        const center = { x: this.app.canvas.width / 2, y: this.app.canvas.height / 2 };
        this.zoomAtPoint(center.x, center.y, 0.8);
    }

    resetZoom() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.updateUI();
        this.app.redrawOffscreen();
        this.app.render();
    }

    getPointerWorldPos(e) {
        // Returns { x, y, pressure } in logic coordinates
        // Using existing utils normalization for pressure if available

        // Handle both MouseEvent and PointerEvent
        // e might be just { offsetX, offsetY } if synthetically created, but usually event.

        const rect = this.app.canvas.getBoundingClientRect();
        // Use clientX/Y if offsetX is unreliable during transforms? 
        // Actually offsetX is usually relative to target padding box.
        // Let's rely on standard offset if available, but consider pan/zoom.

        let clientX = e.clientX !== undefined ? e.clientX : 0;
        let clientY = e.clientY !== undefined ? e.clientY : 0;

        // If offsetX provided use that (but verify)
        let screenX = e.offsetX;
        let screenY = e.offsetY;

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
                const center = { x: this.app.canvas.width / 2, y: this.app.canvas.height / 2 };
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

    startPan(e) {
        this.isPanning = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.app.canvas.style.cursor = 'grabbing';
    }

    updatePan(e) {
        if (!this.isPanning) return;

        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;

        this.pan.x += deltaX;
        this.pan.y += deltaY;

        this.lastMousePos = { x: e.clientX, y: e.clientY };

        this.updateUI();
        this.app.redrawOffscreen();
        this.app.render();
    }

    endPan() {
        this.isPanning = false;
        // Cursor reset is handled by App based on key state or tool
    }

    // --- Touch Specific Navigation ---

    handlePinch(points) {
        if (points.length < 2) {
            this.resetPinch();
            return;
        }

        const p1 = points[0];
        const p2 = points[1];

        // Current distance and center in screen coordinates
        const dist = Math.sqrt(Math.pow(p1.clientX - p2.clientX, 2) + Math.pow(p1.clientY - p2.clientY, 2));
        const centerX = (p1.clientX + p2.clientX) / 2;
        const centerY = (p1.clientY + p2.clientY) / 2;

        const canvasRect = this.app.canvas.getBoundingClientRect();
        const localX = centerX - canvasRect.left;
        const localY = centerY - canvasRect.top;

        if (!this.lastPinchDist) {
            this.lastPinchDist = dist;
            this.lastPinchCenter = { x: localX, y: localY };
            return;
        }

        // 1. Zoom logic
        const factor = dist / this.lastPinchDist;
        if (Math.abs(1 - factor) > 0.005) { // Sensitivity threshold
            this.zoomAtPoint(localX, localY, factor);
        }

        // 2. Pan logic (Drag while pinching)
        const dx = localX - this.lastPinchCenter.x;
        const dy = localY - this.lastPinchCenter.y;

        this.pan.x += dx;
        this.pan.y += dy;

        this.lastPinchDist = dist;
        this.lastPinchCenter = { x: localX, y: localY };

        this.app.redrawOffscreen();
        this.app.render();
    }

    resetPinch() {
        this.lastPinchDist = null;
        this.lastPinchCenter = null;
    }
}
