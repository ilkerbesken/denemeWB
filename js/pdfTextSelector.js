class PDFTextSelector {
    constructor(app) {
        this.app = app;
        // Try to find the canvas parent to use as container
        this.container = this.app.canvas ? this.app.canvas.parentNode : (document.getElementById('canvas-wrapper') || document.body);

        this.layerContainer = null;
        this.isActive = false;
        this.textLayers = new Map(); // pageIndex -> div

        // Remove old styles (cleanup from previous versions)
        ['pdf-text-selection-style', 'pdf-text-selection-style-v2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        this.injectStyles();
        this.createContainer();
    }

    /**
     * Create the main transformation container
     */
    createContainer() {
        if (this.layerContainer) this.layerContainer.remove();

        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'pdf-text-layer-container';

        // Styles for the container
        this.layerContainer.style.position = 'absolute';
        this.layerContainer.style.top = '0';
        this.layerContainer.style.left = '0';
        this.layerContainer.style.width = '100%';
        this.layerContainer.style.height = '100%';
        this.layerContainer.style.pointerEvents = 'none'; // Passthrough by default
        this.layerContainer.style.transformOrigin = '0 0';
        this.layerContainer.style.zIndex = '5'; // Above canvas
        this.layerContainer.style.overflow = 'visible';

        // Forward wheel events to ZoomManager for seamless zooming/scrolling
        this.layerContainer.addEventListener('wheel', (e) => {
            if (this.app.zoomManager && this.app.canvas) {
                // Fix coordinates to be relative to canvas
                const canvasRect = this.app.canvas.getBoundingClientRect();
                const relX = e.clientX - canvasRect.left;
                const relY = e.clientY - canvasRect.top;

                // Proxy event
                const proxyEvent = {
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation(),
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    deltaX: e.deltaX,
                    deltaY: e.deltaY,
                    offsetX: relX,
                    offsetY: relY,
                    clientX: e.clientX,
                    clientY: e.clientY
                };

                this.app.zoomManager.handleWheel(proxyEvent);
            }
        }, { passive: false });

        this.container.appendChild(this.layerContainer);
    }

    /**
     * Inject CSS
     */
    injectStyles() {
        const styleId = 'pdf-text-selection-style-v3';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                /* Adjusted line-height to improve selection consistency */
                .pdf-text-layer {
                    position: absolute;
                    left: 0; 
                    transform-origin: 0 0;
                    line-height: 1.25;
                    pointer-events: none;
                    user-select: none;
                    -webkit-user-select: none;
                }
                
                .pdf-text-layer.active {
                    pointer-events: auto;
                    user-select: text;
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                }

                .pdf-text-layer span {
                    color: transparent;
                    position: absolute;
                    white-space: pre;
                    cursor: text;
                    transform-origin: 0% 0%;
                    user-select: text;
                    -webkit-user-select: text;
                }

                ::selection {
                    background: rgba(33, 150, 243, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Render text layer for a specific page
     */
    async renderTextLayer(pdfPage, viewport) {
        // Use 1.0 scale logic to match logical canvas coordinates
        const logicalViewport = pdfPage.getViewport({ scale: 1.0 });

        // Determine Page Index and Position
        const pageIndex = pdfPage.pageNumber - 1; // 1-based to 0-based
        let pageY = 0;
        if (this.app.pageManager) {
            pageY = this.app.pageManager.getPageY(pageIndex);
        }

        // Cleanup existing if present
        if (this.textLayers.has(pageIndex)) {
            this.textLayers.get(pageIndex).remove();
            this.textLayers.delete(pageIndex);
        }

        // Create Layer Div
        const layerDiv = document.createElement('div');
        layerDiv.className = 'pdf-text-layer';
        if (this.isActive) layerDiv.classList.add('active');

        layerDiv.style.width = `${logicalViewport.width}px`;
        layerDiv.style.height = `${logicalViewport.height}px`;
        // Dikey hizalama düzeltmesi kaldırıldı (Zoom ile kaymayı önlemek için)
        layerDiv.style.top = `${pageY}px`;
        layerDiv.style.left = '0px';

        // Required for PDF.js 3.x+
        layerDiv.style.setProperty('--scale-factor', logicalViewport.scale);

        this.layerContainer.appendChild(layerDiv);
        this.textLayers.set(pageIndex, layerDiv);

        try {
            const textContent = await pdfPage.getTextContent();

            // Render
            await pdfjsLib.renderTextLayer({
                textContentSource: textContent,
                container: layerDiv,
                viewport: logicalViewport,
                textDivs: [],
                enhanceTextSelection: true
            }).promise;

            console.log(`PDF Text Layer v3 created for Page ${pdfPage.pageNumber} at Y=${pageY}`);

        } catch (error) {
            console.error(`Error rendering text layer for Page ${pdfPage.pageNumber}:`, error);
        }
    }

    /**
     * Update transform for the container
     */
    updateTransform(scale, x, y) {
        if (!this.layerContainer) return;

        // Canvas elementinin parent içindeki ofsetini hesaba kat
        // Canvas ortalanmış olabilir, bu yüzden container'ı canvas üzerine tam oturtuyoruz
        if (this.app.canvas) {
            this.layerContainer.style.left = `${this.app.canvas.offsetLeft}px`;
            this.layerContainer.style.top = `${this.app.canvas.offsetTop}px`;
            this.layerContainer.style.width = `${this.app.canvas.offsetWidth}px`;
            this.layerContainer.style.height = `${this.app.canvas.offsetHeight}px`;
        }

        this.layerContainer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    /**
     * Toggle activation
     */
    toggle() {
        this.isActive = !this.isActive;
        if (this.layerContainer) {
            // Update all existing layers
            this.textLayers.forEach(div => {
                if (this.isActive) div.classList.add('active');
                else div.classList.remove('active');
            });
        }
        return this.isActive;
    }

    /**
     * Clear all
     */
    clear() {
        this.textLayers.clear();
        if (this.layerContainer) {
            this.layerContainer.innerHTML = '';
        }
        this.pdfPage = null;
    }
}
