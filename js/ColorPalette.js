class ColorPalette {
    constructor(app) {
        this.app = app;
        // Tldraw'a benzer varsayılan renkler
        this.defaultColors = [
            '#000000', // Siyah
            '#737373', // Gri
            '#e0e0e0', // Açık Gri (Beyaz yerine canvas üstünde görünsün diye hafif gri)
            '#ff5c5c', // Açık Kırmızı
            '#ffb85c', // Turuncu
            '#ffed5c', // Sarı
            '#5cbd62', // Yeşil
            '#5ce1e6', // Camgöbeği
            '#5c9bfe', // Mavi
            '#b45cff', // Mor
            '#ff5ce0', // Pembe
            '#e65c5c'  // Koyu Kırmızı (veya kullanıcının değiştireceği bir renk)
        ];

        // Kayıtlı renkleri yükle veya varsayılanları kullan
        const savedColors = localStorage.getItem('whiteboard_colors');
        this.colors = savedColors ? JSON.parse(savedColors) : [...this.defaultColors];

        this.container = null;
        this.picker = null; // Store active picker
        this.tempColors = []; // Temporary clicked colors in picker
        this.init();
    }

    init() {
        this.createSidebar();
        this.renderColors();
        this.setupEventListeners();
    }

    createSidebar() {
        // Sidebar container
        this.container = document.createElement('div');
        this.container.id = 'colorSidebar';
        this.container.className = 'floating-sidebar';
        document.body.appendChild(this.container);

        // Renk listesi container
        this.colorList = document.createElement('div');
        this.colorList.className = 'color-list';
        this.container.appendChild(this.colorList);

        // Ekleme butonu
        this.addButton = document.createElement('button');
        this.addButton.className = 'add-color-btn';
        this.addButton.title = 'Renk Ekle';
        this.addButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
            </svg>
        `;
        this.container.appendChild(this.addButton);
    }

    renderColors() {
        this.colorList.innerHTML = '';

        // Fixed Rainbow Button
        const rainbowBtn = document.createElement('button');
        rainbowBtn.className = 'color-btn rainbow-btn';
        if (this.app.state.strokeColor === 'rainbow') {
            rainbowBtn.classList.add('active');
        }
        rainbowBtn.title = 'Gökkuşağı';
        rainbowBtn.onclick = () => this.selectColor('rainbow');
        // Prevent context menu (deletion) for rainbow button
        rainbowBtn.oncontextmenu = (e) => e.preventDefault();
        this.colorList.appendChild(rainbowBtn);

        this.colors.forEach((color, index) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.dataset.index = index;
            btn.dataset.color = color;

            // Aktif renk kontrolü
            if (color.toLowerCase() === this.app.state.strokeColor.toLowerCase()) {
                btn.classList.add('active');
            }

            // Sol tık: Seç
            btn.addEventListener('click', (e) => {
                this.selectColor(color);
            });

            // Sağ tık: Menü (Sil/Değiştir)
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, index);
            });

            this.colorList.appendChild(btn);
        });
    }

    selectColor(color) {
        this.app.state.strokeColor = color;

        // UI Güncelle
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = this.colorList.querySelector(`[data-color="${color}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Seçili nesne varsa güncelle
        if (this.app.state.currentTool === 'select' && this.app.tools.select.selectedObjects.length > 0) {
            this.app.tools.select.updateSelectedObjectsStyle(this.app.state, { color: color });
            this.app.redrawOffscreen();
            this.app.render();
            // History kaydet
            this.app.history.saveState(this.app.state.objects);
        }
    }

    addColor() {
        this.showColorPicker('#000000', (newColor) => {
            this.colors.push(newColor);
            this.saveColors();
            this.renderColors();
            this.selectColor(newColor);
        });
    }

    editColor(index) {
        const currentColor = this.colors[index];
        this.showColorPicker(currentColor, (newColor) => {
            this.colors[index] = newColor;
            this.saveColors();
            this.renderColors();
            this.selectColor(newColor);
        });
    }

    deleteColor(index) {
        if (confirm('Bu rengi silmek istediğinizden emin misiniz?')) {
            this.colors.splice(index, 1);
            this.saveColors();
            this.renderColors();
            // Eğer silinen renk aktifse, varsayılan siyaha dön
            if (this.colors.length > 0) {
                this.selectColor(this.colors[0]);
            }
        }
    }

    saveColors() {
        localStorage.setItem('whiteboard_colors', JSON.stringify(this.colors));
    }

    setupEventListeners() {
        this.addButton.addEventListener('click', () => this.addColor());
    }

    showContextMenu(e, index) {
        // Varsa eski menüyü kaldır
        const oldMenu = document.getElementById('colorContextMenu');
        if (oldMenu) oldMenu.remove();

        // Menü oluştur
        const menu = document.createElement('div');
        menu.id = 'colorContextMenu';
        menu.className = 'context-menu show'; // show class'ı ile görünür yap
        menu.style.left = `${e.clientX + 10}px`;
        if (e.clientY > window.innerHeight / 2) {
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - e.clientY) + 'px';
        } else {
            menu.style.top = `${e.clientY}px`;
            menu.style.bottom = 'auto';
        }
        menu.innerHTML = `
            <div class="context-menu-item" id="editColorBtn">
                <span class="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m 18.87,9.11 -3.9,-3.94 M 8.27,19.69 4.37,15.75 M 17,3 a 2.83,2.83 0 1 1 4,4 L 7.5,20.5 2,22 3.5,16.5 Z" />
                    </svg>
                </span>
                <span>Değiştir</span>
            </div>
            <div class="context-menu-item" id="deleteColorBtn">
                <span class="menu-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m 16.27,6.01 v -2 c 0,-1.1 -0.9,-2 -2,-2 L 10,2 C 8.9,2 8,2.9 8,4 v 2 m 11,0 v 14 c 0,1.1 -0.9,2 -2,2 H 7 C 5.9,22 5,21.1 5,20 V 6 M 3,6 h 2 16" />
                    </svg>
                </span>
                <span>Sil</span>
            </div>
        `;

        document.body.appendChild(menu);

        // Eventler
        menu.querySelector('#editColorBtn').onclick = () => {
            this.editColor(index);
            menu.remove();
        };
        menu.querySelector('#deleteColorBtn').onclick = () => {
            this.deleteColor(index);
            menu.remove();
        };

        // Dışarı tıklayınca kapat
        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        // Timeout ile ekle ki hemen tetiklenmesin
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    // --- Custom Color Wheel Implementation ---
    // --- Custom Color Wheel Implementation ---
    showColorPicker(initialColor, onSelect) {
        // Remove existing picker if any
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }

        this.tempColors = [];

        let selectedColor = initialColor;
        let [h, s, l] = this.hexToHsl(selectedColor);

        const picker = document.createElement('div');
        picker.className = 'custom-color-picker';

        // Updated Layout Structure
        picker.innerHTML = `
            <div class="picker-header">Renk Seçin</div>
            
            <div class="picker-main-content" style="display: flex; gap: 12px; margin-bottom: 9px;">
                <div class="picker-wheel-section">
                    <canvas id="colorWheelCanvas" width="150" height="150"></canvas>
                </div>
                <div class="picker-sliders" style="display: flex; flex-direction: column; justify-content: center; gap: 8px; flex: 1;">
                    <div class="slider-row" style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; width: 12px; color: #666;">H</label>
                        <input type="range" class="hsl-slider" id="hueSlider" min="0" max="360" value="${h}">
                    </div>
                    <div class="slider-row" style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; width: 12px; color: #666;">S</label>
                        <input type="range" class="hsl-slider" id="satSlider" min="0" max="100" value="${s}">
                    </div>
                    <div class="slider-row" style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; width: 12px; color: #666;">L</label>
                        <input type="range" class="hsl-slider" id="lightSlider" min="0" max="100" value="${l}">
                    </div>
                </div>
            </div>
            
            <div class="picker-temp-colors" style="margin-bottom: 9px; min-height: 18px;">
                 <div class="temp-colors-list" style="display: flex; gap: 3px; overflow-x: auto; padding: 2px;"></div>
            </div>

            <div class="picker-input-row" style="display: flex; gap: 6px; align-items: center;">
                <div class="picker-preview" style="background-color: ${selectedColor}; width: 24px; height: 24px; border-radius: 4px; border: 1px solid #e0e0e0;"></div>
                <input type="text" class="picker-hex-input" value="${selectedColor}" maxlength="7" style="flex: 1; border: 1px solid #e0e0e0; border-radius: 4px; padding: 3px 6px; font-size: 10px; font-family: monospace;">
            </div>
            <div class="picker-actions">
                <button class="picker-add-btn">Ekle / Seç</button>
            </div>
        `;

        document.body.appendChild(picker);
        this.picker = picker;

        // Positioning logic - next to Add Button
        const rect = this.addButton.getBoundingClientRect();
        picker.style.left = `${rect.right + 9}px`;
        picker.style.top = `${Math.min(window.innerHeight - picker.offsetHeight - 15, Math.max(15, rect.top))}px`;

        // Canvas Implementation
        const canvas = picker.querySelector('#colorWheelCanvas');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2;

        const drawWheel = () => {
            if (ctx.createConicGradient) {
                const gradient = ctx.createConicGradient(0, centerX, centerY);
                gradient.addColorStop(0, "red");
                gradient.addColorStop(0.17, "yellow");
                gradient.addColorStop(0.33, "green");
                gradient.addColorStop(0.5, "cyan");
                gradient.addColorStop(0.66, "blue");
                gradient.addColorStop(0.83, "magenta");
                gradient.addColorStop(1, "red");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                ctx.fillStyle = "red";
                ctx.fill();
            }

            const whiteGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            whiteGradient.addColorStop(0, "white");
            whiteGradient.addColorStop(1, "transparent");

            ctx.fillStyle = whiteGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();
        };

        drawWheel();

        // UI Accessors
        const previewBox = picker.querySelector('.picker-preview');
        const hexInput = picker.querySelector('.picker-hex-input');
        const tempColorsList = picker.querySelector('.temp-colors-list');
        const hueSlider = picker.querySelector('#hueSlider');
        const satSlider = picker.querySelector('#satSlider');
        const lightSlider = picker.querySelector('#lightSlider');

        const updateSelectedColor = (color, updateSliders = true) => {
            selectedColor = color;
            previewBox.style.backgroundColor = color;
            hexInput.value = color;

            if (updateSliders) {
                const [h, s, l] = this.hexToHsl(color);
                hueSlider.value = h;
                satSlider.value = s;
                lightSlider.value = l;
            }
        };

        const renderTempColors = () => {
            tempColorsList.innerHTML = '';
            this.tempColors.forEach((color) => {
                const chip = document.createElement('div');
                chip.className = 'temp-color-chip';
                chip.style.backgroundColor = color;

                chip.onclick = () => {
                    updateSelectedColor(color, true);
                };

                tempColorsList.appendChild(chip);
            });
        };

        const handleCanvasEvent = (e, isClick = false) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor(e.clientX - rect.left);
            const y = Math.floor(e.clientY - rect.top);

            const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            if (dist <= radius) {
                const imageData = ctx.getImageData(x, y, 1, 1).data;
                if (imageData[3] === 0) return;

                const hex = "#" + ((1 << 24) + (imageData[0] << 16) + (imageData[1] << 8) + imageData[2]).toString(16).slice(1);

                if (isClick) {
                    // Save to history
                    if (!this.tempColors.includes(hex)) {
                        this.tempColors.push(hex);
                        if (this.tempColors.length > 8) this.tempColors.shift();
                        renderTempColors();
                    }
                    updateSelectedColor(hex, true);
                } else {
                    // Preview on hover
                    previewBox.style.backgroundColor = hex;
                    hexInput.value = hex;

                    // Update internal variable but maybe not sliders to avoid erratic jumping?
                    // User requested "siyah rengini bu cember ile olusturamiyorum".
                    // Interaction: User clicks wheel -> Color selected -> Sliders update.
                    // User drags sliders -> Color updates.
                    // Hover shouldn't abruptly change sliders or it feels janky.
                    // But if we don't update selectedColor, clicking Add might be wrong.
                    selectedColor = hex;
                    // Note: Not updating sliders on hover for smoother experience
                }
            }
        };

        canvas.addEventListener('mousemove', (e) => {
            handleCanvasEvent(e, false);
        });

        canvas.addEventListener('mousedown', (e) => {
            handleCanvasEvent(e, true);
        });

        // Slider Events
        const handleSliderChange = () => {
            const h = parseInt(hueSlider.value);
            const s = parseInt(satSlider.value);
            const l = parseInt(lightSlider.value);
            const hex = this.hslToHex(h, s, l);

            selectedColor = hex;
            previewBox.style.backgroundColor = hex;
            hexInput.value = hex;
        };

        hueSlider.addEventListener('input', handleSliderChange);
        satSlider.addEventListener('input', handleSliderChange);
        lightSlider.addEventListener('input', handleSliderChange);

        // Hex Input
        hexInput.oninput = (e) => {
            let val = e.target.value;
            if (val.length === 7 && val.startsWith('#')) {
                updateSelectedColor(val, true);
            }
        };

        // Confirm Button
        picker.querySelector('.picker-add-btn').onclick = () => {
            onSelect(selectedColor);
            picker.remove();
            this.picker = null;
            document.removeEventListener('mousedown', closePicker);
        };

        // Close when clicking outside
        const closePicker = (e) => {
            if (!picker.contains(e.target) && !this.addButton.contains(e.target)) {
                picker.remove();
                this.picker = null;
                document.removeEventListener('mousedown', closePicker);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closePicker), 0);
    }

    // --- Helpers ---
    hexToHsl(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        } else if (hex.length === 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        r /= 255;
        g /= 255;
        b /= 255;
        let cmin = Math.min(r, g, b),
            cmax = Math.max(r, g, b),
            delta = cmax - cmin,
            h = 0,
            s = 0,
            l = 0;

        if (delta == 0)
            h = 0;
        else if (cmax == r)
            h = ((g - b) / delta) % 6;
        else if (cmax == g)
            h = (b - r) / delta + 2;
        else
            h = (r - g) / delta + 4;

        h = Math.round(h * 60);

        if (h < 0)
            h += 360;

        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);

        return [h, s, l];
    }

    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
            m = l - c / 2,
            r = 0,
            g = 0,
            b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }
        r = Math.round((r + m) * 255).toString(16);
        g = Math.round((g + m) * 255).toString(16);
        b = Math.round((b + m) * 255).toString(16);

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;

        return "#" + r + g + b;
    }
}
