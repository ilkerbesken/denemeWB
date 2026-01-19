class TextTool {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
        this.isEditing = false;
        this.editingObject = null;
        this.activeEditor = null;
        this.activeToolbar = null;
    }

    handlePointerDown(e, worldPos, canvas, ctx, state) {
        if (this.isEditing) {
            this.finishEditing(state);
            return;
        }

        // Check if we clicked on an existing text object (search in reverse order)
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            if (obj.type === 'text' && !obj.locked) {
                if (this.isPointInside(obj, worldPos)) {
                    this.startEditing(obj, canvas, state);
                    return;
                }
            }
        }

        // Create new text object
        const newText = {
            type: 'text',
            id: Date.now(),
            x: worldPos.x,
            y: worldPos.y,
            width: 200,
            height: 40,
            htmlContent: '<div>Yeni Metin</div>',
            fontSize: 16,
            color: state.strokeColor || '#000000',
            alignment: 'left',
            locked: false,
            opacity: 1
        };

        this.startEditing(newText, canvas, state, true);
    }

    handlePointerMove(e, worldPos, canvas, ctx, state) {
        return false;
    }

    handlePointerUp(e, worldPos, canvas, ctx, state) {
        return null;
    }

    isPointInside(obj, worldPos) {
        return worldPos.x >= obj.x && worldPos.x <= obj.x + obj.width &&
            worldPos.y >= obj.y && worldPos.y <= obj.y + obj.height;
    }

    startEditing(obj, canvas, state, isNew = false) {
        this.isEditing = true;
        this.editingObject = obj;

        // Create Editor UI
        const editor = document.createElement('div');
        editor.className = 'rich-text-editor';
        editor.contentEditable = true;
        editor.innerHTML = obj.htmlContent;

        // Parent to .canvas-container for stable positioning
        const container = canvas.parentElement;
        const zoom = window.app.zoomManager.zoom;
        const pan = window.app.zoomManager.pan;
        const pageY = window.app.pageManager.getPageY(window.app.pageManager.currentPageIndex);

        // Calculate Scale: Always 1 in the current full-viewport canvas implementation
        const scale = 1;

        // Calculate screen position relative to the container
        // Formula: logicScreenPos = (worldPos * zoom) + pan
        // cssScreenPos = logicScreenPos / scale
        const logicLeft = (obj.x * zoom) + pan.x;
        const logicTop = ((obj.y + pageY) * zoom) + pan.y;

        const left = (logicLeft / scale) + canvas.offsetLeft;
        const top = (logicTop / scale) + canvas.offsetTop;

        editor.style.left = `${left}px`;
        editor.style.top = `${top}px`;
        editor.style.width = `${(obj.width * zoom) / scale}px`;
        editor.style.minHeight = `${(obj.height * zoom) / scale}px`;
        editor.style.fontSize = `${(obj.fontSize * zoom) / scale}px`;
        editor.style.color = obj.color;
        editor.style.textAlign = obj.alignment || 'left';

        container.appendChild(editor);
        this.activeEditor = editor;

        // Create Toolbar
        this.activeToolbar = this.createToolbar(editor, left, top - 60);
        container.appendChild(this.activeToolbar);

        // Mobile Viewport Handling (Keyboard adjustment)
        if (window.visualViewport) {
            const updateToolbarPosition = () => {
                if (!this.activeToolbar) return;
                // Only apply on mobile width
                if (window.innerWidth > 768) {
                    this.activeToolbar.style.removeProperty('--mobile-toolbar-bottom');
                    return;
                }

                const vv = window.visualViewport;
                // Calculate difference between layout height and visual height (keyboard height usually)
                // Note: On modern browsers with interactive-widget=resizes-content, this diff might be 0, which is fine (bottom: 0 works).
                // On older iOS, this diff acts as bottom padding.
                const offset = window.innerHeight - vv.height - vv.offsetTop;
                this.activeToolbar.style.setProperty('--mobile-toolbar-bottom', `${Math.max(0, offset)}px`);
            };

            this.viewportHandler = updateToolbarPosition;
            window.visualViewport.addEventListener('resize', this.viewportHandler);
            window.visualViewport.addEventListener('scroll', this.viewportHandler);
            // Initial call
            updateToolbarPosition();
        }

        editor.focus();

        const isDefault = () => editor.innerText.trim().toLowerCase() === 'yeni metin';

        if (isDefault()) {
            // Select all by default so typing replaces it
            document.execCommand('selectAll', false, null);
        }

        editor.addEventListener('pointerdown', e => e.stopPropagation());

        // Handle placeholder clearing on first input
        editor.addEventListener('beforeinput', (e) => {
            if (isDefault() && e.inputType.startsWith('insert')) {
                editor.innerHTML = '';
            }
        });

        editor.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.finishEditing(state);
            }
            if (e.key === 'Enter' && e.ctrlKey) {
                this.finishEditing(state);
            }
            // Clear placeholder on first keydown if it's a printable character (safeguard for beforeinput)
            if (isDefault() && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                editor.innerHTML = '';
            }
            e.stopPropagation();
        });

        editor.addEventListener('input', () => {
            const currentZoom = window.app.zoomManager.zoom;
            // Scale is 1
            const currentScale = 1;

            // Reverse coordinates to logic
            this.editingObject.width = (editor.offsetWidth * currentScale) / currentZoom;
            this.editingObject.height = (editor.offsetHeight * currentScale) / currentZoom;
            this.editingObject.htmlContent = editor.innerHTML;
        });
    }

    createToolbar(editor, x, y) {
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-text-toolbar';
        toolbar.style.left = `${Math.max(10, x)}px`;
        toolbar.style.top = `${Math.max(10, y)}px`;

        const buttons = [
            { icon: '<img src="assets/icons/text-bold.svg" class="icon">', command: 'bold', title: 'Kalın' },
            { icon: '<img src="assets/icons/text-italic.svg" class="icon">', command: 'italic', title: 'İtalik' },
            { icon: '<img src="assets/icons/text-underline.svg" class="icon">', command: 'underline', title: 'Altı Çizili' },
            { separator: true },
            { icon: '<img src="assets/icons/text-align-left.svg" class="icon">', action: 'align', value: 'left', title: 'Sola Yasla' },
            { icon: '<img src="assets/icons/text-align-center.svg" class="icon">', action: 'align', value: 'center', title: 'Ortala' },
            { icon: '<img src="assets/icons/text-align-right.svg" class="icon">', action: 'align', value: 'right', title: 'Sağa Yasla' },
            { separator: true },
            { icon: '<img src="assets/icons/text-list.svg" class="icon">', command: 'insertUnorderedList', title: 'Liste' }
        ];

        buttons.forEach(btn => {
            if (btn.separator) {
                const sep = document.createElement('div');
                sep.className = 'separator';
                toolbar.appendChild(sep);
                return;
            }

            const button = document.createElement('button');
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.className = 'toolbar-btn';

            if (btn.action === 'align') {
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.editingObject.alignment = btn.value;
                    editor.style.textAlign = btn.value;
                    editor.focus();
                };
            } else {
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.execCommand(btn.command, false, null);
                    editor.focus();
                };
            }
            toolbar.appendChild(button);
        });

        const sizeSelect = document.createElement('select');
        sizeSelect.className = 'toolbar-select';
        [12, 14, 16, 18, 20, 24, 32, 40, 48, 64, 72, 96].forEach(size => {
            const opt = document.createElement('option');
            opt.value = size;
            opt.textContent = size;
            if (size === this.editingObject.fontSize) opt.selected = true;
            sizeSelect.appendChild(opt);
        });
        sizeSelect.onchange = () => {
            this.editingObject.fontSize = parseInt(sizeSelect.value);
            const zoom = window.app.zoomManager.zoom;
            // Scale is 1
            const currentScale = 1;
            editor.style.fontSize = `${(this.editingObject.fontSize * zoom) / currentScale}px`;
            editor.focus();
        };
        toolbar.appendChild(sizeSelect);

        const colorBtn = document.createElement('div');
        colorBtn.className = 'toolbar-color';
        colorBtn.title = 'Metin Rengi';
        colorBtn.style.backgroundColor = this.editingObject.color || '#000000';
        colorBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.app.colorPalette) {
                window.app.colorPalette.showColorPicker(this.editingObject.color || '#000000', (newColor) => {
                    this.editingObject.color = newColor;
                    colorBtn.style.backgroundColor = newColor;
                    editor.style.color = newColor;
                    document.execCommand('foreColor', false, newColor);
                    editor.focus();
                }, colorBtn, 'left');
            }
        };
        toolbar.appendChild(colorBtn);

        return toolbar;
    }

    finishEditing(state) {
        if (!this.isEditing) return;

        this.editingObject.htmlContent = this.activeEditor.innerHTML;

        const zoom = window.app.zoomManager.zoom;
        // Scale is 1
        const currentScale = 1;

        this.editingObject.width = (this.activeEditor.offsetWidth * currentScale) / zoom;
        this.editingObject.height = (this.activeEditor.offsetHeight * currentScale) / zoom;

        const plainText = this.activeEditor.innerText.trim();
        const isPlaceholder = plainText.toLowerCase() === 'yeni metin';

        if ((plainText === "" || isPlaceholder) && !this.activeEditor.querySelector('img')) {
            const idx = state.objects.indexOf(this.editingObject);
            if (idx !== -1) {
                state.objects.splice(idx, 1);
            }
        } else {
            if (!state.objects.includes(this.editingObject)) {
                state.objects.push(this.editingObject);
            }
        }

        // Force a final image generation
        this.generateCachedImage(this.editingObject);

        if (this.activeEditor) this.activeEditor.remove();
        if (this.activeToolbar) this.activeToolbar.remove();

        if (this.viewportHandler && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.viewportHandler);
            window.visualViewport.removeEventListener('scroll', this.viewportHandler);
            this.viewportHandler = null;
        }

        this.isEditing = false;
        this.editingObject = null;
        this.activeEditor = null;
        this.activeToolbar = null;

        if (this.renderCallback) this.renderCallback();
    }

    draw(ctx, obj) {
        if (!obj.htmlContent) return;

        // If restored from localStorage, _cachedImage might be a plain object {} 
        // We must ensure it's a real HTMLImageElement.
        const isRealImage = obj._cachedImage instanceof HTMLImageElement;

        if (!isRealImage || obj._cachedHtml !== obj.htmlContent || obj._cachedWidth !== obj.width || obj._cachedHeight !== obj.height || obj._cachedSize !== obj.fontSize || obj._cachedColor !== obj.color) {
            this.generateCachedImage(obj);
        }

        if (obj._cachedImage && obj._imageLoaded && (obj._cachedImage instanceof HTMLImageElement) && obj._cachedImage.complete && obj._cachedImage.naturalWidth > 0) {
            // Draw slightly offset to compensate for potential sub-pixel differences or padding
            if (obj.width > 0 && obj.height > 0) {
                ctx.drawImage(obj._cachedImage, obj.x, obj.y, obj.width, obj.height);
            }
        } else {
            // Minimal fallback so it's not invisible
            ctx.save();
            ctx.fillStyle = obj.color;
            ctx.font = `${obj.fontSize}px sans-serif`;
            ctx.textBaseline = 'top';
            const temp = document.createElement('div');
            temp.innerHTML = obj.htmlContent;
            ctx.fillText(temp.innerText.substring(0, 50) + (temp.innerText.length > 50 ? '...' : ''), obj.x + 8, obj.y + 8); // Offset by padding
            ctx.restore();
        }
    }

    generateCachedImage(obj) {
        obj._cachedHtml = obj.htmlContent;
        obj._cachedWidth = obj.width;
        obj._cachedHeight = obj.height;
        obj._cachedSize = obj.fontSize;
        obj._cachedColor = obj.color;
        obj._imageLoaded = false;

        // Use a temporary div to sanitize and serialize the content
        const tempDiv = document.createElement('div');
        // We apply the styles directly to this div before serialization to avoid nesting
        // Note: We're using standard CSS checks.
        tempDiv.innerHTML = obj.htmlContent;

        // Match .rich-text-editor CSS exactly to ensure identical rendering
        tempDiv.style.cssText = `
            font-family: sans-serif;
            font-size: ${obj.fontSize}px;
            color: ${obj.color};
            word-wrap: break-word;
            white-space: pre-wrap;
            margin: 0;
            padding: 8px; /* Match CSS padding */
            line-height: 1.4; /* Match CSS line-height */
            display: block;
            width: 100%;
            height: 100%;
            overflow: hidden; /* Match CSS overflow */
            box-sizing: border-box; /* Match CSS box-sizing */
            overflow: hidden; /* Match CSS overflow */
            box-sizing: border-box; /* Match CSS box-sizing */
            background: transparent;
            text-align: ${obj.alignment || 'left'};
        `;

        // Ensure proper XML serialization
        const serializer = new XMLSerializer();
        const xmlContent = serializer.serializeToString(tempDiv);

        // Exact dimensions of the object as calculated from offsetWidth/Height
        const svgWidth = Math.ceil(obj.width);
        const svgHeight = Math.ceil(obj.height);

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml">
                        ${xmlContent}
                    </div>
                </foreignObject>
            </svg>
        `;

        const img = new Image();
        // Use data URL instead of blob URL to prevent canvas tainting
        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

        img.onload = () => {
            obj._cachedImage = img;
            obj._imageLoaded = true;
            if (this.renderCallback) this.renderCallback();
        };
        img.onerror = (e) => {
            console.warn("Text SVG render error", e);
            obj._imageLoaded = true;
            if (this.renderCallback) this.renderCallback();
        };
        img.src = svgDataUrl;
    }
}
