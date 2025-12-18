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
                <span class="menu-icon">✏️</span>
                <span>Değiştir</span>
            </div>
            <div class="context-menu-item" id="deleteColorBtn">
                <span class="menu-icon">🗑️</span>
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
    showColorPicker(initialColor, onSelect) {
        // Remove existing picker if any
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }

        // Reset temp colors on new open or keep? 
        // Let's reset for cleaner UX per session, or keep if user wants to persist across closes?
        // User said "temporarily listed". Let's reset.
        this.tempColors = [];

        let selectedColor = initialColor;

        const picker = document.createElement('div');
        picker.className = 'custom-color-picker';

        picker.innerHTML = `
            <div class="picker-header">Renk Seçin</div>
            <div class="picker-canvas-container">
                <canvas id="colorWheelCanvas" width="150" height="150"></canvas>
            </div>
            
            <div class="picker-temp-colors" style="margin-bottom: 9px; min-height: 18px;">
                 <div class="temp-colors-list" style="display: flex; gap: 3px; overflow-x: auto; padding: 2px;"></div>
            </div>

            <div class="picker-input-row">
                <div class="picker-preview" style="background-color: ${selectedColor}"></div>
                <input type="text" class="picker-hex-input" value="${selectedColor}" maxlength="7">
            </div>
            <div class="picker-actions">
                <button class="picker-add-btn">Ekle / Seç</button>
            </div>
        `;

        document.body.appendChild(picker);
        this.picker = picker;

        // Positioning logic - next to Add Button
        const rect = this.addButton.getBoundingClientRect();
        picker.style.left = `${rect.right + 9}px`; // 9px margin (75% of 12)
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

        const updateSelectedColor = (color) => {
            selectedColor = color;
            previewBox.style.backgroundColor = color;
            hexInput.value = color;
        };

        const renderTempColors = () => {
            tempColorsList.innerHTML = '';
            this.tempColors.forEach((color) => {
                const chip = document.createElement('div');
                chip.className = 'temp-color-chip';
                chip.style.backgroundColor = color;

                chip.onclick = () => {
                    updateSelectedColor(color);
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
                        if (this.tempColors.length > 8) this.tempColors.shift(); // Max 8 colors
                        renderTempColors();
                    }
                    updateSelectedColor(hex);
                } else {
                    // Just preview on hover
                    // Optional: maybe distinct Preview vs Selected state?
                    // User asked: "mouse hangi noktadaysa o rengin kodu alt alanda görünsün"
                    // So hover updates preview.
                    previewBox.style.backgroundColor = hex;
                    hexInput.value = hex;
                    // Note: We don't update 'selectedColor' on hover, only on click?
                    // If we don't update selectedColor, clicking 'Add' might add the wrong color if user just hovers.
                    // Usually picker updates value on drag/hover. Let's update selectedColor too.
                    selectedColor = hex;
                }
            }
        };

        canvas.addEventListener('mousemove', (e) => {
            handleCanvasEvent(e, false);
        });

        canvas.addEventListener('mousedown', (e) => {
            handleCanvasEvent(e, true);
        });

        // Hex Input
        hexInput.oninput = (e) => {
            let val = e.target.value;
            if (val.length === 7 && val.startsWith('#')) {
                selectedColor = val;
                previewBox.style.backgroundColor = selectedColor;
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
}
