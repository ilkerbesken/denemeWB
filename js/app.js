class WhiteboardApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { desynchronized: true }); // Performance tip for drawing

        // Offscreen canvas for layered rendering (Performance optimization)
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // Canvas ayarları
        this.canvasSettings = new CanvasSettings();

        // Durum
        this.state = {
            currentTool: 'pen',
            strokeColor: '#000000',
            strokeWidth: 4,
            lineStyle: 'solid',
            opacity: 1.0,
            pressureEnabled: true, // Default: Active for pen tool
            highlighterCap: 'round', // 'round' or 'butt'
            arrowStartStyle: 'none', // 'none', 'triangle', 'line', 'circle', 'square', 'bar'
            arrowEndStyle: 'triangle', // 'none', 'triangle', 'line', 'circle', 'square', 'bar'
            arrowPathType: 'straight', // 'straight', 'curved', 'elbow'
            eraserMode: 'object', // 'object', 'partial'
            stabilization: 0.5, // 0.0 to 1.0 (corresponds to 0-100% slider)
            decimation: 0.10, // Default 10% of width
            fillEnabled: false, // Live fill toggle
            objects: []
        };

        this.zoomManager = new ZoomManager(this);
        this.fillManager = new FillManager();

        // Araçlar
        const shapeTool = new ShapeTool(() => this.render());
        this.tools = {
            pen: new PenTool(() => this.render()),
            highlighter: new PenTool(() => this.render()), // Re-use PenTool
            line: new LineTool(),
            rectangle: shapeTool,
            ellipse: shapeTool,
            triangle: shapeTool,
            trapezoid: shapeTool,
            star: shapeTool,
            diamond: shapeTool,
            parallelogram: shapeTool,
            oval: shapeTool,
            heart: shapeTool,
            cloud: shapeTool,
            shape: shapeTool,
            arrow: new ArrowTool(),

            eraser: new EraserTool(),
            hand: new HandTool(this.zoomManager),
            select: new SelectTool()
        };

        this.colorPalette = new ColorPalette(this);
        this.propertiesSidebar = new PropertiesSidebar(this);

        this.history = new HistoryManager();
        this.currentMousePos = { x: 0, y: 0 };
        this.isSpacePressed = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.setupCanvasModal();

        // Initialize UI for default tool
        this.propertiesSidebar.updateUIForTool(this.state.currentTool);

        // Initial draw
        this.redrawOffscreen();
        this.render();

        // Range Slider Progress Sync (Pure CSS progress bars are tricky, so we use a CSS variable)
        const updateRangeProgress = (input) => {
            const percent = (input.value - input.min) / (input.max - input.min) * 100;
            input.style.setProperty('--value', percent + '%');
        };

        document.querySelectorAll('input[type="range"]').forEach(input => {
            updateRangeProgress(input);
            input.addEventListener('input', () => updateRangeProgress(input));
        });

        // Expose to window for PropertiesSidebar to use during manual sync
        window.updateRangeProgress = updateRangeProgress;
    }

    setupCanvas() {
        // İlk tuval ayarlarını uygula
        this.canvasSettings.applySettings(this.canvas, this.ctx);

        // Offscreen canvas should perfectly match the main canvas dimensions and scale
        this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx, this.canvas);

        window.addEventListener('resize', () => {
            const oldObjects = [...this.state.objects];

            // Re-apply settings to main
            this.canvasSettings.applySettings(this.canvas, this.ctx);

            // Re-sync offscreen
            this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx, this.canvas);

            this.state.objects = oldObjects;
            this.redrawOffscreen();
            this.render();
        });
    }

    /**
     * Set the active tool and update all related UI elements (icons, active classes, properties)
     */
    setTool(tool) {
        this.state.currentTool = tool;

        const shapeTypes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
        const isShape = shapeTypes.includes(tool);

        if (isShape) {
            this.state.currentShapeType = tool;
        }

        const shapePickerBtn = document.getElementById('shapePickerBtn');

        // 1. Reset all active states in main toolbar
        document.querySelectorAll('.toolbar .tool-btn[data-tool], #shapePickerBtn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 2. Map tool selection to DOM updates
        const toolBtn = document.querySelector(`.toolbar .tool-btn[data-tool="${tool}"]`);

        if (isShape && shapePickerBtn) {
            shapePickerBtn.classList.add('active');
        } else if (toolBtn) {
            toolBtn.classList.add('active');
        }

        // --- Context & Sidebar Sync ---
        if (this.propertiesSidebar) {
            this.propertiesSidebar.updateUIForTool(tool);
        }

        // --- Cursor Sync ---
        if (tool === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'select') {
            this.canvas.style.cursor = 'default';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }

        this.updateStatus();
    }

    setupCanvasModal() {
        const panel = document.getElementById('canvasSettingsPanel');
        const openBtn = document.getElementById('canvasSettingsBtn');
        const applyBtn = document.getElementById('applySettingsBtn');

        // Panel aç/kapat
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.canvasSettings.togglePanel();
            if (this.canvasSettings.isPanelOpen) {
                this.canvasSettings.loadSettingsToPanel();
                if (this.propertiesSidebar) {
                    this.propertiesSidebar.hide();
                }
            } else {
                // If closing settings, maybe show sidebar again? 
                // The user said "until a tool is clicked", but usually 
                // you'd want it back if you close the panel. 
                // Let's stick strictly to "until a tool is clicked" for now.
            }
        });

        // Ayarları uygula
        applyBtn.addEventListener('click', () => {
            // Ayarları kaydet
            this.canvasSettings.settings = {
                size: document.getElementById('canvasSizeSelect').value,
                orientation: document.querySelector('input[name="orientation"]:checked').value,
                backgroundColor: document.querySelector('.color-option-small.active').dataset.color,
                pattern: document.querySelector('.pattern-btn.active').dataset.pattern
            };

            // Yeni ayarları uygula
            this.canvasSettings.applySettings(this.canvas, this.ctx);

            // Sync offscreen and its background
            this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx, this.canvas);

            // Nesneleri yeniden çiz
            this.redrawOffscreen();
            this.render();

            // Panel'i kapat
            this.canvasSettings.togglePanel();

            // Durum güncelle
            this.updateStatus();
        });

        // Renk seçimi
        document.querySelectorAll('.color-option-small').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option-small').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Desen seçimi
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Pointer events (fare ve dokunmatik için)
        const opts = { passive: false };

        // Aggressive touchstart suppression to prevent iPad gesture engine from starting
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
        }, opts);

        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.cancelable) e.preventDefault();
            this.handlePointerDown(e);
        }, opts);
        this.canvas.addEventListener('pointermove', (e) => {
            if (e.cancelable) e.preventDefault();
            this.handlePointerMove(e);
        }, opts);
        this.canvas.addEventListener('pointerup', (e) => {
            if (e.cancelable) e.preventDefault();
            this.handlePointerUp(e);
        }, opts);
        this.canvas.addEventListener('pointerleave', (e) => {
            if (e.cancelable) e.preventDefault();
            this.handlePointerUp(e);
        }, opts);
        this.canvas.addEventListener('pointercancel', (e) => {
            if (e.cancelable) e.preventDefault();
            this.handlePointerUp(e);
        }, opts);

        // Klavye kısayolları
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse pozisyonunu takip et (App.js handles pointermove, but we can update state here if needed)
        // Redundant mousemove removed to unify in pointermove

        // Context menu (sağ tık)
        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.state.currentTool === 'select') {
                const handled = this.tools.select.handleContextMenu(e, this.canvas, this.state);
                if (handled) {
                    e.preventDefault();
                }
            }
        });

        // Context menu dışına tıklama
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('contextMenu');
            if (menu && !menu.contains(e.target)) {
                this.tools.select.hideContextMenu();
            }
        });

        // Context menu seçenekleri
        this.setupContextMenu();
    }

    setupToolbar() {
        // Shape Picker Logic (Now just activates current shape tool)
        const shapePickerBtn = document.getElementById('shapePickerBtn');
        if (shapePickerBtn) {
            shapePickerBtn.addEventListener('click', (e) => {
                const currentShape = this.state.currentShapeType || 'rectangle';

                // Check if current tool is a shape tool or effectively the current shape
                const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                const isShapeActive = shapes.includes(this.state.currentTool);

                // If we are already on a shape tool, simply toggle sidebar
                if (isShapeActive) {
                    this.propertiesSidebar.toggle();
                } else {
                    this.setTool(currentShape);
                }
            });
        }

        // Araç butonları (Excluding shape picker to avoid double events)
        document.querySelectorAll('.tool-btn[data-tool]:not(#shapePickerBtn)').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (this.state.currentTool === tool) {
                    this.propertiesSidebar.toggle();
                } else {
                    this.setTool(tool);
                }
            });
        });

        // Temizle
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.history.saveState(this.state.objects);
            this.state.objects = [];
            this.redrawOffscreen();
            this.render();
        });

        // Geri al
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });

        // İleri al
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });

        // Basınç Hassasiyeti - Handled in PropertiesSidebar.js
        // Çizgi Stili - Handled in PropertiesSidebar.js
    }

    setupContextMenu() {
        const menuItems = document.querySelectorAll('.context-menu-item');

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                const selectTool = this.tools.select;

                // History kaydet (değişiklik yapan işlemler için)
                if (['delete', 'duplicate', 'cut', 'flipHorizontal', 'flipVertical', 'bringToFront', 'bringForward', 'sendBackward', 'sendToBack', 'group', 'ungroup'].includes(action)) {
                    this.history.saveState(this.state.objects);
                }

                let result = null;

                switch (action) {
                    case 'cut':
                        selectTool.cutSelected(this.state);
                        break;
                    case 'copy':
                        selectTool.copySelected(this.state);
                        break;
                    case 'paste':
                        result = selectTool.paste(this.state);
                        if (result) {
                            if (Array.isArray(result)) {
                                this.state.objects.push(...result);
                            } else {
                                this.state.objects.push(result);
                            }
                        }
                        break;
                    case 'delete':
                        result = selectTool.deleteSelected(this.state);
                        break;
                    case 'applyColor':
                        selectTool.updateSelectedObjectsStyle(this.state, {
                            color: this.state.strokeColor,
                            strokeColor: this.state.strokeColor,
                            fillColor: this.state.fillEnabled ? this.state.strokeColor : 'transparent'
                        });
                        break;
                    case 'changeBorderColor':
                        selectTool.updateSelectedObjectsStyle(this.state, {
                            color: this.state.strokeColor,
                            strokeColor: this.state.strokeColor,
                            stayFillColor: true
                        });
                        break;
                    case 'duplicate':
                        selectTool.duplicateSelected(this.state);
                        break;
                    case 'flipHorizontal':
                        selectTool.flipHorizontal(this.state);
                        break;
                    case 'flipVertical':
                        selectTool.flipVertical(this.state);
                        break;
                    case 'bringToFront':
                        selectTool.bringToFront(this.state);
                        break;
                    case 'bringForward':
                        selectTool.bringForward(this.state);
                        break;
                    case 'sendBackward':
                        selectTool.sendBackward(this.state);
                        break;
                    case 'sendToBack':
                        selectTool.sendToBack(this.state);
                        break;
                    case 'group':
                        selectTool.groupSelected(this.state);
                        break;
                    case 'ungroup':
                        selectTool.ungroupSelected(this.state);
                        break;
                }

                // Menüyü kapat
                selectTool.hideContextMenu();

                // Canvas'ı yeniden çiz
                this.redrawOffscreen();
                this.render();
            });
        });
    }


    handlePointerDown(e) {
        if (this.isSpacePressed) {
            this.zoomManager.startPan(e);
            return;
        }

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const worldPos = this.zoomManager.getPointerWorldPos(e);

        // Save state for tools that modify state.objects immediately or via move (Eraser/Select)
        if (this.state.currentTool === 'eraser') {
            this.history.saveState(this.state.objects);
        } else if (this.state.currentTool === 'select' && tool.selectedObjects.length > 0) {
            const clickPoint = { x: worldPos.x, y: worldPos.y };
            const selectedIndex = tool.selectedObjects[0];
            const selectedObj = this.state.objects[selectedIndex];

            if (selectedObj && tool.isNearObject(selectedObj, clickPoint)) {
                // Sürükleme başlayacak, history kaydet
                this.history.saveState(this.state.objects);
            }
        }

        tool.handlePointerDown(e, worldPos, this.canvas, this.ctx, this.state);

        // Update properties sidebar if selection might have changed
        if (this.state.currentTool === 'select') {
            this.propertiesSidebar.updateUIForTool('select');
        }

        this.render();
    }

    handlePointerMove(e) {
        if (this.zoomManager.isPanning) {
            this.zoomManager.updatePan(e);
            return;
        }

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const worldPos = this.zoomManager.getPointerWorldPos(e);
        const beforeCount = this.state.objects.length;
        const needsRedraw = tool.handlePointerMove(e, worldPos, this.canvas, this.ctx, this.state);
        const afterCount = this.state.objects.length;

        // Mouse pozisyonunu her harekette güncelle
        this.currentMousePos = { x: e.offsetX, y: e.offsetY };

        if (needsRedraw || beforeCount !== afterCount || this.state.currentTool === 'eraser') {
            // Optimization & Logic Fix:
            // If SelectTool is dragging/resizing, it modifies state.objects in-place.
            // We must update the offscreen canvas to reflect these changes.
            if (this.state.currentTool === 'select') {
                if (tool.isDragging || tool.activeHandle) {
                    this.redrawOffscreen();
                }
            }

            // Fix for Eraser: If something was modified or count changed, we MUST redraw offscreen
            if (this.state.currentTool === 'eraser' && (needsRedraw || beforeCount !== afterCount)) {
                this.redrawOffscreen();
            } else if (beforeCount !== afterCount) {
                this.redrawOffscreen();
            }

            this.render();
        }
    }

    handlePointerUp(e) {
        if (this.zoomManager.isPanning) {
            this.zoomManager.endPan();
            // Restore cursor based on space key and current tool
            if (this.isSpacePressed) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.setTool(this.state.currentTool); // Use setTool to restore correct cursor
            }
            return;
        }

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const worldPos = this.zoomManager.getPointerWorldPos(e);
        const completedObject = tool.handlePointerUp(e, worldPos, this.canvas, this.ctx, this.state);

        if (completedObject) {
            // 1. SAVE STATE BEFORE ADDING (to allow undo to previous state)
            this.history.saveState(this.state.objects);

            // 2. IF AUTO-STRAIGHTENED, INJECT INTERMEDIATE STATE
            if (completedObject.isStraightened && completedObject.originalPoints) {
                // To allow undo back to squiggly:
                // We need a state that has all current objects PLUS the squiggly one
                const freehandObj = JSON.parse(JSON.stringify(completedObject));
                freehandObj.points = completedObject.originalPoints;
                freehandObj.isStraightened = false;
                delete freehandObj.originalPoints;

                const intermediateObjects = JSON.parse(JSON.stringify(this.state.objects));
                if (completedObject.isHighlighter) {
                    intermediateObjects.unshift(freehandObj);
                } else {
                    intermediateObjects.push(freehandObj);
                }

                // Save the intermediate (squiggly) state to the undo stack
                this.history.saveState(intermediateObjects);
            }

            // 3. ADD THE FINAL OBJECT TO REAL STATE
            if (completedObject.isHighlighter) {
                this.state.objects.unshift(completedObject);
            } else {
                this.state.objects.push(completedObject);
            }

            this.redrawOffscreen();
        }

        // Update properties sidebar if selection might have changed (e.g. drag selection finished)
        if (this.state.currentTool === 'select') {
            this.propertiesSidebar.updateUIForTool('select');
        }

        this.render();
    }

    handleKeyDown(e) {
        if (e.repeat) return;

        if (e.code === 'Space') {
            this.isSpacePressed = true;
            if (!this.zoomManager.isPanning) {
                this.canvas.style.cursor = 'grab';
            }
            return;
        }

        // Clipboard kısayolları (sadece select tool aktifken)
        if (this.state.currentTool === 'select') {
            const selectTool = this.tools.select;

            // Ctrl+C - Kopyala
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                selectTool.copySelected(this.state);
                return;
            }

            // Ctrl+V - Yapıştır
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                const pastedResult = selectTool.paste(this.state);
                if (pastedResult) {
                    this.history.saveState(this.state.objects);
                    if (Array.isArray(pastedResult)) {
                        this.state.objects.push(...pastedResult);
                    } else {
                        this.state.objects.push(pastedResult);
                    }
                    this.redrawOffscreen();
                    this.render();
                }
                return;
            }

            // Ctrl+X - Kes
            if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.cutSelected(this.state);
                this.redrawOffscreen();
                this.render();
                return;
            }

            // Ctrl+D - Çoğalt
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                const duplicateResult = selectTool.duplicateSelected(this.state);
                if (duplicateResult) {
                    this.history.saveState(this.state.objects);
                    if (Array.isArray(duplicateResult)) {
                        this.state.objects.push(...duplicateResult);
                    } else {
                        this.state.objects.push(duplicateResult);
                    }
                    this.redrawOffscreen();
                    this.render();
                }
                return;
            }

            // Delete - Sil
            if (e.key === 'Delete') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.deleteSelected(this.state);
                this.redrawOffscreen();
                this.render();
                return;
            }
        }

        // Geri al (Ctrl+Z)
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
        }

        // İleri al (Ctrl+Y)
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.redo();
        }

        // Araç kısayolları
        const toolShortcuts = {
            'p': 'pen',
            'l': 'arrow',  // Changed from 'line' to 'arrow' (arrow tool is now the line tool)
            'r': 'rectangle',
            'e': 'ellipse',
            'x': 'eraser',
            'v': 'select',
            'c': 'settings'
        };

        if (toolShortcuts[e.key.toLowerCase()]) {
            e.preventDefault();

            if (e.key.toLowerCase() === 'c') {
                this.canvasSettings.togglePanel();
                if (this.canvasSettings.isPanelOpen) {
                    this.canvasSettings.loadSettingsToPanel();
                }
            } else {
                this.setTool(toolShortcuts[e.key.toLowerCase()]);
            }
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            if (!this.zoomManager.isPanning) {
                // Restore tool cursor
                this.setTool(this.state.currentTool);
            }
        }
    }

    undo() {
        const previousState = this.history.undo(this.state.objects);
        if (previousState) {
            this.state.objects = previousState;
            this.redrawOffscreen();
            this.render();
        }
    }

    redo() {
        const nextState = this.history.redo(this.state.objects);
        if (nextState) {
            this.state.objects = nextState;
            this.redrawOffscreen();
            this.render();
        }
    }

    redrawOffscreen() {
        // Redraw offscreen cache with High-DPI support, synced to main canvas
        this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx, this.canvas);

        // Render all permanent objects to the offscreen canvas
        this.offscreenCtx.save();

        // Transformation (Relative to logical coordinate system)
        this.offscreenCtx.translate(this.zoomManager.pan.x, this.zoomManager.pan.y);
        this.offscreenCtx.scale(this.zoomManager.zoom, this.zoomManager.zoom);

        this.state.objects.forEach(obj => {
            this.drawObject(this.offscreenCtx, obj);
        });

        this.offscreenCtx.restore();
    }

    render() {
        // Fast Render Loop
        const dpr = window.devicePixelRatio || 1;
        const logicalW = this.canvas.clientWidth;
        const logicalH = this.canvas.clientHeight;

        // 1. Clear Screen (using logical bounds)
        this.ctx.clearRect(0, 0, logicalW, logicalH);

        // 2. Draw Static Cache (Offscreen)
        // Draw the full high-res offscreen buffer into the logical bounds
        this.ctx.imageSmoothingEnabled = false; // Keep vector edges crisp
        this.ctx.drawImage(this.offscreenCanvas, 0, 0, logicalW, logicalH);
        this.ctx.imageSmoothingEnabled = true;

        this.ctx.save();

        // Apply Zoom & Pan for dynamic elements (In logical coordinates)
        this.ctx.translate(this.zoomManager.pan.x, this.zoomManager.pan.y);
        this.ctx.scale(this.zoomManager.zoom, this.zoomManager.zoom);

        // 4. Draw Active/Preview Tools (Dynamic content)
        const currentTool = this.tools[this.state.currentTool];
        let needsNextFrame = false;

        if (currentTool.isDrawing && currentTool.currentPath) {
            // Live Fill Rendering
            if (currentTool.currentPath.filled && this.fillManager) {
                this.fillManager.drawFill(this.ctx, currentTool.currentPath);
            }
            currentTool.drawPreview(this.ctx, currentTool.currentPath);
        } else if (currentTool.isDrawing && currentTool.currentLine) {
            currentTool.drawPreview(this.ctx, currentTool.currentLine);
        } else if (currentTool.isDrawing && currentTool.currentShape) {
            currentTool.drawPreview(this.ctx, currentTool.currentShape);
        } else if (currentTool.isDrawing && currentTool.currentArrow) {
            currentTool.drawPreview(this.ctx, currentTool.currentArrow);
        } else if (this.state.currentTool === 'eraser' && currentTool.currentTrail) {
            // Eraser trail can exist even if not currently erasing (fading)
            if (currentTool.drawPreview(this.ctx)) {
                needsNextFrame = true;
            }
        }

        // Request next frame if an animation (like eraser trail fade) is active
        if (needsNextFrame) {
            requestAnimationFrame(() => this.render());
        }

        // Silgi imleci - World Coordinates
        if (this.state.currentTool === 'eraser' && currentTool.drawCursor) {
            // Mouse pos is screen, convert to world
            const worldPos = this.zoomManager.getPointerWorldPos({
                offsetX: this.currentMousePos.x,
                offsetY: this.currentMousePos.y
            });
            currentTool.drawCursor(this.ctx, worldPos.x, worldPos.y, this.state);
        }

        // Seçim gösterimi
        if (this.state.currentTool === 'select') {
            currentTool.drawSelection(this.ctx, this.state, this.zoomManager.zoom);
        }

        this.ctx.restore();

        this.updateStatus();
    }

    drawObject(ctx, obj) {
        if (obj.type === 'group') {
            obj.children.forEach(child => this.drawObject(ctx, child));
        } else {
            // Fill pass for closed pen paths
            if ((obj.type === 'pen' || obj.type === 'highlighter') && obj.filled && this.fillManager) {
                this.fillManager.drawFill(ctx, obj);
            }

            const tool = this.tools[obj.type];
            if (tool) {
                tool.draw(ctx, obj);
            }
        }
    }

    updateStatus() {
        const toolNames = {
            pen: 'Kalem',
            line: 'Çizgi',
            rectangle: 'Dikdörtgen',
            ellipse: 'Elips',
            triangle: 'Üçgen',
            trapezoid: 'Yamuk',
            star: 'Yıldız',
            diamond: 'Karo',
            parallelogram: 'Paralel Kenar',
            oval: 'Oval',
            heart: 'Kalp',
            cloud: 'Bulut',
            arrow: 'Ok',
            eraser: 'Silgi',
            hand: 'El',
            select: 'Seç',
            highlighter: 'Vurgulayıcı'
        };

        document.getElementById('toolInfo').textContent =
            `Aktif Araç: ${toolNames[this.state.currentTool]}`;

        document.getElementById('objectCount').textContent =
            `Nesneler: ${this.state.objects.length}`;

        document.getElementById('canvasSize').textContent =
            `Tuval: ${this.canvasSettings.getSizeLabel()}`;

        document.getElementById('cursorPos').textContent =
            `X: ${Math.round(this.currentMousePos.x)}, Y: ${Math.round(this.currentMousePos.y)}`;
    }
}

// Uygulamayı başlat
const app = new WhiteboardApp();
