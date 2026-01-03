class PageManager {
    constructor(app) {
        this.app = app;
        this.pages = [];
        this.currentPageIndex = 0;
        this.sidebar = document.getElementById('pageSidebar');
        this.pageListContainer = document.getElementById('pageList');
        this.addPageBtn = document.getElementById('btnAddPage');
        this.toggleSidebarBtn = document.getElementById('btnTogglePageSidebar');
        this.toggleViewBtn = document.getElementById('btnTogglePageView');

        this.viewMode = 'list'; // 'list' or 'grid'

        this.init();
    }

    init() {
        this.pages.push({
            id: Date.now(),
            name: 'Sayfa 1',
            objects: [...this.app.state.objects],
            backgroundColor: this.app.canvasSettings ? this.app.canvasSettings.settings.backgroundColor : 'white',
            backgroundPattern: this.app.canvasSettings ? this.app.canvasSettings.settings.pattern : 'none',
            thumbnail: null
        });

        if (this.addPageBtn) {
            this.addPageBtn.addEventListener('click', () => this.addNewPage());
        }

        if (this.toggleSidebarBtn) {
            this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.toggleViewBtn) {
            this.toggleViewBtn.addEventListener('click', () => this.toggleViewMode());
        }

        this.renderPageList();
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
        this.renderPageList();
    }

    toggleSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('collapsed');

            // Re-render thumbnails if expanded
            if (!this.sidebar.classList.contains('collapsed')) {
                this.updateCurrentPageThumbnail();
            }
        }
    }

    addNewPage() {
        // Mevcut sayfayı kaydet
        this.saveCurrentPageState();

        // Yeni sayfa oluştur (Mevcut sayfanın ayarlarını kopyalayabiliriz)
        const prevPage = this.pages[this.currentPageIndex];
        const newPage = {
            id: Date.now(),
            name: `Sayfa ${this.pages.length + 1}`,
            objects: [],
            backgroundColor: prevPage ? prevPage.backgroundColor : '#ffffff',
            backgroundPattern: prevPage ? prevPage.backgroundPattern : 'none',
            thumbnail: null
        };

        this.pages.push(newPage);
        this.switchPage(this.pages.length - 1);
    }

    switchPage(index) {
        if (index < 0 || index >= this.pages.length) return;

        // Eğer zaten bu sayfadaysak, her şeyi baştan yüklemeye gerek yok
        if (index === this.currentPageIndex && this.pages.length > 1) {
            return;
        }

        // Mevcut durumu kaydet
        this.saveCurrentPageState();

        // Yeni sayfaya geç
        this.currentPageIndex = index;
        const page = this.pages[index];

        // Uygulama durumunu güncelle
        this.app.state.objects = [...page.objects];

        // Arkaplan ayarlarını yükle
        if (this.app.canvasSettings) {
            this.app.canvasSettings.settings.backgroundColor = page.backgroundColor || 'white';
            this.app.canvasSettings.settings.pattern = page.backgroundPattern || 'none';
            this.app.canvasSettings.applySettings(this.app.canvas, this.app.ctx);

            // UI'ı güncelle (Canvas Settings panelindeki butonlar)
            if (this.app.canvasSettings.loadSettingsToPanel) {
                this.app.canvasSettings.loadSettingsToPanel();
            }
        }

        // Seçimi temizle
        if (this.app.tools.select) {
            this.app.tools.select.selectedObjects = [];
        }

        // Geçmişi temizle
        if (this.app.historyManager) {
            this.app.historyManager.undoStack = [];
            this.app.historyManager.redoStack = [];
        }

        // Kanvası temizle ve yeniden çiz
        this.app.redrawOffscreen();
        this.app.render();

        this.renderPageList();
    }

    saveCurrentPageState() {
        if (this.currentPageIndex >= 0 && this.currentPageIndex < this.pages.length) {
            const page = this.pages[this.currentPageIndex];
            page.objects = [...this.app.state.objects];
            if (this.app.canvasSettings) {
                page.backgroundColor = this.app.canvasSettings.settings.backgroundColor;
                page.backgroundPattern = this.app.canvasSettings.settings.pattern;
            }
            this.updateCurrentPageThumbnail();
        }
    }

    updateCurrentPageThumbnail() {
        if (!this.app.canvas) return;

        // Küçük bir küçük resim oluştur
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const scale = 0.15; // Küçük resim ölçeği

        tempCanvas.width = this.app.canvas.width * scale;
        tempCanvas.height = this.app.canvas.height * scale;

        const page = this.pages[this.currentPageIndex];

        // Arkaplanı çiz
        ctx.fillStyle = page.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Nesneleri çiz
        ctx.save();
        ctx.scale(scale, scale);
        const objectsToDraw = [...this.app.state.objects];
        objectsToDraw.forEach(obj => {
            this.app.drawObject(ctx, obj);
        });
        ctx.restore();

        page.thumbnail = tempCanvas.toDataURL('image/png', 0.5);
        this.renderPageList();
    }

    deletePage(index, event) {
        if (event) event.stopPropagation();
        if (this.pages.length <= 1) return;

        this.pages.splice(index, 1);

        if (this.currentPageIndex >= index) {
            this.currentPageIndex = Math.max(0, this.currentPageIndex - 1);
        }

        const page = this.pages[this.currentPageIndex];
        this.app.state.objects = [...page.objects];
        this.app.redrawOffscreen();
        this.app.render();
        this.renderPageList();
    }

    renderPageList() {
        if (!this.pageListContainer) return;

        this.pageListContainer.innerHTML = '';
        this.pageListContainer.className = `page-list ${this.viewMode}-view`;

        this.pages.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = `page-item ${index === this.currentPageIndex ? 'active' : ''}`;
            item.setAttribute('draggable', 'true');
            item.dataset.index = index;

            // Drag and Drop Events
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e, index));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));

            item.onclick = () => this.switchPage(index);

            const thumb = document.createElement('div');
            thumb.className = 'page-thumb';
            if (page.thumbnail) {
                thumb.style.backgroundImage = `url(${page.thumbnail})`;
            }

            const info = document.createElement('div');
            info.className = 'page-info';

            const name = document.createElement('span');
            name.className = 'page-name';
            name.textContent = page.name;
            name.title = 'İsim değiştirmek için çift tıklayın';

            // Rename logic
            name.addEventListener('click', (e) => {
                e.stopPropagation(); // Tek tıklamanın switchPage'i tetiklemesini engelle
            });

            name.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'page-name-input';
                input.value = page.name;

                const saveName = () => {
                    const newName = input.value.trim() || page.name;
                    this.renamePage(index, newName);
                };

                input.addEventListener('blur', saveName);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') saveName();
                    if (ke.key === 'Escape') this.renderPageList();
                });

                name.replaceWith(input);
                input.focus();
                input.select();
            });

            const actions = document.createElement('div');
            actions.className = 'page-actions';

            if (this.pages.length > 1) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-delete-page';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Sayfayı Sil';
                deleteBtn.onclick = (e) => this.deletePage(index, e);
                actions.appendChild(deleteBtn);
            }

            item.appendChild(thumb);
            info.appendChild(name);
            item.appendChild(info);
            item.appendChild(actions);

            this.pageListContainer.appendChild(item);
        });
    }

    handleDragStart(e, index) {
        this.draggedIndex = index;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Set a ghost image if needed, or just let default handle it
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const target = e.currentTarget;
        if (target && target.classList.contains('page-item')) {
            target.classList.add('drag-over');
        }
    }

    handleDragEnd(e) {
        document.querySelectorAll('.page-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();
        if (this.draggedIndex === undefined || this.draggedIndex === targetIndex) return;

        // Sayfaların yerini değiştir
        const draggedPage = this.pages[this.draggedIndex];

        // Önce sürükleneni çıkar
        this.pages.splice(this.draggedIndex, 1);
        // Sonra hedef noktaya ekle
        this.pages.splice(targetIndex, 0, draggedPage);

        // Mevcut sayfa indexini güncelle
        if (this.currentPageIndex === this.draggedIndex) {
            this.currentPageIndex = targetIndex;
        } else if (this.currentPageIndex > this.draggedIndex && this.currentPageIndex <= targetIndex) {
            this.currentPageIndex--;
        } else if (this.currentPageIndex < this.draggedIndex && this.currentPageIndex >= targetIndex) {
            this.currentPageIndex++;
        }

        this.renderPageList();
    }

    renamePage(index, newName) {
        if (this.pages[index]) {
            this.pages[index].name = newName;
            this.renderPageList();
        }
    }
}
