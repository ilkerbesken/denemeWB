class PropertiesSidebar {
    constructor(app) {
        this.app = app;
        this.customTapePatterns = []; // List of custom masks/images for tape
        this.loadCustomTapePatterns(); // Load from localStorage
        this.init();
    }

    init() {
        this.container = document.getElementById('propertiesSidebar');
        this.isInteractionStarted = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Opacity Slider Sync
        const opacitySliders = document.querySelectorAll('.opacity-slider');
        const opacityVal = document.getElementById('opacityVal');
        opacitySliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);

                // Save state ONCE at the start of continuous interaction
                if (!this.isInteractionStarted && this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.isInteractionStarted = true;
                }

                this.app.state.opacity = val / 100;
                if (opacityVal) opacityVal.textContent = val + '%';
                // Sync all opacity sliders
                opacitySliders.forEach(s => { if (s !== e.target) s.value = val; });

                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { opacity: this.app.state.opacity });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
            slider.addEventListener('change', (e) => {
                this.isInteractionStarted = false; // Reset flag for next interaction
            });
        });

        // Stroke Width Slider Sync
        const widthSliders = document.querySelectorAll('.stroke-width-slider');
        const widthVal = document.getElementById('strokeWidthVal');
        widthSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);

                // Save state ONCE at the start of continuous interaction
                if (!this.isInteractionStarted && this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.isInteractionStarted = true;
                }

                this.app.state.strokeWidth = val;
                if (widthVal) widthVal.textContent = val + 'px';
                // Sync all width sliders
                widthSliders.forEach(s => { if (s !== e.target) s.value = val; });

                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { width: this.app.state.strokeWidth });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
            slider.addEventListener('change', (e) => {
                this.isInteractionStarted = false; // Reset flag
            });
        });

        // Stabilization Slider Sync
        const stabSliders = document.querySelectorAll('.stabilization-slider');
        const stabVal = document.getElementById('stabilizationVal');
        stabSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.app.state.stabilization = val / 100;
                if (stabVal) stabVal.textContent = val + '%';
                // Sync all stabilization sliders
                stabSliders.forEach(s => { if (s !== e.target) s.value = val; });
            });
        });

        // Decimation Slider Sync
        const decSliders = document.querySelectorAll('.decimation-slider');
        const decVal = document.getElementById('decimationVal');
        decSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.app.state.decimation = val / 100;
                if (decVal) decVal.textContent = val + '%';
                // Sync all decimation sliders
                decSliders.forEach(s => { if (s !== e.target) s.value = val; });
            });
        });

        // Pressure Sensitivity Button
        document.getElementById('pressureBtn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            this.app.state.pressureEnabled = !this.app.state.pressureEnabled;
            btn.classList.toggle('active', this.app.state.pressureEnabled);
        });

        // Line Styles
        document.querySelectorAll('.tool-btn[data-linestyle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.linestyle;
                this.app.state.lineStyle = style;

                // UI Update
                document.querySelectorAll('.tool-btn[data-linestyle]').forEach(b =>
                    b.classList.remove('active')
                );
                btn.classList.add('active');

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects); // Save state BEFORE change
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { lineStyle: style });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
        });

        // Highlighter Cap Settings
        document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(btn => {
            btn.addEventListener('click', () => {
                const capValue = btn.dataset.highlighterCap;

                this.app.state.highlighterCap = capValue;

                // UI Update
                document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { highlighterCap: capValue });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
        });

        // Arrow Start Style Settings
        document.querySelectorAll('.tool-btn[data-arrow-start]').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.arrowStart;
                this.app.state.arrowStartStyle = style;

                // UI Update
                document.querySelectorAll('.tool-btn[data-arrow-start]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { arrowStartStyle: style });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
        });

        // Arrow End Style Settings
        document.querySelectorAll('.tool-btn[data-arrow-end]').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.arrowEnd;
                this.app.state.arrowEndStyle = style;

                // UI Update
                document.querySelectorAll('.tool-btn[data-arrow-end]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { arrowEndStyle: style });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
        });

        // Arrow Path Type Settings (toggle behavior)
        document.querySelectorAll('.tool-btn[data-arrow-path]').forEach(btn => {
            btn.addEventListener('click', () => {
                const pathType = btn.dataset.arrowPath;
                const isActive = btn.classList.contains('active');
                let finalPathType = 'straight';

                // Toggle: clicking active button returns to straight
                if (isActive) {
                    finalPathType = 'straight';
                    this.app.state.arrowPathType = 'straight';
                    btn.classList.remove('active');
                } else {
                    finalPathType = pathType;
                    this.app.state.arrowPathType = pathType;
                    // Deactivate all others
                    document.querySelectorAll('.tool-btn[data-arrow-path]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { arrowPathType: finalPathType });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }
            });
        });

        // Arrow Settings Popovers (Start/End Arrow Heads)
        const btnStartTrigger = document.getElementById('btnArrowStartTrigger');
        const btnEndTrigger = document.getElementById('btnArrowEndTrigger');
        const popupStart = document.getElementById('popupArrowStart');
        const popupEnd = document.getElementById('popupArrowEnd');

        // Combined Brush Settings Trigger
        const btnBrushSettingsTrigger = document.getElementById('btnBrushSettingsTrigger');
        const popupBrushSettings = document.getElementById('popupBrushSettings');

        const btnColorToggle = document.getElementById('btnColorToggle');
        const colorSidebar = document.getElementById('colorSidebar');

        const closeAllPopups = () => this.closeAllPopups();

        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.property-trigger-btn') &&
                !e.target.closest('.property-popup') &&
                !e.target.closest('.property-popup-responsive') &&
                !e.target.closest('#colorSidebar') &&
                !e.target.closest('#btnColorToggle')) {
                closeAllPopups();
                if (colorSidebar) colorSidebar.classList.remove('show');
                if (btnColorToggle) btnColorToggle.classList.remove('active');
            }
        });

        // Color Toggle Logic
        if (btnColorToggle && colorSidebar) {
            btnColorToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentDisplay = window.getComputedStyle(colorSidebar).display;
                closeAllPopups();

                if (currentDisplay !== 'none') {
                    colorSidebar.style.display = 'none';
                    btnColorToggle.classList.remove('active');
                } else {
                    colorSidebar.style.display = 'flex';
                    btnColorToggle.classList.add('active');
                }
            });
        }

        if (btnStartTrigger && popupStart) {
            btnStartTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = popupStart.style.display === 'grid';
                closeAllPopups();
                if (!isVisible) {
                    popupStart.style.display = 'grid';
                    btnStartTrigger.classList.add('active');
                    this.positionPopup(btnStartTrigger, popupStart);
                }
            });
        }

        if (btnEndTrigger && popupEnd) {
            btnEndTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = popupEnd.style.display === 'grid';
                closeAllPopups();
                if (!isVisible) {
                    popupEnd.style.display = 'grid';
                    btnEndTrigger.classList.add('active');
                    this.positionPopup(btnEndTrigger, popupEnd);
                }
            });
        }

        // Brush Settings Trigger Logic
        if (btnBrushSettingsTrigger && popupBrushSettings) {
            btnBrushSettingsTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = popupBrushSettings.style.display === 'flex';
                closeAllPopups();
                if (!isVisible) {
                    popupBrushSettings.style.display = 'flex';
                    btnBrushSettingsTrigger.classList.add('active');
                    this.positionPopup(btnBrushSettingsTrigger, popupBrushSettings);
                }
            });
        }



        // Close popup when options are selected
        const popupButtons = document.querySelectorAll('.property-popup .tool-btn');
        popupButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                closeAllPopups();
            });
        });

        // Eraser Mode Settings
        document.querySelectorAll('.tool-btn[data-eraser-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.eraserMode;
                this.app.state.eraserMode = mode;

                // UI Update
                document.querySelectorAll('.tool-btn[data-eraser-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Fill Toggle
        // Fill Toggle
        const fillBtn = document.getElementById('btnFillToggle');
        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                const currentTool = this.app.state.currentTool;

                if (currentTool === 'select' && this.app.tools.select.selectedObjects.length === 1) {
                    const objIndex = this.app.tools.select.selectedObjects[0];
                    const obj = this.app.state.objects[objIndex];

                    if (obj) {
                        const isShape = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(obj.type);
                        const canFill = isShape || (this.app.fillManager && this.app.fillManager.canBeFilled(obj));

                        if (canFill) {
                            this.app.history.saveState(this.app.state.objects);

                            if (isShape) {
                                // Toggle fill for advanced shapes
                                obj.filled = !obj.filled;
                                obj.fillColor = obj.filled ? (obj.fillColor || obj.color || obj.strokeColor) : 'transparent';
                                // If it was 'transparent', make it follow current color
                                if (obj.filled && obj.fillColor === 'transparent') obj.fillColor = obj.color || obj.strokeColor;
                            } else {
                                // Toggle fill for freehand via FillManager
                                this.app.fillManager.toggleFill(obj, obj.color);
                            }

                            fillBtn.classList.toggle('active', !!obj.filled);
                            if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                            this.app.render();
                        }
                    }
                } else if (['pen', 'highlighter', 'rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(currentTool)) {
                    // Logic for Live Drawing Mode
                    this.app.state.fillEnabled = !this.app.state.fillEnabled;
                    fillBtn.classList.toggle('active', this.app.state.fillEnabled);
                }
            });
        }

        // Select Tool Mode Settings
        document.querySelectorAll('.tool-btn[data-select-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.selectMode;
                if (this.app.tools.select) {
                    this.app.tools.select.selectionMode = mode;
                    // Reset selection logic if needed, but keeping selection is fine.
                }
                document.querySelectorAll('.tool-btn[data-select-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Tape Tool Mode Settings
        document.querySelectorAll('.tool-btn[data-tape-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.tapeMode;
                if (this.app.tools.tape) {
                    this.app.tools.tape.updateSettings({ mode: mode });
                }

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { tapeMode: mode });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }

                document.querySelectorAll('.tool-btn[data-tape-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Tape Tool Pattern Settings
        document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(btn => {
            btn.addEventListener('click', () => {
                const pattern = btn.dataset.tapePattern;
                if (this.app.tools.tape) {
                    this.app.tools.tape.updateSettings({ pattern: pattern });
                }

                // Update Selection
                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.history.saveState(this.app.state.objects);
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { tapePattern: pattern });
                    if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                    this.app.render();
                }

                document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Tape Image Upload
        const tapeImageInput = document.getElementById('tapeImageInput');
        const btnTapeImageUpload = document.getElementById('btnTapeImageUpload');
        if (btnTapeImageUpload && tapeImageInput) {
            btnTapeImageUpload.addEventListener('click', () => {
                tapeImageInput.click();
            });

            tapeImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            if (this.app.tools.tape) {
                                this.app.tools.tape.updateSettings({ pattern: 'custom', customImage: img });

                                // Save to custom patterns list
                                this.addCustomTapePattern(img, 'custom');
                            }

                            // Update Selection
                            if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                                this.app.history.saveState(this.app.state.objects);
                                this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { tapePattern: 'custom', customImage: img });
                                if (this.app.redrawOffscreen) this.app.redrawOffscreen();
                                this.app.render();
                            }

                            // UI Update: highlight upload btn
                            document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(b => b.classList.remove('active'));
                            btnTapeImageUpload.classList.add('active');
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Tape Pick Shape
        const btnTapePickShape = document.getElementById('btnTapePickShape');
        if (btnTapePickShape) {
            btnTapePickShape.addEventListener('click', () => {
                // Enter pick shape mode
                this.app.state.pickShapeMode = !this.app.state.pickShapeMode;
                btnTapePickShape.classList.toggle('active', this.app.state.pickShapeMode);
                if (this.app.state.pickShapeMode) {
                    this.app.canvas.style.cursor = 'crosshair';
                } else {
                    this.app.canvas.style.cursor = (this.app.state.currentTool === 'tape') ? 'crosshair' : 'default';
                }
            });
        }

        // Custom Patterns Popup Toggle
        const btnTapeCustomPatterns = document.getElementById('btnTapeCustomPatterns');
        const popupTapeCustomPatterns = document.getElementById('popupTapeCustomPatterns');
        if (btnTapeCustomPatterns && popupTapeCustomPatterns) {
            btnTapeCustomPatterns.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = popupTapeCustomPatterns.classList.contains('show');
                closeAllPopups();
                if (!isVisible) {
                    popupTapeCustomPatterns.classList.add('show');
                    this.renderCustomTapePatterns();
                    this.positionPopup(btnTapeCustomPatterns, popupTapeCustomPatterns);
                } else {
                    popupTapeCustomPatterns.classList.remove('show');
                }
            });
        }

        // Close popups on sidebar scroll
        if (this.container) {
            this.container.addEventListener('scroll', () => {
                closeAllPopups();
            }, { passive: true });
            // Table Row/Col Inputs
            const rowInput = document.getElementById('tableRowInput');
            const colInput = document.getElementById('tableColInput');

            if (rowInput) {
                rowInput.value = this.app.state.tableRows || 3;
                rowInput.addEventListener('change', (e) => {
                    let val = parseInt(e.target.value);
                    if (val < 1) val = 1;
                    this.app.state.tableRows = val;
                });
            }
            if (colInput) {
                colInput.value = this.app.state.tableCols || 3;
                colInput.addEventListener('change', (e) => {
                    let val = parseInt(e.target.value);
                    if (val < 1) val = 1;
                    this.app.state.tableCols = val;
                });
            }

            // Table Row/Col Adjustment Buttons
            document.querySelectorAll('.num-adj-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.dataset.target;
                    const dir = btn.dataset.dir;
                    const input = document.getElementById(targetId);
                    if (input) {
                        let val = parseInt(input.value);
                        if (dir === 'up') val++;
                        else val--;

                        const min = parseInt(input.min) || 1;
                        const max = parseInt(input.max) || 20;

                        if (val < min) val = min;
                        if (val > max) val = max;

                        input.value = val;
                        // Trigger change event to update app state
                        input.dispatchEvent(new Event('change'));
                    }
                });
            });
        }
    }

    addCustomTapePattern(canvas, type = 'mask') {
        // Create a thumbnail/copy of the canvas to store
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = canvas.width;
        patternCanvas.height = canvas.height;
        const pCtx = patternCanvas.getContext('2d');
        pCtx.drawImage(canvas, 0, 0);

        this.customTapePatterns.push({
            id: Date.now(),
            canvas: patternCanvas,
            type: type
        });

        // Show feedback (optional)
        const btn = document.getElementById('btnTapeCustomPatterns');
        if (btn) {
            btn.style.background = '#e3f2fd';
            setTimeout(() => btn.style.background = '', 500);
        }

        this.saveCustomTapePatterns();
    }

    saveCustomTapePatterns() {
        const patternsToSave = this.customTapePatterns.map(p => ({
            id: p.id,
            type: p.type,
            dataUrl: p.canvas.toDataURL()
        }));
        localStorage.setItem('whiteboard_custom_tapes', JSON.stringify(patternsToSave));
    }

    loadCustomTapePatterns() {
        try {
            const saved = localStorage.getItem('whiteboard_custom_tapes');
            if (saved) {
                const patterns = JSON.parse(saved);
                this.customTapePatterns = patterns.map(p => {
                    const canvas = document.createElement('canvas');
                    const img = new Image();
                    img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = p.dataUrl;
                    return {
                        id: p.id,
                        type: p.type,
                        canvas: canvas
                    };
                });
            }
        } catch (e) {
            console.error('Error loading custom tape patterns:', e);
            this.customTapePatterns = [];
        }
    }

    renderCustomTapePatterns() {
        const list = document.getElementById('tapeCustomPatternsList');
        if (!list) return;

        if (this.customTapePatterns.length === 0) {
            list.innerHTML = '<div style="padding: 10px; color: #999; font-size: 11px; text-align: center; width: 100%;">Henüz desen eklenmedi</div>';
            return;
        }

        list.innerHTML = '';
        this.customTapePatterns.forEach(pattern => {
            const item = document.createElement('div');
            item.className = 'tape-pattern-item';

            // Create a preview canvas
            const preview = document.createElement('canvas');
            preview.width = 40;
            preview.height = 40;
            const ctx = preview.getContext('2d');
            ctx.drawImage(pattern.canvas, 0, 0, 40, 40);

            item.appendChild(preview);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.title = 'Sil';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteCustomPattern(pattern.id);
            };
            item.appendChild(delBtn);

            item.onclick = () => {
                if (this.app.tools.tape) {
                    if (pattern.type === 'mask') {
                        this.app.tools.tape.updateSettings({ pattern: 'mask', customMask: pattern.canvas });
                    } else if (pattern.type === 'custom') {
                        this.app.tools.tape.updateSettings({ pattern: 'custom', customImage: pattern.canvas });
                    }
                }
                // Update UI: Deactivate built-in patterns
                document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(b => b.classList.remove('active'));
                this.closeAllPopups();
            };

            list.appendChild(item);
        });
    }

    deleteCustomPattern(id) {
        this.customTapePatterns = this.customTapePatterns.filter(p => p.id !== id);
        this.saveCustomTapePatterns();
        this.renderCustomTapePatterns();
    }

    closeAllPopups() {
        const popupStart = document.getElementById('popupArrowStart');
        const popupEnd = document.getElementById('popupArrowEnd');
        const btnStartTrigger = document.getElementById('btnArrowStartTrigger');
        const btnEndTrigger = document.getElementById('btnArrowEndTrigger');
        const popupBrushSettings = document.getElementById('popupBrushSettings');
        const btnBrushSettingsTrigger = document.getElementById('btnBrushSettingsTrigger');
        const popupTapeCustomPatterns = document.getElementById('popupTapeCustomPatterns');

        if (popupStart) popupStart.style.display = 'none';
        if (popupEnd) popupEnd.style.display = 'none';
        if (btnStartTrigger) btnStartTrigger.classList.remove('active');
        if (btnEndTrigger) btnEndTrigger.classList.remove('active');

        if (popupBrushSettings) popupBrushSettings.style.display = 'none';
        if (btnBrushSettingsTrigger) btnBrushSettingsTrigger.classList.remove('active');

        if (popupTapeCustomPatterns) popupTapeCustomPatterns.classList.remove('show');

        // Close mobile popups
        ['Thickness', 'Opacity', 'Stabilization', 'Decimation'].forEach(name => {
            const popup = document.getElementById(`popup${name}`);
            const btn = document.getElementById(`btn${name}Trigger`);
            if (popup) popup.classList.remove('show');
            if (btn) btn.classList.remove('active');
        });
    }

    positionPopup(trigger, popup) {
        const rect = trigger.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = (rect.bottom + 8) + 'px';

        // Wait a tiny bit for the layout to compute the final width of the newly shown popup
        // or just use offsetWidth if it's already display: block/grid/etc. 
        let left = rect.left;
        const popupWidth = popup.offsetWidth || 200;

        // If the popup would overflow the right edge of the screen
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 10;
        }

        // Ensure it doesn't overflow the left edge
        if (left < 10) left = 10;

        popup.style.left = left + 'px';
        popup.style.transform = 'none';
        popup.style.zIndex = '1001'; // Ensure it is above everything
    }

    updateUIForTool(tool) {
        if (!this.container) return;
        this.container.style.display = 'flex';

        // 1. Sync State from Selection (If in Select Tool)
        if (tool === 'select') {
            const selectTool = this.app.tools.select;
            if (selectTool.selectedObjects.length === 1) {
                const obj = this.app.state.objects[selectTool.selectedObjects[0]];
                if (obj) {
                    const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                    // Update State to match selected object
                    if (shapes.includes(obj.type)) {
                        if (obj.strokeWidth !== undefined) this.app.state.strokeWidth = obj.strokeWidth;
                    } else if (obj.type === 'tape') {
                        if (obj.thickness !== undefined) this.app.state.strokeWidth = obj.thickness;
                    } else {
                        if (obj.width !== undefined) this.app.state.strokeWidth = obj.width;
                    }

                    if (obj.opacity !== undefined) this.app.state.opacity = obj.opacity;
                    if (obj.lineStyle) this.app.state.lineStyle = obj.lineStyle;
                    if (obj.color) this.app.state.strokeColor = obj.color;
                    if (obj.cap) this.app.state.highlighterCap = obj.cap;
                    if (obj.startStyle) this.app.state.arrowStartStyle = obj.startStyle;
                    if (obj.endStyle) this.app.state.arrowEndStyle = obj.endStyle;
                    if (obj.pathType) this.app.state.arrowPathType = obj.pathType;
                }
            }
        }

        // 2. Sync UI Components from Current State (Runs for ALL tools)

        // Sync Select Mode Buttons
        if (this.app.tools.select) {
            const currentMode = this.app.tools.select.selectionMode || 'normal';
            document.querySelectorAll('.tool-btn[data-select-mode]').forEach(b => {
                b.classList.toggle('active', b.dataset.selectMode === currentMode);
            });
        }

        // Sync Sliders
        const thicknessSlider = document.getElementById('strokeWidthSlider');
        if (thicknessSlider) {
            thicknessSlider.value = this.app.state.strokeWidth;
            if (window.updateRangeProgress) window.updateRangeProgress(thicknessSlider);
        }
        const thicknessSliders = document.querySelectorAll('.stroke-width-slider');
        thicknessSliders.forEach(s => {
            s.value = this.app.state.strokeWidth;
            if (window.updateRangeProgress) window.updateRangeProgress(s);
        });
        const thicknessVal = document.getElementById('strokeWidthVal');
        if (thicknessVal) thicknessVal.textContent = this.app.state.strokeWidth + 'px';

        const opacitySlider = document.getElementById('opacitySlider');
        if (opacitySlider) {
            opacitySlider.value = Math.round(this.app.state.opacity * 100);
            if (window.updateRangeProgress) window.updateRangeProgress(opacitySlider);
        }
        const opacitySliders = document.querySelectorAll('.opacity-slider');
        opacitySliders.forEach(s => {
            s.value = Math.round(this.app.state.opacity * 100);
            if (window.updateRangeProgress) window.updateRangeProgress(s);
        });
        const opacityVal = document.getElementById('opacityVal');
        if (opacityVal) opacityVal.textContent = Math.round(this.app.state.opacity * 100) + '%';

        // Sync Active Buttons
        document.querySelectorAll('.tool-btn[data-linestyle]').forEach(b => b.classList.toggle('active', b.dataset.linestyle === this.app.state.lineStyle));
        document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(b => b.classList.toggle('active', b.dataset.highlighterCap === this.app.state.highlighterCap));
        document.querySelectorAll('.tool-btn[data-arrow-start]').forEach(b => b.classList.toggle('active', b.dataset.arrowStart === this.app.state.arrowStartStyle));
        document.querySelectorAll('.tool-btn[data-arrow-end]').forEach(b => b.classList.toggle('active', b.dataset.arrowEnd === this.app.state.arrowEndStyle));
        document.querySelectorAll('.tool-btn[data-arrow-path]').forEach(b => b.classList.toggle('active', b.dataset.arrowPath === this.app.state.arrowPathType));

        // Tape Specific UI Sync
        const tapeSettingsGroup = document.getElementById('tapeSettings');
        if (tapeSettingsGroup) {
            let showTapeGroup = (tool === 'tape');
            let activeTapeSettings = (this.app.tools.tape) ? { ...this.app.tools.tape.settings } : null;

            if (tool === 'select') {
                const selectTool = this.app.tools.select;
                if (selectTool.selectedObjects.length === 1) {
                    const obj = this.app.state.objects[selectTool.selectedObjects[0]];
                    if (obj && obj.type === 'tape') {
                        showTapeGroup = true;
                        activeTapeSettings = {
                            mode: obj.mode,
                            pattern: obj.pattern
                        };
                    }
                }
            }

            tapeSettingsGroup.style.display = showTapeGroup ? 'flex' : 'none';

            if (showTapeGroup && activeTapeSettings) {
                document.querySelectorAll('.tool-btn[data-tape-mode]').forEach(b =>
                    b.classList.toggle('active', b.dataset.tapeMode === activeTapeSettings.mode)
                );
                document.querySelectorAll('.pattern-btn[data-tape-pattern]').forEach(b =>
                    b.classList.toggle('active', b.dataset.tapePattern === activeTapeSettings.pattern)
                );
            }
        }

        // Sync Color Palette
        if (this.app.colorPalette) this.app.colorPalette.renderColors();
        // We removed the forced reset to 1.0 for pen/shapes to allow persistent user choice.

        // Pressure Logic
        const pressureBtn = document.getElementById('pressureBtn');
        if (tool === 'pen') {

            pressureBtn.style.display = 'flex';
            pressureBtn.classList.toggle('active', this.app.state.pressureEnabled);
        } else if (['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud', 'line'].includes(tool)) {
            pressureBtn.style.display = 'flex';
            pressureBtn.classList.remove('active');
        } else {
            pressureBtn.style.display = 'none';
        }

        // Brush Settings Visibility Logic
        const isFreehand = (tool === 'pen' || tool === 'highlighter' || tool === 'tape');
        const showBrushSettings = ['pen', 'highlighter', 'rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud', 'line', 'arrow', 'select', 'tape'].includes(tool);

        const brushSettingsGroup = document.getElementById('toolGroupBrushSettings');
        const lineStylesGroup = document.getElementById('toolGroupLineStyles');
        const selectSettingsGroup = document.getElementById('selectSettings');

        if (selectSettingsGroup) {
            selectSettingsGroup.style.display = (tool === 'select') ? 'flex' : 'none';
        }

        const selectTool = this.app.tools.select;
        // If Select tool has NO selection, maybe hide brush settings? 
        // Current logic shows brush settings for 'select' tool anyway, which might be intended (global context or previous selection?). 
        // But usually, properties are only relevant if something is selected.
        // The existing code at line ~628 processes 'select' tool selection. 
        // If selection is empty, we might want to hide brush properties but show Select Mode.
        // However, keeping it simple: Just add Select Settings group control.

        if (brushSettingsGroup) {
            brushSettingsGroup.style.display = showBrushSettings ? 'flex' : 'none';
        }
        if (lineStylesGroup) {
            // Hide line styles for tape tool as requested
            const showLineStyles = showBrushSettings && tool !== 'tape';
            lineStylesGroup.style.display = showLineStyles ? 'flex' : 'none';
        }

        if (brushSettingsGroup) {
            // Also manage internal visibility of stabilization/decimation inside the popup
            const stabItem = document.querySelector('#popupBrushSettings .brush-setting-item:nth-child(3)');
            const decItem = document.querySelector('#popupBrushSettings .brush-setting-item:nth-child(4)');

            if (stabItem) stabItem.style.display = isFreehand ? 'block' : 'none';
            if (decItem) decItem.style.display = isFreehand ? 'block' : 'none';
        }

        // Line Style Logic: Hide wavy for rect/ellipse
        const wavyBtn = document.querySelector('.tool-btn[data-linestyle="wavy"]');
        if (wavyBtn) {
            let showWavy = true;
            if (['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(tool)) {
                showWavy = false;
            } else if (tool === 'select') {
                const selectTool = this.app.tools.select;
                if (selectTool.selectedObjects.length > 0) {
                    const hasShape = selectTool.selectedObjects.some(index => {
                        const obj = this.app.state.objects[index];
                        return obj && ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(obj.type);
                    });
                    if (hasShape) showWavy = false;
                }
            }

            wavyBtn.style.display = showWavy ? 'flex' : 'none';

            // If wavy was selected but now hidden, fallback to solid
            if (!showWavy && this.app.state.lineStyle === 'wavy') {
                this.app.state.lineStyle = 'solid';
                document.querySelectorAll('.tool-btn[data-linestyle]').forEach(b => b.classList.remove('active'));
                const solidBtn = document.querySelector('.tool-btn[data-linestyle="solid"]');
                if (solidBtn) solidBtn.classList.add('active');

                // Update selection if needed
                if (tool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { lineStyle: 'solid' });
                    this.app.render();
                }
            }
        }

        // Toggle Highlighter Settings visibility
        if (tool === 'highlighter') {
            document.getElementById('highlighterSettings').style.display = 'flex';
        } else {
            document.getElementById('highlighterSettings').style.display = 'none';
        }

        // Toggle Arrow Settings visibility
        if (tool === 'arrow') {
            document.getElementById('arrowSettings').style.display = 'flex';
            document.getElementById('arrowPathSettings').style.display = 'flex';
        } else {
            document.getElementById('arrowSettings').style.display = 'none';
            document.getElementById('arrowPathSettings').style.display = 'none';
        }

        // Toggle Eraser Settings visibility
        if (tool === 'eraser') {
            document.getElementById('eraserSettings').style.display = 'flex';
        } else {
            document.getElementById('eraserSettings').style.display = 'none';
        }

        // Table Settings grouped
        const tableGroup = document.getElementById('toolGroupTable');
        if (tableGroup) {
            tableGroup.style.display = (tool === 'table') ? 'flex' : 'none';
        }

        // Arrow Settings grouped
        const arrowGroup = document.getElementById('toolGroupArrow');
        if (arrowGroup) {
            arrowGroup.style.display = (tool === 'arrow') ? 'flex' : 'none';
        }

        // Toggle Sticker Settings visibility
        const stickerSettings = document.getElementById('stickerSettings');
        if (stickerSettings) {
            if (tool === 'sticker') {
                stickerSettings.style.display = 'flex';
                if (this.app.tools.sticker) {
                    this.app.tools.sticker.renderStickersToSidebar();
                }
            } else {
                stickerSettings.style.display = 'none';
            }
        }


        // Toggle Shape Settings visibility
        const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
        const shapeSettings = document.getElementById('shapeSettings');
        if (shapeSettings) {
            const isShapeActive = shapes.includes(tool);
            shapeSettings.style.display = isShapeActive ? 'flex' : 'none';
            if (isShapeActive) {
                document.querySelectorAll('#shapeSettings .tool-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.tool === tool)
                );
            }
        }

        // Fill Settings Visibility
        const fillSettings = document.getElementById('fillSettings');
        const fillBtn = document.getElementById('btnFillToggle');

        if (fillSettings && fillBtn) {
            let showFill = false;
            let isFilled = false;
            const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];

            if (tool === 'select') {
                const selectTool = this.app.tools.select;
                if (selectTool.selectedObjects.length === 1) {
                    const objIndex = selectTool.selectedObjects[0];
                    const obj = this.app.state.objects[objIndex];
                    if (obj) {
                        if (shapes.includes(obj.type)) {
                            showFill = true;
                            isFilled = !!obj.filled;
                        } else if (obj.type === 'pen' || obj.type === 'highlighter') {
                            const canFill = this.app.fillManager && this.app.fillManager.canBeFilled(obj);
                            if (canFill) {
                                showFill = true;
                                isFilled = !!obj.filled;
                            }
                        }
                    }
                }
            } else if (['pen', ...shapes].includes(tool)) {
                // Show for pen tools and shapes to allow live toggle
                showFill = true;
                isFilled = this.app.state.fillEnabled;
            }

            fillSettings.style.display = showFill ? 'flex' : 'none';
            // Only toggle 'active' class, don't mess with click listeners here
            if (showFill) {
                fillBtn.classList.toggle('active', isFilled);
            }
        }

        // Tape Pattern Color Sync
        const patternButtons = document.querySelectorAll('.pattern-btn');
        const currentColor = this.app.state.strokeColor === 'rainbow' ? '#262626' : this.app.state.strokeColor;
        patternButtons.forEach(btn => {
            btn.style.color = currentColor;
            const colorSyncDiv = btn.querySelector('.color-sync');
            if (colorSyncDiv) {
                colorSyncDiv.style.backgroundColor = currentColor;
            }
        });
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    toggle() {
        if (this.container) {
            if (this.container.style.display === 'none' || this.container.style.display === '') {
                this.container.style.display = 'flex';
            } else {
                this.container.style.display = 'none';
            }
        }
    }
}
