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
            objects: []
        };

        this.zoomManager = new ZoomManager(this);

        // Araçlar
        this.tools = {
            pen: new PenTool(() => this.render()),
            highlighter: new PenTool(() => this.render()), // Re-use PenTool
            line: new LineTool(),
            rectangle: new RectangleTool(),
            ellipse: new EllipseTool(),
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

        // Initial draw
        this.redrawOffscreen();
        this.render();
    }

    setupCanvas() {
        // İlk tuval ayarlarını uygula
        this.canvasSettings.applySettings(this.canvas, this.ctx);

        // Offscreen canvas boyutlarını eşle
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;

        // Offscreen settings
        this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx);

        window.addEventListener('resize', () => {
            const oldObjects = [...this.state.objects];
            this.canvasSettings.applySettings(this.canvas, this.ctx);

            // Resize handler for offscreen
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
            this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx);

            this.state.objects = oldObjects;
            this.redrawOffscreen();
            this.render();
        });
    }

    // Assuming setTool is a method that updates the current tool and its UI.
    // This method is not explicitly defined in the provided document,
    // but the instruction implies its existence and purpose.
    setTool(tool) {
        this.state.currentTool = tool;
        // Logic for showing/hiding settings panels based on the tool
        // This part is typically handled by a PropertiesSidebar or similar UI manager.
        // For the purpose of this edit, we'll simulate the logic here.
        const highlighterSettings = document.getElementById('highlighterSettings');
        const arrowSettings = document.getElementById('arrowSettings');
        const arrowPathSettings = document.getElementById('arrowPathSettings');
        const eraserSettings = document.getElementById('eraserSettings');

        // Assuming these elements exist and are managed by a sidebar or similar.
        // The original instruction snippet was placed incorrectly in setupCanvasModal,
        // but the logic itself is for tool-specific UI visibility.
        if (highlighterSettings) {
            highlighterSettings.style.display = tool === 'highlighter' ? 'flex' : 'none';
        }
        if (arrowSettings) {
            arrowSettings.style.display = tool === 'arrow' ? 'flex' : 'none';
        }
        if (arrowPathSettings) {
            arrowPathSettings.style.display = tool === 'arrow' ? 'flex' : 'none';
        }
        if (eraserSettings) {
            eraserSettings.style.display = tool === 'eraser' ? 'flex' : 'none';
        }

        // Other UI updates would typically go here or be delegated to propertiesSidebar.updateUIForTool(tool);
    }

    setupCanvasModal() {
        const panel = document.getElementById('canvasSettingsPanel');
        const openBtn = document.getElementById('canvasSettingsBtn');
        const applyBtn = document.getElementById('applySettingsBtn');

        // Panel aç/kapat
        openBtn.addEventListener('click', () => {
            this.canvasSettings.togglePanel();
            if (this.canvasSettings.isPanelOpen) {
                this.canvasSettings.loadSettingsToPanel();
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

            // Sync offscreen size BEFORE applying settings
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;

            this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx);

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
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.canvas.addEventListener('pointerleave', (e) => this.handlePointerUp(e));

        // Klavye kısayolları
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse pozisyonunu takip et
        this.canvas.addEventListener('mousemove', (e) => {
            this.currentMousePos = { x: e.offsetX, y: e.offsetY };
            this.updateStatus();
        });

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
        // Araç butonları
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);

                // Update UI for the selected tool (opacity, pressure, etc.)
                this.propertiesSidebar.updateUIForTool(tool);

                // Aktif buton görünümü
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
                    b.classList.remove('active')
                );
                btn.classList.add('active');
            });
        });

        // Highlighter Cap Settings
        document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cap = btn.dataset.highlighterCap;
                this.state.highlighterCap = cap;

                // Update UI
                document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });


        // Opaklık Slider
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.state.opacity = val / 100;

            // Eğer seçili nesne varsa opaklığını değiştir
            // SelectTool logic handles styling.
            if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.length > 0) {
                this.tools.select.updateSelectedObjectsStyle(this.state, { opacity: this.state.opacity });
                this.redrawOffscreen();
                this.render();
            }
        });

        document.getElementById('opacitySlider').addEventListener('change', (e) => {
            // Save history on release
            if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.length > 0) {
                this.history.saveState(this.state.objects);
            }
        });

        // Kalınlık
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.state.strokeWidth = parseInt(e.target.value);

            // Eğer seçili nesne varsa kalınlığını değiştir
            if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.length > 0) {
                this.tools.select.updateSelectedObjectsStyle(this.state, { width: this.state.strokeWidth });
                this.redrawOffscreen();
                this.render();
            }
        });

        // Kalınlık seçimi tamamlandığında history kaydet
        document.getElementById('strokeWidth').addEventListener('change', (e) => {
            if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.length > 0) {
                this.history.saveState(this.state.objects);
            }
        });

        // Temizle
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Tüm çizimleri temizlemek istediğinizden emin misiniz?')) {
                this.history.saveState(this.state.objects);
                this.state.objects = [];
                this.redrawOffscreen();
                this.render();
            }
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

        // Çizgi Stili
        document.querySelectorAll('.tool-btn[data-linestyle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.linestyle;
                this.state.lineStyle = style;

                // UI Güncelle
                document.querySelectorAll('.tool-btn[data-linestyle]').forEach(b =>
                    b.classList.remove('active')
                );
                btn.classList.add('active');

                // Eğer seçili nesne varsa stilini değiştir
                if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.length > 0) {
                    this.tools.select.updateSelectedObjectsStyle(this.state, { lineStyle: style });
                    this.redrawOffscreen();
                    this.render();
                    this.history.saveState(this.state.objects);
                }
            });
        });
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
                        // deleteSelected now removes from state internally and checks
                        // Returns deleted items for undo history? logic might differ.
                        // Wait, deleteSelected in SelectTool ALREADY splices from state.
                        // So we don't need to do anything here except for history saving which is done above.
                        // result return value is just for confirmation?
                        result = selectTool.deleteSelected(this.state);
                        break;
                    case 'duplicate':
                        result = selectTool.duplicateSelected(this.state);
                        if (result) {
                            if (Array.isArray(result)) {
                                this.state.objects.push(...result);
                            } else {
                                this.state.objects.push(result);
                            }
                        }
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
                        result = selectTool.groupSelected(this.state);
                        if (result) {
                            this.state.objects.push(result);
                        }
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

    setTool(toolName) {
        this.state.currentTool = toolName;

        // Canvas imleç stili
        if (toolName === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else if (toolName === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else if (toolName === 'select') {
            this.canvas.style.cursor = 'default';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }

        this.updateStatus();
    }

    handlePointerDown(e) {
        if (this.isSpacePressed) {
            this.zoomManager.startPan(e);
            return;
        }

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const worldPos = this.zoomManager.getPointerWorldPos(e);

        // Seç aracı için sürükleme başlamadan önce history kaydet
        if (this.state.currentTool === 'select' && tool.selectedObjects.length > 0) {
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

        if (needsRedraw || beforeCount !== afterCount) {
            // Optimization & Logic Fix:
            // If SelectTool is dragging/resizing, it modifies state.objects in-place.
            // We must update the offscreen canvas to reflect these changes.
            if (this.state.currentTool === 'select') {
                if (tool.isDragging || tool.activeHandle) {
                    this.redrawOffscreen();
                }
            }

            // Fix for Eraser: If objects were removed, we MUST redraw offscreen
            if (beforeCount !== afterCount) {
                this.redrawOffscreen();
            }

            this.render();
        }
    }

    handlePointerUp(e) {
        if (this.zoomManager.isPanning) {
            this.zoomManager.endPan();
            // Restore cursor based on space key
            this.canvas.style.cursor = this.isSpacePressed ? 'grab' : (this.state.currentTool === 'eraser' ? 'crosshair' : (this.state.currentTool === 'select' ? 'default' : 'crosshair'));
            return;
        }

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const worldPos = this.zoomManager.getPointerWorldPos(e);
        const completedObject = tool.handlePointerUp(e, worldPos, this.canvas, this.ctx, this.state);

        if (completedObject) {
            this.history.saveState(this.state.objects); // Save State 1 (Before Stroke)

            if (completedObject.isStraightened && completedObject.originalPoints) {
                // Auto-straightened object: Inject Freehand state
                const freehandObj = JSON.parse(JSON.stringify(completedObject));
                freehandObj.points = completedObject.originalPoints;
                freehandObj.isStraightened = false;
                delete freehandObj.originalPoints;
                this.state.objects.push(freehandObj);
                this.history.saveState(this.state.objects);
                this.state.objects.pop();
            }

            if (completedObject.isHighlighter) {
                this.state.objects.unshift(completedObject);
                this.redrawOffscreen();
            } else {
                this.state.objects.push(completedObject);
                this.drawObject(this.offscreenCtx, completedObject);
            }
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

                // Buton görünümünü güncelle
                document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
                    btn.classList.toggle('active',
                        btn.dataset.tool === toolShortcuts[e.key.toLowerCase()]
                    );
                });
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
        // Render all permanent objects to the offscreen canvas
        // This is expensive but only happens on state changes (not every mouse move)
        this.canvasSettings.drawBackground(this.offscreenCanvas, this.offscreenCtx);

        this.state.objects.forEach(obj => {
            this.drawObject(this.offscreenCtx, obj);
        });
    }

    render() {
        // Fast Render Loop
        // 1. Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Apply Zoom & Pan
        this.ctx.translate(this.zoomManager.pan.x, this.zoomManager.pan.y);
        this.ctx.scale(this.zoomManager.zoom, this.zoomManager.zoom);

        // 2. Draw Background (Infinite Pattern)
        const visibleBounds = {
            x: -this.zoomManager.pan.x / this.zoomManager.zoom,
            y: -this.zoomManager.pan.y / this.zoomManager.zoom,
            width: this.canvas.width / this.zoomManager.zoom,
            height: this.canvas.height / this.zoomManager.zoom
        };
        this.canvasSettings.drawBackground(this.canvas, this.ctx, visibleBounds);

        // 3. Draw All Objects (Vector Mode)
        // We bypass offscreenCanvas to support crisp zoom
        this.state.objects.forEach(obj => {
            this.drawObject(this.ctx, obj);
        });

        // 4. Draw Active/Preview Tools (Dynamic content)
        const currentTool = this.tools[this.state.currentTool];
        if (currentTool.isDrawing && currentTool.currentPath) {
            currentTool.drawPreview(this.ctx, currentTool.currentPath);
        } else if (currentTool.isDrawing && currentTool.currentLine) {
            currentTool.drawPreview(this.ctx, currentTool.currentLine);
        } else if (currentTool.isDrawing && currentTool.currentRect) {
            currentTool.drawPreview(this.ctx, currentTool.currentRect);
        } else if (currentTool.isDrawing && currentTool.currentEllipse) {
            currentTool.drawPreview(this.ctx, currentTool.currentEllipse);
        } else if (currentTool.isDrawing && currentTool.currentArrow) {
            currentTool.drawPreview(this.ctx, currentTool.currentArrow);
        }

        // Silgi imleci - World Coordinates
        if (this.state.currentTool === 'eraser' && currentTool.drawCursor) {
            // Mouse pos is screen, convert to world
            const worldPos = this.zoomManager.getPointerWorldPos({
                offsetX: this.currentMousePos.x,
                offsetY: this.currentMousePos.y
            });
            currentTool.drawCursor(this.ctx, worldPos.x, worldPos.y);
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
            arrow: 'Ok',
            eraser: 'Silgi',
            arrow: 'Ok',
            eraser: 'Silgi',
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
