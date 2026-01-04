class Dashboard {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('dashboard');
        this.appContainer = document.getElementById('app');
        this.boardGrid = document.getElementById('boardGrid');
        this.btnNewBoard = document.getElementById('btnNewBoard');
        this.btnNewFolder = document.getElementById('btnNewFolder');
        this.breadcrumb = document.querySelector('.breadcrumb');
        this.folderList = document.getElementById('folderList');
        this.searchInput = this.container ? this.container.querySelector('.search-bar input') : null;


        console.log('Dashboard constructor elements:', {
            dashboard: !!this.container,
            app: !!this.appContainer,
            grid: !!this.boardGrid,
            btnBoard: !!this.btnNewBoard,
            btnFolder: !!this.btnNewFolder,
            folderList: !!this.folderList
        });

        this.currentBoardId = null;
        this.currentView = 'all';
        this.searchTerm = '';


        this.boards = this.loadData('wb_boards', []);
        this.folders = this.loadData('wb_folders', []);
        this.viewSettings = this.loadData('wb_view_settings', {
            gridSize: 'xsmall'
        });

        this.defaultCovers = [
            { id: 'c1', bg: '#4a90e2', texture: 'linear' },
            { id: 'c2', bg: '#fa5252', texture: 'linear' },
            { id: 'c3', bg: '#40c057', texture: 'dots' },
            { id: 'c4', bg: '#fab005', texture: 'dots' },
            { id: 'c5', bg: '#862e9c', texture: 'linear' },
            { id: 'c6', bg: '#15aabf', texture: 'dots' },
            { id: 'c7', bg: '#495057', texture: 'linear' },
            { id: 'c8', bg: '#e67e22', texture: 'linear' }
        ];
        this.customCovers = this.loadData('wb_custom_covers', []);

        this.init();
    }

    init() {
        console.log('Dashboard initializing...');
        try {
            this.renderSidebar();
            this.renderBoards();

            if (this.btnNewBoard) {
                this.btnNewBoard.onclick = () => {
                    console.log('New Board clicked');
                    this.createNewBoard();
                };
                console.log('btnNewBoard click handler attached.');
            } else {
                console.warn('btnNewBoard element not found.');
            }

            if (this.btnNewFolder) {
                this.btnNewFolder.onclick = () => {
                    console.log('New Folder clicked');
                    this.createNewFolder();
                };
                console.log('btnNewFolder click handler attached.');
            } else {
                console.warn('btnNewFolder element not found.');
            }

            this.setupAppNavigation();
            this.setupViewOptions();
            this.setupSearch();
            this.setupCoverModal();

            this.applyViewSettings();
            console.log('App navigation setup.');

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (this.currentBoardId) {
                        this.saveCurrentBoard();
                        console.log('Saved!');
                    }
                }
            });
            console.log('Global keydown listener for save attached.');
            console.log('Dashboard initialized successfully.');
        } catch (err) {
            console.error('Dashboard init error:', err);
        }
    }

    loadData(key, defaultValue) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.error('Error loading data for ' + key, e);
            return defaultValue;
        }
    }

    saveData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving data to localStorage', e);
            if (e.name === 'QuotaExceededError') {
                alert('Tarayıcı depolama alanı doldu! Lütfen bazı dosyalarınızı silin veya daha küçük boyutlu kapak resimleri kullanın.');
            }
        }
    }

    renderSidebar() {
        this.folderList.innerHTML = '';

        // Listeners for static nav items (Tüm Sayfalar, Son Kullanılanlar, vb.)
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            const view = item.dataset.view;
            if (view && !view.startsWith('f_')) {
                item.onclick = () => this.switchView(view);
                item.classList.toggle('active', this.currentView === view);
            }
        });

        // Dynamic Folders Tree
        const rootFolders = this.folders.filter(f => !f.parentId);
        this.renderFolderTree(rootFolders, this.folderList, 0);

        // Global click listener to close dropdowns
        if (!this.dropdownListenerAttached) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-menu-trigger')) {
                    document.querySelectorAll('.folder-dropdown.show').forEach(d => d.classList.remove('show'));
                }
            });
            this.dropdownListenerAttached = true;
        }
    }

    renderFolderTree(folders, container, level) {
        folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = `nav-item folder-item ${this.currentView === folder.id ? 'active' : ''}`;
            item.dataset.view = folder.id;
            item.style.paddingLeft = `${12 + level * 20}px`; // Indentation for subfolders

            item.innerHTML = `
                <div class="folder-content">
                    <img src="assets/icons/rectangle.svg" class="nav-icon" style="opacity: 0.5;">
                    <span class="folder-name" spellcheck="false">${folder.name}</span>
                </div>
                <div class="folder-menu-trigger">⋮</div>
                <div class="folder-dropdown">
                    <div class="dropdown-item" data-action="addSub">
                        <img src="assets/icons/subfolder.svg" style="width: 12px; opacity: 0.6;">
                        Alt Klasör Ekle
                    </div>
                    <div class="dropdown-item" data-action="rename">
                        <img src="assets/icons/rename.svg" style="width: 12px; opacity: 0.6;">
                        İsmi Değiştir
                    </div>
                    <div class="dropdown-item" data-action="delete" style="color: #fa5252;">
                        <img src="assets/icons/trash.svg" style="width: 12px; opacity: 0.6; filter: invert(36%) sepia(84%) saturate(1450%) hue-rotate(338deg) brightness(98%) contrast(98%);">
                        Klasörü Sil
                    </div>
                </div>
            `;

            item.onclick = (e) => {
                if (e.target.closest('.folder-menu-trigger') || e.target.closest('.folder-dropdown')) return;
                this.switchView(folder.id);
            };

            const trigger = item.querySelector('.folder-menu-trigger');
            const dropdown = item.querySelector('.folder-dropdown');
            const nameEl = item.querySelector('.folder-name');

            trigger.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.folder-dropdown.show').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            };

            dropdown.querySelector('[data-action="addSub"]').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('show');
                this.createNewFolder(folder.id);
            };

            dropdown.querySelector('[data-action="rename"]').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('show');
                nameEl.contentEditable = "true";
                nameEl.focus();
                document.execCommand('selectAll', false, null);

                nameEl.onblur = () => {
                    nameEl.contentEditable = "false";
                    this.renameFolder(folder.id, nameEl.textContent);
                };
                nameEl.onkeydown = (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
                };
            };

            dropdown.querySelector('[data-action="delete"]').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('show');
                if (confirm(`'${folder.name}' klasörünü silmek istediğinize emin misiniz? (İçindeki notlar ve alt klasörler silinmez)`)) {
                    this.deleteFolder(folder.id);
                }
            };

            container.appendChild(item);

            // Render children
            const children = this.folders.filter(f => f.parentId === folder.id);
            if (children.length > 0) {
                this.renderFolderTree(children, container, level + 1);
            }
        });
    }

    renderBoards() {
        if (!this.boardGrid) return;
        this.boardGrid.innerHTML = '';

        // Refresh data to ensure we have latest states
        const loadedBoards = this.loadData('wb_boards', []);
        this.boards = Array.isArray(loadedBoards) ? loadedBoards : [];

        let filtered = [];

        if (this.currentView === 'trash') {
            filtered = this.boards.filter(b => b.deleted);
        } else {
            // Base filter: non-deleted
            let base = this.boards.filter(b => !b.deleted);

            if (this.currentView === 'all') {
                filtered = base;
            } else if (this.currentView === 'recent') {
                filtered = [...base].sort((a, b) => b.lastModified - a.lastModified);
            } else if (this.currentView === 'favorites') {
                filtered = base.filter(b => b.favorite);
            } else if (this.currentView.startsWith('f_')) {
                filtered = base.filter(b => b.folderId === this.currentView);
            } else {
                filtered = base;
            }
        }

        // Apply Search Filter
        if (this.searchTerm) {
            filtered = filtered.filter(b => b.name.toLowerCase().includes(this.searchTerm));
        }


        if (filtered.length === 0) {
            const emptyMsg = this.searchTerm ? `"${this.searchTerm}" ile eşleşen not bulunamadı` : 'Hiç not bulunamadı';
            const emptySubMsg = this.searchTerm ? 'Arama teriminizi kontrol edin veya temizleyin.' : 'Yeni bir beyaz tahta oluşturarak başlayın.';

            this.boardGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${this.searchTerm ? '🔍' : '📄'}</div>
                    <h3>${emptyMsg}</h3>
                    <p>${emptySubMsg}</p>
                </div>
            `;
            return;
        }


        filtered.forEach(board => {
            const card = document.createElement('div');
            card.className = 'board-card';
            card.dataset.id = board.id;

            const hasImage = board.coverImage;
            const coverBg = board.coverBg || '#4a90e2';
            const coverTexture = board.coverTexture || 'linear';

            card.innerHTML = `
                <div class="notebook-container">
                    <div class="notebook-cover ${hasImage ? '' : `cover-texture-${coverTexture}`}" 
                         style="background-color: ${coverBg}; ${hasImage ? `background-image: url(${board.coverImage}); background-size: cover; background-position: center;` : ''}">
                        <div class="notebook-spine"></div>
                    </div>
                </div>
                <div class="cover-picker-btn" title="Kapağı Değiştir">
                    <img src="assets/icons/highlighter.svg" style="width: 14px; opacity: 0.6;">
                </div>
                <div class="board-settings-btn" title="İşlemler">
                    <img src="assets/icons/settings.svg" style="width: 14px; opacity: 0.6;">
                </div>
                <div class="board-actions">
                    <select class="folder-select" title="Klasöre Taşı">
                        <option value="">Klasör Yok</option>
                        ${this.folders.map(f => `<option value="${f.id}" ${board.folderId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                    </select>
                    <div style="display: flex; gap: 4px;">
                        <button class="action-btn" data-action="favorite" title="Favorilere Ekle">
                            <img src="assets/icons/star.svg" style="width: 14px; opacity: 0.6; ${board.favorite ? 'filter: invert(44%) sepia(91%) saturate(1210%) hue-rotate(188deg) brightness(91%) contrast(92%);' : ''}">
                        </button>
                        <button class="action-btn" data-action="delete" title="Sil">
                            <img src="assets/icons/trash.svg" style="width: 14px; opacity: 0.6;">
                        </button>
                    </div>
                </div>
                <div class="board-info">
                    <div class="board-title" contenteditable="true" spellcheck="false">${board.name}</div>
                    <div class="board-meta">
                        <span>${new Date(board.lastModified).toLocaleDateString()}</span>
                    </div>
                </div>
            `;

            card.onclick = (e) => {
                if (e.target.closest('.board-actions') || e.target.classList.contains('board-title') || e.target.closest('.cover-picker-btn') || e.target.closest('.board-settings-btn')) return;
                this.loadBoard(board.id);
            };

            card.querySelector('.cover-picker-btn').onclick = (e) => {
                e.stopPropagation();
                this.openCoverPicker(board.id);
            };

            const settingsBtn = card.querySelector('.board-settings-btn');
            const actionsPanel = card.querySelector('.board-actions');
            settingsBtn.onclick = (e) => {
                e.stopPropagation();
                actionsPanel.classList.toggle('show');
            };

            const titleEl = card.querySelector('.board-title');
            titleEl.onblur = () => this.renameBoard(board.id, titleEl.textContent);
            titleEl.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
            };

            card.querySelector('[data-action="delete"]').onclick = (e) => { e.stopPropagation(); this.deleteBoard(board.id); };
            card.querySelector('[data-action="favorite"]').onclick = (e) => { e.stopPropagation(); this.toggleFavorite(board.id); };

            const folderSelect = card.querySelector('.folder-select');
            folderSelect.onchange = (e) => {
                this.moveBoardToFolder(board.id, e.target.value);
            };

            this.boardGrid.appendChild(card);
        });
    }

    switchView(view) {
        this.currentView = view;
        const folder = this.folders.find(f => f.id === view);
        const titles = {
            all: 'Tüm Sayfalar',
            recent: 'Son Kullanılanlar',
            favorites: 'Favoriler',
            trash: 'Çöp Kutusu'
        };
        const title = titles[view] || (folder ? folder.name : 'Klasör');
        this.breadcrumb.textContent = `Whiteboard / ${title}`;

        this.renderSidebar();
        this.renderBoards();
    }

    createNewFolder(parentId = null) {
        const id = 'f_' + Date.now();
        const newFolder = {
            id: id,
            name: 'Yeni Klasör',
            created: Date.now(),
            parentId: parentId
        };
        // Position at top of dynamic list
        this.folders.unshift(newFolder);
        this.saveData('wb_folders', this.folders);
        this.switchView(id);

        // Auto focus for renaming
        setTimeout(() => {
            const nameEl = document.querySelector(`.nav-item[data-view="${id}"] .folder-name`);
            if (nameEl) {
                nameEl.contentEditable = "true";
                nameEl.focus();
                document.execCommand('selectAll', false, null);

                nameEl.onblur = () => {
                    nameEl.contentEditable = "false";
                    this.renameFolder(id, nameEl.textContent);
                };
                nameEl.onkeydown = (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
                };
            }
        }, 150);
    }

    renameFolder(id, newName) {
        const folder = this.folders.find(f => f.id === id);
        if (folder && newName.trim()) {
            folder.name = newName.trim();
            this.saveData('wb_folders', this.folders);
            this.renderSidebar();
            if (this.currentView === id) {
                this.breadcrumb.textContent = `Whiteboard / ${folder.name}`;
            }
        } else {
            this.renderSidebar(); // Revert UI
        }
    }

    deleteFolder(id) {
        // Recursive folder deletion
        const getAllChildren = (folderId) => {
            let result = [folderId];
            this.folders.filter(f => f.parentId === folderId).forEach(child => {
                result = result.concat(getAllChildren(child.id));
            });
            return result;
        };

        const idsToDelete = getAllChildren(id);

        // Delete boards that are in any of these folders
        this.boards = this.boards.filter(b => !idsToDelete.includes(b.folderId));
        this.saveData('wb_boards', this.boards);

        // Delete the folders themselves
        this.folders = this.folders.filter(f => !idsToDelete.includes(f.id));
        this.saveData('wb_folders', this.folders);

        // If we are currently viewing one of the deleted folders, switch to 'all'
        if (idsToDelete.includes(this.currentView)) {
            this.switchView('all');
        } else {
            this.renderSidebar();
            this.renderBoards();
        }
    }

    createNewBoard() {
        const id = 'b_' + Date.now();
        const newBoard = {
            id: id,
            name: 'Adsız Beyaz Tahta',
            lastModified: Date.now(),
            favorite: false,
            deleted: false,
            objectCount: 0,
            preview: null,
            folderId: this.currentView.startsWith('f_') ? this.currentView : null,
            coverBg: '#4a90e2',
            coverTexture: 'linear'
        };

        this.boards.push(newBoard);
        this.saveData('wb_boards', this.boards);
        this.loadBoard(id);
    }

    loadBoard(id) {
        this.currentBoardId = id;
        const board = this.boards.find(b => b.id === id);
        if (!board) return;

        // Transition UI
        this.container.style.display = 'none';
        this.appContainer.style.display = 'flex';

        // Force resize to calculate dimensions now that app is visible
        window.dispatchEvent(new Event('resize'));

        // Load content into app
        const savedData = localStorage.getItem(`wb_content_${id}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            this.app.state.objects = parsed.objects || [];
            // Handle multiple pages if any
            if (parsed.pages && this.app.pageManager) {
                this.app.pageManager.pages = parsed.pages;
                this.app.pageManager.renderPageList();
                this.app.pageManager.switchPage(0);
            }
        } else {
            this.app.state.objects = [];
            if (this.app.pageManager) {
                this.app.pageManager.pages = [{
                    id: Date.now(),
                    name: 'Sayfa 1',
                    objects: [],
                    backgroundColor: 'white',
                    backgroundPattern: 'none',
                    thumbnail: null
                }];
                this.app.pageManager.renderPageList();
                this.app.pageManager.switchPage(0);
            }
        }

        this.app.redrawOffscreen();
        this.app.render();
    }

    saveCurrentBoard() {
        if (!this.currentBoardId) return;

        // Generate preview (thumbnail)
        const preview = this.app.canvas.toDataURL('image/webp', 0.5);

        // Update board meta
        const boardIndex = this.boards.findIndex(b => b.id === this.currentBoardId);
        if (boardIndex !== -1) {
            this.boards[boardIndex].lastModified = Date.now();
            this.boards[boardIndex].preview = preview;
            this.boards[boardIndex].objectCount = this.app.state.objects.length;
            this.saveData('wb_boards', this.boards);
        }

        // Save content
        const content = {
            objects: this.app.state.objects,
            pages: this.app.pageManager ? this.app.pageManager.pages : null
        };
        localStorage.setItem(`wb_content_${this.currentBoardId}`, JSON.stringify(content));
    }

    showDashboard() {
        this.saveCurrentBoard();
        this.boards = this.loadData('wb_boards', []); // Refresh
        this.currentBoardId = null;
        this.container.style.display = 'flex';
        this.appContainer.style.display = 'none';
        this.renderSidebar(); // Re-render sidebar to update counts/active
        this.renderBoards();
    }

    deleteBoard(id) {
        const board = this.boards.find(b => b.id === id);
        if (board) {
            if (board.deleted) {
                // Hard delete
                this.boards = this.boards.filter(b => b.id !== id);
                localStorage.removeItem(`wb_content_${id}`);
            } else {
                // Soft delete
                board.deleted = true;
            }
            this.saveData('wb_boards', this.boards);
            this.renderBoards();
        }
    }

    toggleFavorite(id) {
        const board = this.boards.find(b => b.id === id);
        if (board) {
            board.favorite = !board.favorite;
            this.saveData('wb_boards', this.boards);
            this.renderBoards();
        }
    }

    renameBoard(id, newName) {
        const board = this.boards.find(b => b.id === id);
        if (board && newName.trim()) {
            board.name = newName.trim();
            this.saveData('wb_boards', this.boards);
        }
    }

    moveBoardToFolder(boardId, folderId) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            board.folderId = folderId || null;
            this.saveData('wb_boards', this.boards);
            this.renderBoards();
        }
    }

    updateBoardShape(boardId, shape) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            board.shape = shape;
            this.saveData('wb_boards', this.boards);
            this.renderBoards();
        }
    }

    setupAppNavigation() {
        const logo = document.getElementById('btnHome');
        if (logo) {
            logo.style.pointerEvents = 'auto'; // Force enable
            logo.onclick = () => this.showDashboard();
        }

        const handleSave = () => {
            this.saveCurrentBoard();
            alert('Beyaz tahta kaydedildi!');
            const dropdown = document.getElementById('appMenuDropdown');
            if (dropdown) dropdown.classList.remove('show');
        };

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.onclick = handleSave;

        const menuSave = document.getElementById('menuSave');
        if (menuSave) menuSave.onclick = handleSave;
    }

    setupViewOptions() {
        const trigger = document.getElementById('btnViewOptions');
        const dropdown = document.getElementById('viewOptionsDropdown');

        if (trigger && dropdown) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            };

            // Size buttons
            dropdown.querySelectorAll('.size-btn').forEach(btn => {
                btn.onclick = () => {
                    this.viewSettings.gridSize = btn.dataset.size;
                    this.saveData('wb_view_settings', this.viewSettings);
                    this.applyViewSettings();

                    dropdown.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                };

                if (btn.dataset.size === this.viewSettings.gridSize) {
                    btn.classList.add('active');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.view-options-container')) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }

    setupSearch() {
        if (this.searchInput) {
            this.searchInput.oninput = (e) => {
                this.searchTerm = e.target.value.toLowerCase().trim();
                this.renderBoards();
            };
        }
    }

    applyViewSettings() {
        if (!this.boardGrid) return;

        // Reset classes
        this.boardGrid.classList.remove('size-mini', 'size-xsmall', 'size-small', 'size-medium', 'size-large');

        // Apply new classes
        this.boardGrid.classList.add(`size-${this.viewSettings.gridSize}`);
    }

    setupCoverModal() {
        const modal = document.getElementById('coverModal');
        const grid = document.getElementById('coverGrid');
        const closeBtn = document.getElementById('btnCloseCoverModal');
        const addBtn = document.getElementById('btnAddCustomCover');
        const colorInput = document.getElementById('customCoverColor');
        const uploadBtn = document.getElementById('btnUploadCoverImage');
        const fileInput = document.getElementById('customCoverImage');

        if (!modal || !grid || !addBtn || !colorInput) return;

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };

        addBtn.onclick = () => {
            try {
                const color = colorInput.value;
                if (!color) return;

                const newCover = { id: 'custom_' + Date.now(), bg: color, texture: 'linear' };
                this.customCovers = Array.isArray(this.customCovers) ? this.customCovers : [];
                this.customCovers.unshift(newCover);
                this.saveData('wb_custom_covers', this.customCovers);

                if (this.activeBoardForCover) {
                    const board = (this.boards || []).find(b => b.id === this.activeBoardForCover);
                    if (board) {
                        board.coverBg = color;
                        board.coverTexture = 'linear';
                        delete board.coverImage; // Remove image if color selected
                        this.saveData('wb_boards', this.boards);
                        this.renderBoards();
                    }
                }
                modal.classList.remove('show');
            } catch (err) {
                console.error('Error in addBtn click handler:', err);
                modal.classList.remove('show');
            }
        };

        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (re) => {
                    const dataUrl = re.target.result;

                    // Compress image before saving
                    this.compressImage(dataUrl, (compressedUrl) => {
                        const newCover = { id: 'img_' + Date.now(), bg: '#ffffff', image: compressedUrl };
                        this.customCovers = Array.isArray(this.customCovers) ? this.customCovers : [];
                        this.customCovers.unshift(newCover);
                        this.saveData('wb_custom_covers', this.customCovers);

                        if (this.activeBoardForCover) {
                            const board = (this.boards || []).find(b => b.id === this.activeBoardForCover);
                            if (board) {
                                board.coverBg = '#ffffff';
                                board.coverImage = compressedUrl;
                                this.saveData('wb_boards', this.boards);
                                this.renderBoards();
                            }
                        }
                        modal.classList.remove('show');
                        fileInput.value = ''; // Reset
                    });
                };
                reader.readAsDataURL(file);
            };
        }
    }

    compressImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDimension = 400;

            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Use JPEG with 0.7 quality to save substantial space
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    }

    openCoverPicker(boardId) {
        this.activeBoardForCover = boardId;
        const modal = document.getElementById('coverModal');
        if (modal) {
            modal.classList.add('show');
            this.renderCoverGrid(boardId);
        }
    }

    renderCoverGrid(boardId) {
        const grid = document.getElementById('coverGrid');
        const board = (this.boards || []).find(b => b.id === boardId);
        if (!board || !grid) return;
        grid.innerHTML = '';

        const allCovers = [
            ...this.defaultCovers.map(c => ({ ...c, isDefault: true })),
            ...this.customCovers.map(c => ({ ...c, isDefault: false }))
        ];

        allCovers.forEach(cover => {
            const item = document.createElement('div');
            item.className = 'cover-item';

            const isImage = !!cover.image;
            if (!isImage && cover.texture) {
                item.classList.add(`cover-texture-${cover.texture}`);
            }

            if (isImage) {
                item.style.backgroundImage = `url(${cover.image})`;
                item.style.backgroundSize = 'cover';
                item.style.backgroundPosition = 'center';
            } else {
                item.style.backgroundColor = cover.bg;
            }

            if (isImage) {
                if (board.coverImage === cover.image) item.classList.add('active');
            } else {
                if (board.coverBg === cover.bg && !board.coverImage) item.classList.add('active');
            }

            let innerHTML = '<div class="mini-spine"></div>';

            // Add delete button for custom covers
            if (!cover.isDefault) {
                innerHTML += `<div class="cover-item-delete" title="Sil">×</div>`;
            }

            item.innerHTML = innerHTML;

            item.onclick = (e) => {
                // If it's a delete click, the handler below will deal with it
                if (e.target.classList.contains('cover-item-delete')) return;

                if (isImage) {
                    board.coverBg = '#ffffff';
                    board.coverImage = cover.image;
                    board.coverTexture = 'none';
                } else {
                    board.coverBg = cover.bg;
                    board.coverTexture = cover.texture || 'linear';
                    delete board.coverImage;
                }
                this.saveData('wb_boards', this.boards);
                document.getElementById('coverModal').classList.remove('show');
                this.renderBoards();
            };

            // Set up delete handler
            if (!cover.isDefault) {
                item.querySelector('.cover-item-delete').onclick = (e) => {
                    e.stopPropagation();
                    this.customCovers = this.customCovers.filter(c => c.id !== cover.id);
                    this.saveData('wb_custom_covers', this.customCovers);
                    this.renderCoverGrid(boardId);
                };
            }

            grid.appendChild(item);
        });
    }
}
