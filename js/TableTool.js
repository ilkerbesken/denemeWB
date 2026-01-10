class TableTool {
    constructor() {
        this.reset();
    }

    reset() {
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.isValidClick = false; // Initialize isValidClick
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        // Mark that we started a click interaction on the canvas
        // This prevents 'pointerleave' or random 'pointerup' events from triggering the tool
        this.isValidClick = true;
        return null;
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        // If we move too much, maybe invalidate click? 
        // For now, let's keep it simple.
        return false;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        // Only trigger if:
        // 1. It is a genuine 'pointerup' event (not 'pointerleave' etc)
        // 2. We actually started the click on the canvas (this.isValidClick)
        if (e.type !== 'pointerup' || !this.isValidClick) {
            this.isValidClick = false;
            return null;
        }

        this.isValidClick = false;

        // Check if we clicked on an existing table cell
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            if (obj.type === 'table') {
                if (pos.x >= obj.x && pos.x <= obj.x + obj.width &&
                    pos.y >= obj.y && pos.y <= obj.y + obj.height) {

                    // Find which cell was clicked
                    let currentY = obj.y;
                    for (let r = 0; r < obj.rows; r++) {
                        const rHeight = obj.rowHeights[r];
                        if (pos.y >= currentY && pos.y <= currentY + rHeight) {
                            let currentX = obj.x;
                            for (let c = 0; c < obj.cols; c++) {
                                const cWidth = obj.colWidths[c];
                                if (pos.x >= currentX && pos.x <= currentX + cWidth) {
                                    // Found the cell, start editing
                                    this.editCell(obj, r, c, canvas, window.app);
                                    return null; // Don't create a new table
                                }
                                currentX += cWidth;
                            }
                        }
                        currentY += rHeight;
                    }
                }
            }
        }

        // Show prompt to get row/col count       
        const rowCount = state.tableRows || 3;
        const colCount = state.tableCols || 3;
        const cellWidth = 100;
        const cellHeight = 40;

        // Use position from Up event
        const table = {
            type: 'table',
            x: pos.x,
            y: pos.y,
            rows: rowCount,
            cols: colCount,
            width: colCount * cellWidth,
            height: rowCount * cellHeight,
            rowHeights: Array(rowCount).fill(cellHeight),
            colWidths: Array(colCount).fill(cellWidth),
            data: Array(rowCount).fill(null).map(() => Array(colCount).fill("")),
            borderColor: state.strokeColor || '#000000',
            borderWidth: 0.5,
            backgroundColor: 'transparent',
            locked: false
        };

        return table;
    }

    editCell(obj, r, c, canvas, app) {
        if (obj.locked) return;

        const cellText = obj.data[r][c];

        // Create overlay editor
        const editor = document.createElement('div');
        editor.className = 'rich-text-editor table-cell-editor';
        editor.contentEditable = true;
        editor.innerHTML = cellText || "";

        // Calculate logical coordinates for the cell
        let relY = 0;
        for (let i = 0; i < r; i++) relY += obj.rowHeights[i];
        let relX = 0;
        for (let j = 0; j < c; j++) relX += obj.colWidths[j];

        const cWidth = obj.colWidths[c];
        const rHeight = obj.rowHeights[r];

        // Get page info
        const pageIndex = app.pageManager.currentPageIndex;
        const pageY = app.pageManager.getPageY(pageIndex);

        const absoluteX = obj.x + relX;
        const absoluteY = obj.y + relY + pageY;

        // Calculate Scale: Logical pixels to CSS pixels
        const logicalSize = app.canvasSettings.getLogicalSize();
        const logicalW = logicalSize.width;
        const cssW = canvas.clientWidth;
        const scaleFactor = (cssW > 0) ? (logicalW / cssW) : 1;

        // Apply zoom and pan in logical coordinates
        const logicScreenX = (absoluteX * app.zoomManager.zoom) + app.zoomManager.pan.x;
        const logicScreenY = (absoluteY * app.zoomManager.zoom) + app.zoomManager.pan.y;

        // Convert to actual screen (CSS) coordinates
        const screenX = (logicScreenX / scaleFactor) + canvas.offsetLeft;
        const screenY = (logicScreenY / scaleFactor) + canvas.offsetTop;
        const screenW = (cWidth * app.zoomManager.zoom) / scaleFactor;
        const screenH = (rHeight * app.zoomManager.zoom) / scaleFactor;

        editor.style.cssText = `
            position: absolute;
            left: ${screenX}px;
            top: ${screenY}px;
            width: ${screenW}px;
            height: ${screenH}px;
            font-size: ${(12 * app.zoomManager.zoom) / scaleFactor}px;
            font-family: sans-serif;
            padding: 2px 5px;
            margin: 0;
            border: 2px solid #2196f3;
            outline: none;
            overflow: hidden;
            background: ${(obj.backgroundColor && obj.backgroundColor !== 'transparent') ? obj.backgroundColor : '#ffffff'};
            color: black;
            z-index: 2000;
            box-sizing: border-box;
            display: flex;
            align-items: center;
        `;

        const container = canvas.parentElement;
        container.appendChild(editor);
        editor.focus();

        // Toolbar
        const toolbar = this.createToolbar(editor, screenX, screenY - 45, obj);
        container.appendChild(toolbar);

        // Real-time update
        editor.addEventListener('input', () => {
            obj.data[r][c] = editor.innerHTML;
            // Clear cache for this cell
            if (obj._cellCaches && obj._cellCaches[`${r},${c}`]) {
                delete obj._cellCaches[`${`${r},${c}`}`];
            }
        });

        // Auto-update and cleanup
        let isFinished = false;
        const finish = () => {
            if (isFinished) return;
            isFinished = true;

            obj.data[r][c] = editor.innerHTML;
            // Clear cache
            if (obj._cellCaches) delete obj._cellCaches[`${r},${c}`];

            app.history.saveState(app.state.objects);
            app.redrawOffscreen();
            app.render();

            if (editor.parentNode) editor.parentNode.removeChild(editor);
            if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
        };

        editor.addEventListener('blur', (e) => {
            // Check if focus moved to toolbar
            setTimeout(() => {
                if (document.activeElement !== editor && !toolbar.contains(document.activeElement)) {
                    finish();
                }
            }, 100);
        });

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                finish();
            }
            if (e.key === 'Escape') {
                if (isFinished) return;
                isFinished = true;
                obj.data[r][c] = cellText; // Revert
                if (editor.parentNode) editor.parentNode.removeChild(editor);
                if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
                app.render();
            }
            e.stopPropagation();
        });
    }

    createToolbar(editor, x, y, obj) {
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-text-toolbar';
        toolbar.style.left = `${Math.max(10, x)}px`;
        toolbar.style.top = `${Math.max(10, y)}px`;
        toolbar.style.zIndex = "3000";

        const buttons = [
            { icon: '<img src="assets/icons/text-bold.svg" class="icon">', command: 'bold', title: 'Kalın' },
            { icon: '<img src="assets/icons/text-italic.svg" class="icon">', command: 'italic', title: 'İtalik' },
            { icon: '<img src="assets/icons/text-underline.svg" class="icon">', command: 'underline', title: 'Altı Çizili' },
            { separator: true },
            { icon: '<img src="assets/icons/text-align-left.svg" class="icon">', command: 'justifyLeft', title: 'Sola Yasla' },
            { icon: '<img src="assets/icons/text-align-center.svg" class="icon">', command: 'justifyCenter', title: 'Ortala' },
            { icon: '<img src="assets/icons/text-align-right.svg" class="icon">', command: 'justifyRight', title: 'Sağa Yasla' }
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
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.execCommand(btn.command, false, null);
                editor.focus();
            };
            toolbar.appendChild(button);
        });

        // Color Picker (Simplified for table cells - or use same as text)
        const colorBtn = document.createElement('div');
        colorBtn.className = 'toolbar-color';
        colorBtn.title = 'Yazı Rengi';
        colorBtn.style.backgroundColor = '#000000';
        colorBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.app.colorPalette) {
                window.app.colorPalette.showColorPicker('#000000', (newColor) => {
                    colorBtn.style.backgroundColor = newColor;
                    document.execCommand('foreColor', false, newColor);
                    editor.focus();
                }, colorBtn, 'left');
            }
        };
        toolbar.appendChild(colorBtn);

        return toolbar;
    }

    draw(ctx, obj) {
        ctx.save();
        ctx.translate(obj.x, obj.y);

        const totalW = obj.colWidths.reduce((a, b) => a + b, 0);
        const totalH = obj.rowHeights.reduce((a, b) => a + b, 0);

        // Draw Background
        if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
            ctx.fillStyle = obj.backgroundColor;
            ctx.fillRect(0, 0, totalW, totalH);
        }

        // Setup Caches
        if (!obj._cellCaches) obj._cellCaches = {};

        // Draw Rows
        let currentY = 0;
        for (let r = 0; r < obj.rows; r++) {
            let currentX = 0;
            const rHeight = obj.rowHeights[r];

            for (let c = 0; c < obj.cols; c++) {
                const cWidth = obj.colWidths[c];

                // Draw Cell Border
                ctx.strokeStyle = obj.borderColor || '#000';
                ctx.lineWidth = obj.borderWidth || 1;
                ctx.strokeRect(currentX, currentY, cWidth, rHeight);

                // Draw Content
                const content = obj.data[r][c];
                if (content && content.trim() !== "") {
                    const cacheKey = `${r},${c}`;
                    const cache = obj._cellCaches[cacheKey];

                    if (cache && cache.html === content && cache.w === cWidth && cache.h === rHeight &&
                        cache.img && cache.loaded && cache.img.complete && cache.img.naturalWidth > 0) {
                        ctx.drawImage(cache.img, currentX, currentY, cWidth, rHeight);
                    } else {
                        // Generate Cache
                        this.generateCellCache(obj, r, c, cWidth, rHeight);
                        // Draw placeholder or fallback text while loading
                        ctx.fillStyle = '#888';
                        ctx.font = '10px sans-serif';
                        // Minimal fallback
                    }
                }

                currentX += cWidth;
            }
            currentY += rHeight;
        }

        ctx.restore();
    }

    generateCellCache(obj, r, c, w, h) {
        const cacheKey = `${r},${c}`;
        const content = obj.data[r][c];

        if (!obj._cellCaches) obj._cellCaches = {};

        const cache = {
            html: content,
            w: w,
            h: h,
            img: new Image(),
            loaded: false
        };
        obj._cellCaches[cacheKey] = cache;

        const svgW = Math.ceil(w);
        const svgH = Math.ceil(h);

        // Standardize content for SVG
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="
                        font-family: sans-serif;
                        font-size: 12px;
                        color: black;
                        width: ${svgW}px;
                        height: ${svgH}px;
                        display: flex;
                        align-items: center;
                        padding: 2px 5px;
                        box-sizing: border-box;
                        overflow: hidden;
                        line-height: 1.2;
                    ">
                        <div>${content}</div>
                    </div>
                </foreignObject>
            </svg>
        `;

        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        cache.img.onload = () => {
            cache.loaded = true;
            URL.revokeObjectURL(url);
            if (window.app) {
                window.app.redrawOffscreen();
                window.app.render();
            }
        };
        cache.img.onerror = () => {
            URL.revokeObjectURL(url);
            cache.loaded = true;
        };
        cache.img.src = url;
    }

    drawPreview(ctx, obj) {
        // Not used currently as we create instantly
    }
}
