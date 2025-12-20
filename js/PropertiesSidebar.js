class PropertiesSidebar {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.isInteractionStarted = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Opacity Slider Sync
        const opacitySliders = document.querySelectorAll('.opacity-slider');
        const opacityVal = document.getElementById('opacityVal');
        const opacityValMobile = document.getElementById('opacityValMobile');
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
                if (opacityValMobile) opacityValMobile.textContent = val + '%';
                // Sync all opacity sliders
                opacitySliders.forEach(s => { if (s !== e.target) s.value = val; });

                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { opacity: this.app.state.opacity });
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
        const widthValMobile = document.getElementById('strokeWidthValMobile');
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
                if (widthValMobile) widthValMobile.textContent = val;
                // Sync all width sliders
                widthSliders.forEach(s => { if (s !== e.target) s.value = val; });

                if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { width: this.app.state.strokeWidth });
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
        const stabValMobile = document.getElementById('stabilizationValMobile');
        stabSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.app.state.stabilization = val / 100;
                if (stabVal) stabVal.textContent = val;
                if (stabValMobile) stabValMobile.textContent = val;
                // Sync all stabilization sliders
                stabSliders.forEach(s => { if (s !== e.target) s.value = val; });
            });
        });

        // Decimation Slider Sync
        const decSliders = document.querySelectorAll('.decimation-slider');
        const decVal = document.getElementById('decimationVal');
        const decValMobile = document.getElementById('decimationValMobile');
        decSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.app.state.decimation = val / 100;
                if (decVal) decVal.textContent = val;
                if (decValMobile) decValMobile.textContent = val;
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
                    this.app.render();
                }
            });
        });

        // Highlighter Cap Settings
        document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cap = btn.dataset.highlighter - cap;
                // Note: dataset prop for 'data-highlighter-cap' becomes 'highlighterCap' in JS camelCase
                const capValue = btn.dataset.highlighterCap;

                this.app.state.highlighterCap = capValue;

                // UI Update
                document.querySelectorAll('.tool-btn[data-highlighter-cap]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
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
            });
        });

        // Arrow Path Type Settings (toggle behavior)
        document.querySelectorAll('.tool-btn[data-arrow-path]').forEach(btn => {
            btn.addEventListener('click', () => {
                const pathType = btn.dataset.arrowPath;
                const isActive = btn.classList.contains('active');

                // Toggle: clicking active button returns to straight
                if (isActive) {
                    this.app.state.arrowPathType = 'straight';
                    btn.classList.remove('active');
                } else {
                    this.app.state.arrowPathType = pathType;
                    // Deactivate all others
                    document.querySelectorAll('.tool-btn[data-arrow-path]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
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
                const isVisible = colorSidebar.classList.contains('show');
                closeAllPopups();
                if (!isVisible) {
                    colorSidebar.classList.add('show');
                    btnColorToggle.classList.add('active');
                } else {
                    colorSidebar.classList.remove('show');
                    btnColorToggle.classList.remove('active');
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
                }
            });
        }

        // Mobile Triggers (Individual popups)
        ['Thickness', 'Opacity', 'Stabilization', 'Decimation'].forEach(name => {
            const btn = document.getElementById(`btn${name}Trigger`);
            const popup = document.getElementById(`popup${name}`);
            if (btn && popup) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = popup.classList.contains('show');
                    closeAllPopups();
                    if (!isVisible) {
                        popup.classList.add('show');
                        btn.classList.add('active');
                    }
                });
            }
        });

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
    }

    updateUIForTool(tool) {
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
        if (tool === 'pen') {
            this.app.state.pressureEnabled = true;
            pressureBtn.classList.add('active');
            pressureBtn.style.display = 'flex'; // Show for pen
        } else if (['line', 'rectangle', 'ellipse'].includes(tool)) {
            this.app.state.pressureEnabled = false;
            pressureBtn.classList.remove('active');
            pressureBtn.style.display = 'flex'; // Show for shapes
        } else if (tool === 'arrow') {
            this.app.state.pressureEnabled = false;
            pressureBtn.classList.remove('active');
            pressureBtn.style.display = 'none'; // Hide for arrow
        }

        // Brush Settings Visibility Logic
        const isFreehand = (tool === 'pen' || tool === 'highlighter');
        const showBrushSettings = ['pen', 'highlighter', 'rectangle', 'ellipse', 'line', 'arrow', 'select'].includes(tool);

        // Desktop Unified Settings
        const brushSettingsGroup = document.getElementById('toolGroupBrushSettings');
        if (brushSettingsGroup) {
            brushSettingsGroup.style.display = showBrushSettings ? 'flex' : 'none';

            // Also manage internal visibility of stabilization/decimation inside the popup
            const stabItem = document.querySelector('#popupBrushSettings .brush-setting-item:nth-child(3)');
            const decItem = document.querySelector('#popupBrushSettings .brush-setting-item:nth-child(4)');

            if (stabItem) stabItem.style.display = isFreehand ? 'block' : 'none';
            if (decItem) decItem.style.display = isFreehand ? 'block' : 'none';
        }

        // Mobile Individual Groups
        ['Thickness', 'Opacity'].forEach(id => {
            const group = document.getElementById(`toolGroup${id}`);
            if (group) group.style.display = showBrushSettings ? 'flex' : 'none';
        });
        ['Stabilization', 'Decimation'].forEach(id => {
            const group = document.getElementById(`toolGroup${id}`);
            if (group) group.style.display = isFreehand ? 'flex' : 'none';
        });

        // Line Style Logic: Hide wavy for rect/ellipse
        const wavyBtn = document.querySelector('.tool-btn[data-linestyle="wavy"]');
        if (wavyBtn) {
            let showWavy = true;
            if (tool === 'rectangle' || tool === 'ellipse') {
                showWavy = false;
            } else if (tool === 'select') {
                const selectTool = this.app.tools.select;
                if (selectTool.selectedObjects.length > 0) {
                    const hasShape = selectTool.selectedObjects.some(index => {
                        const obj = this.app.state.objects[index];
                        return obj && (obj.type === 'rectangle' || obj.type === 'ellipse');
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
    }
}
