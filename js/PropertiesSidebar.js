class PropertiesSidebar {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Opacity Slider
        const opacitySlider = document.getElementById('opacitySlider');
        const opacityVal = document.getElementById('opacityVal');
        opacitySlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.app.state.opacity = val / 100;
            if (opacityVal) opacityVal.textContent = val + '%';

            if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { opacity: this.app.state.opacity });
                this.app.render();
            }
        });

        opacitySlider.addEventListener('change', (e) => {
            if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                this.app.history.saveState(this.app.state.objects);
            }
        });

        // Stroke Width Slider
        const widthSlider = document.getElementById('strokeWidth');
        const widthVal = document.getElementById('strokeWidthVal');
        widthSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.app.state.strokeWidth = val;
            if (widthVal) widthVal.textContent = val;

            if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { width: this.app.state.strokeWidth });
                this.app.render();
            }
        });

        widthSlider.addEventListener('change', (e) => {
            if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
                this.app.history.saveState(this.app.state.objects);
            }
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
                    this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { lineStyle: style });
                    this.app.render();
                    this.app.history.saveState(this.app.state.objects);
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

        const closeAllPopups = () => {
            if (popupStart) popupStart.style.display = 'none';
            if (popupEnd) popupEnd.style.display = 'none';
            if (btnStartTrigger) btnStartTrigger.classList.remove('active');
            if (btnEndTrigger) btnEndTrigger.classList.remove('active');
        };

        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.property-trigger-btn') && !e.target.closest('.property-popup')) {
                closeAllPopups();
            }
        });

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
        if (tool === 'highlighter') {
            this.app.state.opacity = 0.7;
            document.getElementById('opacitySlider').value = 70;
            const opacityVal = document.getElementById('opacityVal');
            if (opacityVal) opacityVal.textContent = '70%';
        } else if (['pen', 'line', 'rectangle', 'ellipse'].includes(tool)) {
            this.app.state.opacity = 1.0;
            document.getElementById('opacitySlider').value = 100;
            const opacityVal = document.getElementById('opacityVal');
            if (opacityVal) opacityVal.textContent = '100%';
        }

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
