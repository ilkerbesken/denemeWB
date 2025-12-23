class PropertiesSidebar {
    constructor(app) {
        this.app = app;
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
                if (widthVal) widthVal.textContent = val;
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
                if (stabVal) stabVal.textContent = val;
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
                if (decVal) decVal.textContent = val;
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

        const closeAllPopups = () => {
            if (popupStart) popupStart.style.display = 'none';
            if (popupEnd) popupEnd.style.display = 'none';
            if (btnStartTrigger) btnStartTrigger.classList.remove('active');
            if (btnEndTrigger) btnEndTrigger.classList.remove('active');

            if (popupBrushSettings) popupBrushSettings.style.display = 'none';
            if (btnBrushSettingsTrigger) btnBrushSettingsTrigger.classList.remove('active');

            // Close mobile popups
            ['Thickness', 'Opacity', 'Stabilization', 'Decimation'].forEach(name => {
                const popup = document.getElementById(`popup${name}`);
                const btn = document.getElementById(`btn${name}Trigger`);
                if (popup) popup.classList.remove('show');
                if (btn) btn.classList.remove('active');
            });
        };

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

        // Close popups on sidebar scroll
        if (this.container) {
            this.container.addEventListener('scroll', () => {
                closeAllPopups();
            }, { passive: true });
        }
    }

    positionPopup(trigger, popup) {
        const rect = trigger.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = (rect.bottom + 8) + 'px';
        popup.style.left = rect.left + 'px';
        popup.style.transform = 'none';
        popup.style.zIndex = '1001'; // Ensure it is above everything
    }

    updateUIForTool(tool) {
        if (!this.container) return;
        this.container.style.display = 'flex';

        // Sync UI with selection if in select tool
        if (tool === 'select') {
            const selectTool = this.app.tools.select;
            if (selectTool.selectedObjects.length === 1) {
                const obj = this.app.state.objects[selectTool.selectedObjects[0]];
                if (obj) {
                    const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                    // Update State to match selected object (so subsequent changes are relative to it)
                    if (shapes.includes(obj.type)) {
                        if (obj.strokeWidth !== undefined) this.app.state.strokeWidth = obj.strokeWidth;
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

                    // Sync Sliders
                    const thicknessSliders = document.querySelectorAll('.stroke-width-slider');
                    thicknessSliders.forEach(s => {
                        s.value = this.app.state.strokeWidth;
                        if (window.updateRangeProgress) window.updateRangeProgress(s);
                    });
                    const thicknessVal = document.getElementById('strokeWidthVal');
                    if (thicknessVal) thicknessVal.textContent = this.app.state.strokeWidth;

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
                    document.querySelectorAll('#shapeSettings .tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === obj.type));

                    // Sync Color Palette
                    if (this.app.colorPalette) this.app.colorPalette.renderColors();
                }
            }
        }

        // Opacity Logic
        // We only want to set a default opacity when switching to a tool that specifically 
        // benefits from it (like highlighter), but we shouldn't reset it every time 
        // if the user is just switching between similar tools.
        if (tool === 'highlighter') {
            // Only force 70% if it was fully opaque, to allow user to customize highlighter too
            if (this.app.state.opacity === 1.0) {
                this.app.state.opacity = 0.7;
                document.getElementById('opacitySlider').value = 70;
                const opacityVal = document.getElementById('opacityVal');
                if (opacityVal) opacityVal.textContent = '70%';
            }
        }
        // We removed the forced reset to 1.0 for pen/shapes to allow persistent user choice.

        // Pressure Logic
        const pressureBtn = document.getElementById('pressureBtn');
        if (tool === 'pen' || tool === 'highlighter') {
            pressureBtn.style.display = 'flex';
            pressureBtn.classList.toggle('active', this.app.state.pressureEnabled);
        } else if (['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud', 'line'].includes(tool)) {
            pressureBtn.style.display = 'flex';
            pressureBtn.classList.remove('active');
        } else {
            pressureBtn.style.display = 'none';
        }

        // Brush Settings Visibility Logic
        const isFreehand = (tool === 'pen' || tool === 'highlighter');
        const showBrushSettings = ['pen', 'highlighter', 'rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud', 'line', 'arrow', 'select'].includes(tool);

        const brushSettingsGroup = document.getElementById('toolGroupBrushSettings');
        const lineStylesGroup = document.getElementById('toolGroupLineStyles');

        if (brushSettingsGroup) {
            brushSettingsGroup.style.display = showBrushSettings ? 'flex' : 'none';
        }
        if (lineStylesGroup) {
            lineStylesGroup.style.display = showBrushSettings ? 'flex' : 'none';
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
            } else if (['pen', 'highlighter', ...shapes].includes(tool)) {
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
