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
            strokeWidth: 3,
            lineStyle: 'solid',
            opacity: 1.0,
            pressureEnabled: true, // Default: Active for pen tool
            highlighterCap: 'round', // 'round' or 'butt'
            arrowStartStyle: 'none', // 'none', 'triangle', 'line', 'circle', 'square', 'bar'
            arrowEndStyle: 'triangle', // 'none', 'triangle', 'line', 'circle', 'square', 'bar'
            arrowPathType: 'straight', // 'straight', 'curved', 'elbow'
            eraserMode: 'object', // 'object', 'partial'
            stabilization: 0.5, // 0.0 to 1.0 (corresponds to 0-100% slider)
            decimation: 0, // Default 0
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
            select: new SelectTool(),
            sticker: null // Will be initialized after this is available
        };

        // Initialize sticker tool after this is available
        this.tools.sticker = new StickerTool(this.canvas, this.ctx, this);
        this.tools.tape = new TapeTool(() => this.render());

        this.colorPalette = new ColorPalette(this);
        this.propertiesSidebar = new PropertiesSidebar(this);

        this.history = new HistoryManager();
        this.pageManager = new PageManager(this);
        this.currentMousePos = { x: 0, y: 0 };
        this.isSpacePressed = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.setupAppMenu();
        this.setupCanvasModal();

        // Initialize UI for default tool
        this.propertiesSidebar.updateUIForTool(this.state.currentTool);

        // Initial draw (only if visible)
        if (this.canvas.clientWidth > 0) {
            this.redrawOffscreen();
            this.render();
        }

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
        const prevTool = this.state.currentTool;
        this.state.currentTool = tool;

        const shapeTypes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
        const isShape = shapeTypes.includes(tool);

        if (isShape) {
            this.state.currentShapeType = tool;
        }

        // --- Tool Specific Defaults (Apply only when switching TO the tool) ---
        if (tool !== prevTool) {
            if (tool === 'highlighter') {
                this.state.opacity = 0.5;
                this.state.strokeWidth = 14;
                this.state.highlighterCap = 'butt';
            } else if (tool === 'pen') {
                this.state.opacity = 1.0;
                this.state.strokeWidth = 3;
            } else if (tool === 'tape') {
                this.state.opacity = 1.0;
                this.state.strokeWidth = 20;
                this.state.strokeColor = '#5c9bfe';
                if (this.tools.tape) {
                    this.tools.tape.updateSettings({
                        mode: 'line',
                        pattern: 'stripes'
                    });
                }
            }
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

        // --- Special tool activation ---
        if (tool === 'sticker' && this.tools.sticker) {
            this.tools.sticker.activate();
            // Open sidebar for stickers
            if (this.propertiesSidebar && this.propertiesSidebar.container.style.display === 'none') {
                this.propertiesSidebar.toggle();
            }
        } else if (this.tools.sticker) {
            this.tools.sticker.deactivate();
        }

        // --- Cursor Sync ---
        const dotCursor = "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='8' cy='8' r='3' fill='black' stroke='white' stroke-width='1'/%3E%3C/svg%3E\") 8 8, auto";

        if (tool === 'eraser') {
            this.canvas.style.cursor = dotCursor;
        } else if (tool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'select') {
            this.canvas.style.cursor = 'default';
        } else if (tool === 'tape') {
            this.canvas.style.cursor = dotCursor;
        } else {
            this.canvas.style.cursor = dotCursor;
        }

        this.updateStatus();
    }

    setupCanvasModal() {
        const panel = document.getElementById('canvasSettingsPanel');
        const openBtn = document.getElementById('canvasSettingsBtn');
        const menuBtn = document.getElementById('menuCanvasSettings');
        const applyBtn = document.getElementById('applySettingsBtn');

        const toggleSettings = (e) => {
            e.stopPropagation();
            this.canvasSettings.togglePanel();

            const dropdown = document.getElementById('appMenuDropdown');
            if (dropdown) dropdown.classList.remove('show');

            if (this.canvasSettings.isPanelOpen) {
                this.canvasSettings.loadSettingsToPanel();
                if (this.propertiesSidebar) {
                    this.propertiesSidebar.hide();
                }
            }
        };

        const closeBtn = document.getElementById('btnCloseSettings');
        if (closeBtn) closeBtn.onclick = () => this.canvasSettings.togglePanel();

        if (openBtn) openBtn.onclick = toggleSettings;
        if (menuBtn) menuBtn.onclick = toggleSettings;

        // Ayarları uygula
        applyBtn.addEventListener('click', () => {
            // Ayarları kaydet
            const activeBgBtn = document.querySelector('.color-option-rect[data-color].active') || document.getElementById('btnCustomBackground');
            const activePatternBtn = document.querySelector('.pattern-item.active');
            const activePatternColorBtn = document.querySelector('.color-option-rect[data-pattern-color].active') || document.getElementById('btnCustomPatternColor');
            const spacingSlider = document.getElementById('patternSpacingSlider');
            const thicknessSlider = document.getElementById('patternThicknessSlider');

            this.canvasSettings.settings = {
                size: document.getElementById('canvasSizeSelect').value,
                orientation: document.querySelector('input[name="orientation"]:checked').value,
                backgroundColor: activeBgBtn ? (activeBgBtn.dataset.color || 'white') : 'white',
                pattern: activePatternBtn ? activePatternBtn.dataset.pattern : 'none',
                patternColor: activePatternColorBtn ? (activePatternColorBtn.dataset.patternColor || 'rgba(0,0,0,0.15)') : 'rgba(0,0,0,0.15)',
                patternSpacing: spacingSlider ? parseInt(spacingSlider.value) : 20,
                patternThickness: thicknessSlider ? parseFloat(thicknessSlider.value) : 1
            };

            // Yeni ayarları uygula
            this.canvasSettings.applySettings(this.canvas, this.ctx);

            // Mevcut sayfayı yeni ayarlarla güncelle
            if (this.pageManager) {
                this.pageManager.saveCurrentPageState();
            }

            // Sync offscreen and its background
            this.canvasSettings.applySettings(this.offscreenCanvas, this.offscreenCtx, this.canvas);

            // Nesneleri yeniden çiz
            if (this.zoomManager) {
                this.zoomManager.clampPan(); // Ortalamayı ve kaydırmayı yeniden hesapla
            } else {
                this.redrawOffscreen();
                this.render();
            }

            // Panel'i kapat
            this.canvasSettings.togglePanel();

            // Durum güncelle
            this.updateStatus();
        });

        // Renk seçimi
        document.querySelectorAll('.color-option-rect[data-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option-rect[data-color]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Özel Arkaplan Rengi
        const btnCustomBg = document.getElementById('btnCustomBackground');
        if (btnCustomBg) {
            btnCustomBg.addEventListener('click', (e) => {
                // Prevent bubbling if needed, but here we want the active class logic to run too.
                // However, we probably want to open the picker immediately.

                // Get current color or default to white
                // We reuse ColorPalette.showColorPicker but we need to supply a callback
                // Note: showColorPicker might expect to set strokeColor by default if we don't pass a callback?
                // Checking ColorPalette.js showColorPicker(initialColor, onSelectCallback) signature:
                // It was: showColorPicker(currentColor, onSelect) { ... }
                // So we pass current color and a callback.

                const currentColor = btnCustomBg.dataset.color || '#ffffff';

                // We need to position user intent - maybe show picker at mouse pos or center?
                // ColorPalette usually shows it near the palette button or centralized.
                // In the refactored ColorPalette, it creates a popup 'customColorPickerOverlay'.
                // Let's rely on that behavior.

                this.colorPalette.showColorPicker(currentColor, (color) => {
                    if (color === 'rainbow') return; // Background shouldn't be rainbow

                    btnCustomBg.style.backgroundColor = color;
                    btnCustomBg.dataset.color = color;
                    btnCustomBg.innerHTML = ''; // Remove '+' symbol logic if we want to show color nicely

                    // Auto-select this option
                    document.querySelectorAll('.color-option-rect[data-color]').forEach(b => b.classList.remove('active'));
                    btnCustomBg.classList.add('active');
                });
            });
        }

        // Desen seçimi
        document.querySelectorAll('.pattern-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pattern-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show/hide sub-options
                const patternGroup = document.getElementById('patternOptionsGroup');
                if (patternGroup) {
                    patternGroup.style.display = (btn.dataset.pattern === 'none') ? 'none' : 'block';
                }
            });
        });

        // Desen Rengi Seçimi
        document.querySelectorAll('.color-option-rect[data-pattern-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option-rect[data-pattern-color]').forEach(b => b.classList.remove('active'));
                // Disable custom btn active state if exists
                const customBtn = document.getElementById('btnCustomPatternColor');
                if (customBtn) {
                    customBtn.classList.remove('active');
                    customBtn.style.backgroundColor = 'white';
                    customBtn.innerHTML = '+';
                }
                btn.classList.add('active');
            });
        });

        // Özel Desen Rengi
        const btnCustomPattern = document.getElementById('btnCustomPatternColor');
        if (btnCustomPattern) {
            btnCustomPattern.addEventListener('click', () => {
                const currentColor = btnCustomPattern.dataset.patternColor || 'rgba(0,0,0,0.15)';
                this.colorPalette.showColorPicker(currentColor, (color) => {
                    if (color === 'rainbow') return;
                    btnCustomPattern.style.backgroundColor = color;
                    btnCustomPattern.dataset.patternColor = color;
                    // Auto-select this
                    document.querySelectorAll('.color-option-rect[data-pattern-color]').forEach(b => b.classList.remove('active'));
                    btnCustomPattern.classList.add('active');
                });
            });
        }

        // Desen Aralığı Slider
        const spacingSlider = document.getElementById('patternSpacingSlider');
        const spacingVal = document.getElementById('patternSpacingVal');
        if (spacingSlider && spacingVal) {
            spacingSlider.addEventListener('input', (e) => {
                spacingVal.textContent = e.target.value + 'px';
            });
        }

        // Desen Kalınlığı Slider
        const thicknessSlider = document.getElementById('patternThicknessSlider');
        const thicknessVal = document.getElementById('patternThicknessVal');
        if (thicknessSlider && thicknessVal) {
            thicknessSlider.addEventListener('input', (e) => {
                thicknessVal.textContent = e.target.value + 'px';
            });
        }
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

        // Context menu (sağ tık) engelleme ve yönetme
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Tarayıcı menüsünü tamamen engelle

            if (this.state.currentTool === 'select') {
                this.tools.select.handleContextMenu(e, this.canvas, this.state);
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
        const shapePickerBtn = document.getElementById('shapePickerBtn');
        if (shapePickerBtn) {
            shapePickerBtn.onclick = () => {
                const currentShape = this.state.currentShapeType || 'rectangle';
                const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                if (shapes.includes(this.state.currentTool)) {
                    this.propertiesSidebar.toggle();
                } else {
                    this.setTool(currentShape);
                }
            };
        }

        document.querySelectorAll('.tool-btn[data-tool]:not(#shapePickerBtn)').forEach(btn => {
            btn.onclick = () => {
                const tool = btn.dataset.tool;
                if (this.state.currentTool === tool) {
                    this.propertiesSidebar.toggle();
                } else {
                    this.setTool(tool);
                }
            };
        });

        const safeBind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        safeBind('btnPageSidebarTrigger', () => this.pageManager.toggleSidebar());
        safeBind('clearBtn', () => {
            this.history.saveState(this.state.objects);
            this.state.objects = [];
            this.redrawOffscreen();
            this.render();
        });
        safeBind('undoBtn', () => this.undo());
        safeBind('redoBtn', () => this.redo());
    }

    setupAppMenu() {
        const menuTrigger = document.getElementById('btnAppMenu');
        const dropdown = document.getElementById('appMenuDropdown');

        if (menuTrigger && dropdown) {
            menuTrigger.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            };

            // Global click to close menu
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.app-menu-container')) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }

    setupContextMenu() {
        const menuItems = document.querySelectorAll('.context-menu-item');

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                const selectTool = this.tools.select;

                // History kaydet (değişiklik yapan işlemler için)
                if (['delete', 'duplicate', 'cut', 'flipHorizontal', 'flipVertical', 'bringToFront', 'bringForward', 'sendBackward', 'sendToBack', 'group', 'ungroup', 'lock', 'unlock'].includes(action)) {
                    this.history.saveState(this.state.objects);
                }

                let result = null;

                switch (action) {
                    case 'lock':
                        selectTool.lockSelected(this.state);
                        break;
                    case 'unlock':
                        selectTool.unlockSelected(this.state);
                        break;
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
                                // Separate tapes from other objects
                                const tapes = result.filter(obj => obj.type === 'tape');
                                const others = result.filter(obj => obj.type !== 'tape');

                                // Add non-tape objects first, then tapes at the end (top layer)
                                this.state.objects.push(...others);
                                this.state.objects.push(...tapes);
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
                    case 'saveAsSticker':
                        // Save selected objects as sticker
                        if (selectTool.selectedObjects && selectTool.selectedObjects.length > 0) {
                            const selectedObjs = selectTool.selectedObjects.map(idx => this.state.objects[idx]);
                            if (selectedObjs.length === 1) {
                                this.tools.sticker.createStickerFromObject(selectedObjs[0]);
                            } else {
                                // For multiple objects, create from selection
                                this.tools.sticker.createStickerFromSelection();
                            }
                        }
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

        const worldPosGlobal = this.zoomManager.getPointerWorldPos(e);
        const pageIndex = this.pageManager.getPageIndexAt(worldPosGlobal.y);
        const pageY = this.pageManager.getPageY(pageIndex);

        // Otomatik sayfa geçişi (Eğer farklı bir sayfaya tıkladıysak)
        if (pageIndex !== this.pageManager.currentPageIndex) {
            this.pageManager.switchPage(pageIndex, false); // false = scroll yapma (zaten oradayız)
        }

        // Araçlar için koordinatları o sayfanın yerel koordinatlarına çevir
        const worldPos = {
            ...worldPosGlobal,
            y: worldPosGlobal.y - pageY
        };

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        // --- Pick Shape Mode for Tape Tool ---
        if (this.state.pickShapeMode) {
            for (let i = this.state.objects.length - 1; i >= 0; i--) {
                const obj = this.state.objects[i];
                let hit = this.tools.select.isNearObject(obj, worldPos);

                if (hit) {
                    // We found the object to use as mask
                    // Calculate bounds to center it properly
                    const bounds = this.tools.select.getBoundingBox(obj);
                    const bWidth = Math.max(bounds.maxX - bounds.minX, 1);
                    const bHeight = Math.max(bounds.maxY - bounds.minY, 1);

                    const targetPatternHeight = 60; // Base height for pattern
                    const padding = 1; // Small gap between repetitions
                    const scale = (targetPatternHeight - padding * 1) / bHeight;

                    const maskCanvas = document.createElement('canvas');
                    maskCanvas.width = bWidth * scale + (padding * 2);
                    maskCanvas.height = targetPatternHeight;
                    const mCtx = maskCanvas.getContext('2d');

                    // Fill with solid white background
                    mCtx.fillStyle = '#ffffff';
                    mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

                    mCtx.save();
                    mCtx.translate(maskCanvas.width / 2, maskCanvas.height / 2);
                    mCtx.scale(scale, scale);
                    mCtx.translate(-(bounds.minX + bWidth / 2), -(bounds.minY + bHeight / 2));

                    // Draw the object
                    this.drawObject(mCtx, obj);
                    mCtx.restore();

                    if (this.tools.tape) {
                        this.tools.tape.updateSettings({ pattern: 'mask', customMask: maskCanvas });

                        // Save to custom patterns list
                        if (this.propertiesSidebar) {
                            this.propertiesSidebar.addCustomTapePattern(maskCanvas, 'mask');
                        }

                        // UI: Deactivate other patterns
                        document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(b => b.classList.remove('active'));
                    }

                    // Exit pick mode
                    this.state.pickShapeMode = false;
                    const btn = document.getElementById('btnTapePickShape');
                    if (btn) btn.classList.remove('active');
                    this.setTool('tape');
                    return;
                }
            }
            // If we clicked empty space, cancel pick mode?
            this.state.pickShapeMode = false;
            const btn = document.getElementById('btnTapePickShape');
            if (btn) btn.classList.remove('active');
            const dotCursor = "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='8' cy='8' r='3' fill='black' stroke='white' stroke-width='1'/%3E%3C/svg%3E\") 8 8, auto";
            this.canvas.style.cursor = dotCursor;
            return;
        }

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

        // --- Global Tape Interaction (Visibility Toggle) ---
        for (let i = this.state.objects.length - 1; i >= 0; i--) {
            const obj = this.state.objects[i];
            if (obj.type === 'tape') {
                if (this.tools.tape.isPointInside(obj, worldPos)) {
                    if (e.button === 2) return;

                    // Eğer tape seçili DEĞİLSE görünürlüğü değiştir.
                    // Eğer seçiliyse harekete izin vermek için burayı geçiyoruz.
                    if (this.state.currentTool === 'select' && this.tools.select.selectedObjects.includes(i)) {
                        continue;
                    }

                    // Left click to toggle visibility
                    this.tools.tape.toggleVisibility(obj);
                    this.redrawOffscreen();
                    this.render();
                    return;
                }
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

        const worldPosGlobal = this.zoomManager.getPointerWorldPos(e);
        const pageIndex = this.pageManager.getPageIndexAt(worldPosGlobal.y);
        const pageY = this.pageManager.getPageY(pageIndex);

        // Mevcut sayfanın yerel koordinatlarına çevir
        const worldPos = {
            ...worldPosGlobal,
            y: worldPosGlobal.y - pageY
        };

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

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

        const worldPosGlobal = this.zoomManager.getPointerWorldPos(e);
        const pageIndex = this.pageManager.getPageIndexAt(worldPosGlobal.y);
        const pageY = this.pageManager.getPageY(pageIndex);

        const worldPos = {
            ...worldPosGlobal,
            y: worldPosGlobal.y - pageY
        };

        const tool = this.tools[this.state.currentTool];
        if (!tool) return;

        const completedObject = tool.handlePointerUp(e, worldPos, this.canvas, this.ctx, this.state);

        if (completedObject && typeof completedObject === 'object') {
            // 1. SAVE STATE BEFORE ADDING (to allow undo to previous state)
            this.history.saveState(this.state.objects);

            // 2. IF AUTO-STRAIGHTENED, INJECT INTERMEDIATE STATE
            if (completedObject.isStraightened && completedObject.originalPoints) {
                // To allow undo back to squiggly:
                // We need a state that has all current objects PLUS the squiggly one
                const freehandObj = Utils.deepClone(completedObject);
                freehandObj.points = completedObject.originalPoints;
                freehandObj.isStraightened = false;
                delete freehandObj.originalPoints;

                const intermediateObjects = Utils.deepClone(this.state.objects);
                if (completedObject.isHighlighter) {
                    intermediateObjects.unshift(freehandObj);
                } else {
                    intermediateObjects.push(freehandObj);
                }

                // Save the intermediate (squiggly) state to the undo stack
                this.history.saveState(intermediateObjects);
            }

            // 3. ADD THE FINAL OBJECT TO REAL STATE
            // Tapes always go to the top layer (end of array)
            if (completedObject.type === 'tape') {
                this.state.objects.push(completedObject);
            } else if (completedObject.isHighlighter) {
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
        // Eğer kullanıcı bir input, textarea veya contenteditable bir alanda yazı yazıyorsa kısayolları çalıştırma
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

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
                        // Separate tapes from other objects
                        const tapes = pastedResult.filter(obj => obj.type === 'tape');
                        const others = pastedResult.filter(obj => obj.type !== 'tape');

                        // Add non-tape objects first, then tapes at the end (top layer)
                        this.state.objects.push(...others);
                        this.state.objects.push(...tapes);
                    } else {
                        // Single object
                        if (pastedResult.type === 'tape') {
                            this.state.objects.push(pastedResult);
                        } else {
                            this.state.objects.push(pastedResult);
                        }
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
                // Save state BEFORE modification
                this.history.saveState(this.state.objects);
                const duplicateResult = selectTool.duplicateSelected(this.state);
                if (duplicateResult) {
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

        // Selection Actions (G, U, K, J)
        if (this.state.currentTool === 'select' && !e.ctrlKey) {
            const selectTool = this.tools.select;
            if (e.key.toLowerCase() === 'g') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.groupSelected(this.state);
                this.redrawOffscreen();
                this.render();
                return;
            }
            if (e.key.toLowerCase() === 'u') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.ungroupSelected(this.state);
                this.redrawOffscreen();
                this.render();
                return;
            }
            if (e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.lockSelected(this.state);
                return;
            }
            if (e.key.toLowerCase() === 'j') {
                e.preventDefault();
                this.history.saveState(this.state.objects);
                selectTool.unlockSelected(this.state);
                return;
            }
        }

        // Araç kısayolları
        const toolShortcuts = {
            'p': 'pen',
            'i': 'highlighter',
            'h': 'hand',
            'a': 'arrow',
            'l': 'arrow',
            'r': 'rectangle',
            'e': 'ellipse',
            'o': 'shape',
            'q': 'shape',
            'x': 'eraser',
            'v': 'select',
            's': 'sticker',
            't': 'tape',
            'c': 'settings'
        };

        if (toolShortcuts[e.key.toLowerCase()]) {
            e.preventDefault();
            const toolName = toolShortcuts[e.key.toLowerCase()];

            if (toolName === 'settings') {
                this.canvasSettings.togglePanel();
                if (this.canvasSettings.isPanelOpen) {
                    this.canvasSettings.loadSettingsToPanel();
                }
            } else if (toolName === 'shape') {
                const shapePickerBtn = document.getElementById('shapePickerBtn');
                if (shapePickerBtn) shapePickerBtn.click(); // Trigger the existing picker logic
            } else {
                this.setTool(toolName);
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
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = this.canvas.clientWidth || parseInt(this.canvas.style.width) || 0;
        const cssHeight = this.canvas.clientHeight || parseInt(this.canvas.style.height) || 0;

        if (cssWidth <= 0 || cssHeight <= 0) return;

        // Reset and clear
        this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.scale(dpr, dpr);

        // Masüstü arkaplanı (Sayfa dışındaki alanlar için)
        this.offscreenCtx.fillStyle = '#f5f5f5';
        this.offscreenCtx.fillRect(0, 0, cssWidth, cssHeight);

        // Apply zoom transformation
        this.offscreenCtx.save();
        this.offscreenCtx.translate(this.zoomManager.pan.x, this.zoomManager.pan.y);
        this.offscreenCtx.scale(this.zoomManager.zoom, this.zoomManager.zoom);

        // Visible World Bounds
        const worldBounds = {
            x: -this.zoomManager.pan.x / this.zoomManager.zoom,
            y: -this.zoomManager.pan.y / this.zoomManager.zoom,
            w: cssWidth / this.zoomManager.zoom,
            h: cssHeight / this.zoomManager.zoom
        };

        // Render ALL pages within view
        this.pageManager.pages.forEach((page, index) => {
            const pageY = this.pageManager.getPageY(index);
            const pageH = this.pageManager.getPageHeight();
            const pageWidth = this.pageManager.getPageWidth();

            // Check if page is in view
            if (pageY + pageH < worldBounds.y || pageY > worldBounds.y + worldBounds.h) {
                return;
            }

            this.offscreenCtx.save();
            this.offscreenCtx.translate(0, pageY);

            // Sayfa dışına taşan çizimleri kırp
            this.offscreenCtx.beginPath();
            this.offscreenCtx.rect(0, 0, pageWidth, pageH);
            this.offscreenCtx.clip();

            // Draw individual page background
            this.canvasSettings.drawBackground(this.offscreenCanvas, this.offscreenCtx,
                { x: 0, y: 0, width: pageWidth, height: pageH }, // Using exact page bounds
                null, null, 1,
                { color: page.backgroundColor, pattern: page.backgroundPattern }
            );

            // Draw objects of this page
            const objs = (index === this.pageManager.currentPageIndex) ? this.state.objects : page.objects;
            objs.forEach(obj => {
                this.drawObject(this.offscreenCtx, obj);
            });

            this.offscreenCtx.restore();
        });

        this.offscreenCtx.restore();
    }

    render() {
        // Fast Render Loop
        const dpr = window.devicePixelRatio || 1;
        const logicalW = this.canvas.clientWidth;
        const logicalH = this.canvas.clientHeight;

        // 1. Clear Screen (using logical bounds)
        if (logicalW > 0 && logicalH > 0) {
            this.ctx.clearRect(0, 0, logicalW, logicalH);
        }

        // 2. Draw Static Cache (Offscreen)
        // Draw the full high-res offscreen buffer into the logical bounds
        if (this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0 && logicalW > 0 && logicalH > 0) {
            this.ctx.imageSmoothingEnabled = false; // Keep vector edges crisp
            this.ctx.drawImage(this.offscreenCanvas, 0, 0, logicalW, logicalH);
            this.ctx.imageSmoothingEnabled = true;
        }

        this.ctx.save();

        // Apply Zoom & Pan for dynamic elements (In logical coordinates)
        this.ctx.translate(this.zoomManager.pan.x, this.zoomManager.pan.y);
        this.ctx.scale(this.zoomManager.zoom, this.zoomManager.zoom);

        // 4. Draw Active Page Preview
        const activePageY = this.pageManager.getPageY(this.pageManager.currentPageIndex);
        const activePageH = this.pageManager.getPageHeight();

        // Aktif sayfa genişliğini hesapla
        const activePageW = this.pageManager.getPageWidth();

        this.ctx.save();
        this.ctx.translate(0, activePageY);

        // Aktif sayfa dışına taşan önizlemeyi kırp
        this.ctx.beginPath();
        this.ctx.rect(0, 0, activePageW, activePageH);
        this.ctx.clip();

        const currentTool = this.tools[this.state.currentTool];
        let needsNextFrame = false;

        if (currentTool.isDrawing && (currentTool.currentPath || currentTool.currentTape)) {
            // Live Fill Rendering
            if (currentTool.currentPath && currentTool.currentPath.filled && this.fillManager) {
                this.fillManager.drawFill(this.ctx, currentTool.currentPath);
            }
            // Support preview for both pen path and tape object
            currentTool.drawPreview(this.ctx, currentTool.currentPath || currentTool.currentTape);
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
        this.ctx.restore();

        // Request next frame if an animation (like eraser trail fade) is active
        if (needsNextFrame) {
            requestAnimationFrame(() => this.render());
        }

        // Silgi imleci - World Coordinates
        if (this.state.currentTool === 'eraser' && currentTool.drawCursor) {
            const worldPosGlobal = this.zoomManager.getPointerWorldPos({
                offsetX: this.currentMousePos.x,
                offsetY: this.currentMousePos.y
            });
            const pageY = this.pageManager.getPageY(this.pageManager.currentPageIndex);
            currentTool.drawCursor(this.ctx, worldPosGlobal.x, worldPosGlobal.y - pageY, this.state);
        }

        // Seçim gösterimi
        if (this.state.currentTool === 'select') {
            const pageY = this.pageManager.getPageY(this.pageManager.currentPageIndex);
            this.ctx.save();
            this.ctx.translate(0, pageY);
            currentTool.drawSelection(this.ctx, this.state, this.zoomManager.zoom);
            this.ctx.restore();
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
            highlighter: 'Vurgulayıcı',
            sticker: 'Sticker'
        };

        document.getElementById('toolInfo').textContent =
            `Aktif Araç: ${toolNames[this.state.currentTool]}`;

        document.getElementById('objectCount').textContent =
            `Öğe Sayısı: ${this.state.objects.length}`;

        document.getElementById('canvasSize').textContent =
            `Tuval: ${this.canvasSettings.getSizeLabel()}`;

        document.getElementById('cursorPos').textContent =
            `X: ${Math.round(this.currentMousePos.x)}, Y: ${Math.round(this.currentMousePos.y)}`;
    }
}

// Uygulamayı başlat
window.app = new WhiteboardApp();
window.dashboard = new Dashboard(window.app);
