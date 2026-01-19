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
        this.btnEmptyTrash = document.getElementById('btnEmptyTrash');




        this.currentBoardId = null;
        this.currentView = 'all';
        this.searchTerm = '';


        this.boards = this.loadData('wb_boards', []);
        this.folders = this.loadData('wb_folders', []);
        this.viewSettings = this.loadData('wb_view_settings', {
            gridSize: 'xsmall'
        });
        this.expandedFolders = this.loadData('wb_expanded_folders', []);

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

        try {
            this.renderSidebar();
            this.renderBoards();

            if (this.btnNewBoard) {
                this.btnNewBoard.onclick = () => {
                    console.log('New Board clicked');
                    this.createNewBoard();
                };

            } else {
                console.warn('btnNewBoard element not found.');
            }

            if (this.btnNewFolder) {
                this.btnNewFolder.onclick = () => {
                    console.log('New Folder clicked');
                    this.createNewFolder();
                };
            }

            // PDF Upload
            this.btnUploadPDF = document.getElementById('btnUploadPDF');
            this.pdfInput = document.getElementById('pdfInput');
            if (this.btnUploadPDF && this.pdfInput) {
                this.btnUploadPDF.onclick = () => this.pdfInput.click();
                this.pdfInput.onchange = (e) => this.handlePDFUpload(e);
            }

<<<<<<< HEAD
            // Template Gallery
            this.btnOpenTemplates = document.getElementById('btnOpenTemplates');
            if (this.btnOpenTemplates) {
                this.btnOpenTemplates.onclick = () => this.openTemplateGallery();
            }

=======
>>>>>>> e156fe7 (Dashboard düzenlemeleri ve pdf select tool düzenlemesi)
            if (this.btnEmptyTrash) {
                this.btnEmptyTrash.onclick = () => this.emptyTrash();
            }

            this.setupAppNavigation();
            this.setupViewOptions();
            this.setupSearch();
            this.setupCoverModal();

            this.applyViewSettings();


            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (this.currentBoardId) {
                        this.saveCurrentBoard();
                        console.log('Saved!');
                    }
                }
            });

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

    isMobile() {
        return window.innerWidth <= 768;
    }

    toggleFolder(folderId) {
        const index = this.expandedFolders.indexOf(folderId);
        if (index === -1) {
            this.expandedFolders.push(folderId);
        } else {
            this.expandedFolders.splice(index, 1);
        }
        this.saveData('wb_expanded_folders', this.expandedFolders);
        this.renderSidebar();
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

        // On mobile, render notes that don't have a folder at the end of the list
        if (this.isMobile()) {
            const orphanNotes = this.boards.filter(b => !b.folderId && !b.deleted);
            if (orphanNotes.length > 0) {
                const orphanSection = document.createElement('div');
                orphanSection.className = 'nav-section';
                orphanSection.innerHTML = '<div class="section-title">DİĞER NOTLAR</div>';

                orphanNotes.forEach(note => {
                    const noteItem = document.createElement('div');
                    noteItem.className = `tree-note-item ${this.currentBoardId === note.id ? 'active' : ''}`;
                    noteItem.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                            <img src="assets/icons/pages.svg" class="note-icon">
                            <span class="note-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${note.name}</span>
                        </div>
                        <div class="folder-menu-trigger">⋮</div>
                        <div class="folder-dropdown" style="width: 130px;">
                            <div class="dropdown-item" data-action="rename">
                                <img src="assets/icons/rename.svg" style="width: 10px; opacity: 0.6;">
                                İsmi Değiştir
                            </div>
                            <div class="dropdown-item" data-action="delete" style="color: #fa5252;">
                                <img src="assets/icons/trash.svg" style="width: 12px; opacity: 0.6; filter: invert(36%) sepia(84%) saturate(1450%) hue-rotate(338deg) brightness(98%) contrast(98%);">
                                Sil
                            </div>
                        </div>
                    `;

                    noteItem.onclick = (e) => {
                        if (e.target.closest('.folder-menu-trigger') || e.target.closest('.folder-dropdown') || e.target.closest('.note-name[contenteditable="true"]')) return;
                        this.loadBoard(note.id);
                    };

                    const trigger = noteItem.querySelector('.folder-menu-trigger');
                    const dropdown = noteItem.querySelector('.folder-dropdown');
                    const nameEl = noteItem.querySelector('.note-name');

                    trigger.onclick = (e) => {
                        e.stopPropagation();
                        // Close other dropdowns
                        document.querySelectorAll('.folder-dropdown.show').forEach(d => {
                            if (d !== dropdown) d.classList.remove('show');
                        });
                        dropdown.classList.toggle('show');
                    };

                    dropdown.querySelector('[data-action="rename"]').onclick = (e) => {
                        e.stopPropagation();
                        dropdown.classList.remove('show');
                        nameEl.contentEditable = "true";
                        nameEl.focus();
                        document.execCommand('selectAll', false, null);

                        const saveRename = () => {
                            nameEl.contentEditable = "false";
                            this.renameBoard(note.id, nameEl.textContent);
                        };

                        nameEl.onblur = saveRename;
                        nameEl.onkeydown = (ke) => {
                            if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
                        };
                    };

                    dropdown.querySelector('[data-action="delete"]').onclick = (e) => {
                        e.stopPropagation();
                        dropdown.classList.remove('show');
                        if (confirm(`'${note.name}' notunu silmek istediğinize emin misiniz?`)) {
                            this.deleteBoard(note.id);
                        }
                    };

                    orphanSection.appendChild(noteItem);
                });
                this.folderList.appendChild(orphanSection);
            }
        }

        // Global click listener to close dropdowns
        if (!this.dropdownListenerAttached) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-menu-trigger')) {
                    document.querySelectorAll('.folder-dropdown.show').forEach(d => d.classList.remove('show'));
                }

                // Close board actions if clicked outside
                if (!e.target.closest('.board-actions')) {
                    document.querySelectorAll('.board-actions.show').forEach(d => {
                        d.classList.remove('show');
                        const card = d.closest('.board-card');
                        if (card) card.classList.remove('actions-open');
                    });
                }
            });
            this.dropdownListenerAttached = true;
        }

        // Re-render when window is resized to handle mobile/desktop switch
        if (!this.resizeListenerAttached) {
            window.addEventListener('resize', () => {
                this.renderSidebar();
                this.renderBoards();
            });
            this.resizeListenerAttached = true;
        }
    }

    renderFolderTree(folders, container, level) {
        folders.forEach(folder => {
            const isExpanded = this.expandedFolders.includes(folder.id);
            const hasChildren = this.folders.some(f => f.parentId === folder.id) || (this.isMobile() && this.boards.some(b => b.folderId === folder.id && !b.deleted));

            const item = document.createElement('div');
            item.className = `nav-item folder-item ${this.currentView === folder.id ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`;
            item.dataset.view = folder.id;
            item.style.paddingLeft = `${12 + level * 20}px`; // Indentation for subfolders

            item.innerHTML = `
                <div class="folder-content">
                    <img src="assets/icons/arrow-dashboard.svg" class="folder-chevron ${isExpanded ? 'rotated' : ''}" style="width: 6px; opacity: 0.4; transition: transform 0.2s; margin: 4px; ${hasChildren ? '' : 'visibility: hidden;'}">
                    <img src="assets/icons/rectangle.svg" class="nav-icon" style="opacity: 0.5;">
                    <span class="folder-name" spellcheck="false">${folder.name}</span>
                </div>
                <div class="folder-menu-trigger">⋮</div>
                <div class="folder-dropdown">
                    <div class="dropdown-item" data-action="addSub">
                        <img src="assets/icons/subfolder.svg" style="width: 12px; opacity: 0.6;">
                        Alt Klasör Ekle
                    </div>
                    ${this.isMobile() ? `
                    <div class="dropdown-item" data-action="addNote">
                        <img src="assets/icons/add-page.svg" style="width: 12px; opacity: 0.6;">
                        Yeni Not Ekle
                    </div>
                    ` : ''}
                    <div class="dropdown-item" data-action="rename">
                        <img src="assets/icons/rename.svg" style="width: 10px; opacity: 0.6;">
                        İsmi Değiştir
                    </div>
                    <div class="dropdown-item" data-action="delete" style="color: #fa5252;">
                        <img src="assets/icons/trash.svg" style="width: 12px; opacity: 0.6; filter: invert(36%) sepia(84%) saturate(1450%) hue-rotate(338deg) brightness(98%) contrast(98%);">
                        Klasörü Sil
                    </div>
                </div>
            `;

            const chevron = item.querySelector('.folder-chevron');
            if (hasChildren) {
                chevron.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleFolder(folder.id);
                };
            }

            item.onclick = (e) => {
                if (e.target.closest('.folder-menu-trigger') || e.target.closest('.folder-dropdown') || e.target.closest('.folder-chevron')) return;

                // If it's the already active folder, toggle it. Otherwise switch view.
                if (this.currentView === folder.id) {
                    this.toggleFolder(folder.id);
                } else {
                    this.switchView(folder.id);
                    // Also auto-expand when switching to a folder
                    if (!isExpanded) {
                        this.toggleFolder(folder.id);
                    }
                }
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
                // Ensure parent is expanded when adding child
                if (!this.expandedFolders.includes(folder.id)) {
                    this.toggleFolder(folder.id);
                }
            };

            if (this.isMobile()) {
                dropdown.querySelector('[data-action="addNote"]').onclick = (e) => {
                    e.stopPropagation();
                    dropdown.classList.remove('show');
                    this.currentBoardId = null;
                    this.switchView(folder.id);
                    this.createNewBoard();
                    if (!this.expandedFolders.includes(folder.id)) {
                        this.toggleFolder(folder.id);
                    }
                };
            }

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

            // Container for folder children (subfolders and notes)
            if (isExpanded) {
                const childContainer = document.createElement('div');
                childContainer.className = 'folder-children';
                container.appendChild(childContainer);

                // Render notes under this folder if on mobile
                if (this.isMobile()) {
                    const folderNotes = this.boards.filter(b => b.folderId === folder.id && !b.deleted);
                    folderNotes.forEach(note => {
                        const noteItem = document.createElement('div');
                        noteItem.className = `tree-note-item ${this.currentBoardId === note.id ? 'active' : ''}`;
                        noteItem.style.paddingLeft = `${32 + level * 20}px`;
                        noteItem.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                                <img src="assets/icons/pages.svg" class="note-icon">
                                <span class="note-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${note.name}</span>
                            </div>
                            <div class="folder-menu-trigger">⋮</div>
                            <div class="folder-dropdown" style="width: 130px;">
                                <div class="dropdown-item" data-action="rename">
                                    <img src="assets/icons/rename.svg" style="width: 10px; opacity: 0.6;">
                                    İsmi Değiştir
                                </div>
                                <div class="dropdown-item" data-action="delete" style="color: #fa5252;">
                                    <img src="assets/icons/trash.svg" style="width: 12px; opacity: 0.6; filter: invert(36%) sepia(84%) saturate(1450%) hue-rotate(338deg) brightness(98%) contrast(98%);">
                                    Sil
                                </div>
                            </div>
                        `;

                        noteItem.onclick = (e) => {
                            if (e.target.closest('.folder-menu-trigger') || e.target.closest('.folder-dropdown') || e.target.closest('.note-name[contenteditable="true"]')) return;
                            this.loadBoard(note.id);
                        };

                        const trigger = noteItem.querySelector('.folder-menu-trigger');
                        const dropdown = noteItem.querySelector('.folder-dropdown');
                        const nameEl = noteItem.querySelector('.note-name');

                        trigger.onclick = (e) => {
                            e.stopPropagation();
                            // Close other dropdowns
                            document.querySelectorAll('.folder-dropdown.show').forEach(d => {
                                if (d !== dropdown) d.classList.remove('show');
                            });
                            dropdown.classList.toggle('show');
                        };

                        dropdown.querySelector('[data-action="rename"]').onclick = (e) => {
                            e.stopPropagation();
                            dropdown.classList.remove('show');
                            nameEl.contentEditable = "true";
                            nameEl.focus();
                            document.execCommand('selectAll', false, null);

                            const saveRename = () => {
                                nameEl.contentEditable = "false";
                                this.renameBoard(note.id, nameEl.textContent);
                            };

                            nameEl.onblur = saveRename;
                            nameEl.onkeydown = (ke) => {
                                if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
                            };
                        };

                        dropdown.querySelector('[data-action="delete"]').onclick = (e) => {
                            e.stopPropagation();
                            dropdown.classList.remove('show');
                            if (confirm(`'${note.name}' notunu silmek istediğinize emin misiniz?`)) {
                                this.deleteBoard(note.id);
                            }
                        };

                        childContainer.appendChild(noteItem);
                    });


                }

                // Render children
                const children = this.folders.filter(f => f.parentId === folder.id);
                if (children.length > 0) {
                    this.renderFolderTree(children, childContainer, level + 1);
                }
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


        if (filtered.length === 0 && this.currentView === 'trash') {
            this.boardGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🗑️</div>
                    <h3>Çöp kutusu boş</h3>
                </div>
            `;
            return;
        }

        if (filtered.length === 0 && this.searchTerm) {
            this.boardGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>"${this.searchTerm}" ile eşleşen not bulunamadı</h3>
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
                            <img src="assets/icons/star.svg" style="width: 14px; opacity: 0.6; ${board.favorite ? 'filter: invert(86%) sepia(31%) saturate(6084%) hue-rotate(359deg) brightness(101%) contrast(106%);' : ''}">
                        </button>
                        <button class="action-btn" data-action="change-cover" title="Kapağı Değiştir">
                        <img src="assets/icons/highlighter.svg" style="width: 14px; opacity: 0.6; margin-right: 6px;">
                    </button>
                        
                    </div>
                    <button class="action-btn" data-action="delete" style="width: 100%;" title="Sil">
                            <img src="assets/icons/trash.svg" style="width: 14px; opacity: 0.6;">
                        </button>
                </div>
                <div class="board-info">
                    <div class="board-title" contenteditable="true" spellcheck="false">${board.name}</div>
                    <div class="board-meta">
                        <span>${new Date(board.lastModified).toLocaleDateString()}</span>
                    </div>
                </div>
            `;

            card.onclick = (e) => {
                if (e.target.closest('.board-actions') || e.target.classList.contains('board-title') || e.target.closest('.board-settings-btn')) return;
                this.loadBoard(board.id);
            };

            card.querySelector('[data-action="change-cover"]').onclick = (e) => {
                e.stopPropagation();
                // Close menu first
                actionsPanel.classList.remove('show');
                card.classList.remove('actions-open');
                this.openCoverPicker(board.id);
            };

            const settingsBtn = card.querySelector('.board-settings-btn');
            const actionsPanel = card.querySelector('.board-actions');
            settingsBtn.onclick = (e) => {
                e.stopPropagation();

                // Close other open panels
                document.querySelectorAll('.board-actions.show').forEach(d => {
                    if (d !== actionsPanel) {
                        d.classList.remove('show');
                        const c = d.closest('.board-card');
                        if (c) c.classList.remove('actions-open');
                    }
                });

                actionsPanel.classList.toggle('show');
                if (actionsPanel.classList.contains('show')) {
                    card.classList.add('actions-open');
                } else {
                    card.classList.remove('actions-open');
                }
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

        // Add "Create New" card at the end
        if (this.currentView !== 'trash' && !this.searchTerm) {
            const createCard = document.createElement('div');
            createCard.className = 'board-card create-new-card';
            createCard.innerHTML = `
                <div class="notebook-container">
                    <div class="notebook-cover-dashed">
                        <span class="dashed-plus-icon">+</span>
                    </div>
                </div>
                <div class="board-info">
                    <div class="board-title" style="color: #999;">Yeni Not</div>
                </div>
            `;
            createCard.onclick = () => {
                this.createNewBoard();
            };
            this.boardGrid.appendChild(createCard);
        }
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

        // Show/Hide Empty Trash button
        if (this.btnEmptyTrash) {
            this.btnEmptyTrash.style.display = (view === 'trash') ? 'flex' : 'none';
        }

        this.renderSidebar();
        this.renderBoards();
    }

    createNewFolder(parentId = null) {
        const id = 'f_' + Date.now();

        // Find a unique name
        const baseName = 'Yeni Klasör';
        let name = baseName;
        let counter = 1;
        const existingNames = this.folders.map(f => f.name.trim());

        if (existingNames.includes(baseName)) {
            while (existingNames.includes(`${baseName} ${counter}`)) {
                counter++;
            }
            name = `${baseName} ${counter}`;
        }

        const newFolder = {
            id: id,
            name: name,
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

        // Find a unique name like "Not", "Not 1", "Not 2", etc.
        const baseName = 'Not';
        let name = baseName;
        let counter = 1;
        const existingNames = this.boards.filter(b => !b.deleted).map(b => b.name.trim());

        if (existingNames.includes(baseName)) {
            while (existingNames.includes(`${baseName} ${counter}`)) {
                counter++;
            }
            name = `${baseName} ${counter}`;
        }

        const newBoard = {
            id: id,
            name: name,
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

        // Refresh dashboard instead of loading board immediately
        this.renderBoards();
        this.renderSidebar();
    }

    async handlePDFUpload(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        const id = 'b_' + Date.now();
        const newBoard = {
            id: id,
            name: file.name,
            lastModified: Date.now(),
            favorite: false,
            deleted: false,
            objectCount: 0,
            preview: null,
            folderId: this.currentView.startsWith('f_') ? this.currentView : null,
            coverBg: '#fa5252',
            coverTexture: 'dots',
            isPDF: true
        };

        try {
            // Save to IndexedDB
            await Utils.db.save(id, file);

            this.boards.push(newBoard);
            this.saveData('wb_boards', this.boards);

            this.renderBoards();
            this.renderSidebar();

            // Optionally open immediately if you want, but per user request we stay on dashboard
            // this.loadBoard(id);

            // Clear input
            event.target.value = '';
        } catch (error) {
            console.error('Error saving PDF to IndexedDB:', error);
            alert('PDF kaydedilirken bir hata oluştu.');
        }
    }

    loadBoard(id) {
        const board = this.boards.find(b => b.id === id);
        if (!board) return;

        // Transition UI
        this.container.style.display = 'none';
        this.appContainer.style.display = 'flex';

        // Force resize to calculate dimensions now that app is visible
        window.dispatchEvent(new Event('resize'));

        // Use TabManager to open this board as a tab
        if (this.app.tabManager) {
            this.app.tabManager.openBoard(id, board.name);
        } else {
            // Fallback to old behavior if TabManager not available
            this.currentBoardId = id;
            this.loadBoardContent(id);
        }

        // Fit to width by default as requested
        if (this.app.zoomManager) {
            setTimeout(() => this.app.zoomManager.fitToWidth(10), 50);
        }
    }

    // Helper method to load board content (used by both Dashboard and TabManager)
    async loadBoardContent(id) {
        // Clear previous PDF if any
        if (this.app.pdfManager) {
            this.app.pdfManager.clearPDF();
        }

        // Check if there is an associated PDF in IndexedDB
        try {
            const pdfBlob = await Utils.db.get(id);
            if (pdfBlob && this.app.pdfManager) {
                const pdfUrl = URL.createObjectURL(pdfBlob);
                await this.app.pdfManager.loadPDF(pdfUrl);
            }
        } catch (error) {
            console.error('Error loading PDF from DB:', error);
        }

        const savedData = localStorage.getItem(`wb_content_${id}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            // Clear current state before loading new one
            this.app.state.objects = [];

            // Handle multiple pages if any
            if (parsed.pages && this.app.pageManager) {
                this.app.pageManager.pages = parsed.pages;
                this.app.pageManager.renderPageList();
                // Pass false for shouldSave because we are loading new data
                this.app.pageManager.switchPage(0, true, false);
            } else {
                this.app.state.objects = parsed.objects || [];
            }
        } else {
            // New board or no saved content
            this.app.state.objects = [];
            if (this.app.pageManager) {
                // If it was a PDF, pages might have been created by PDFManager.loadPDF
                if (this.app.pageManager.pages.length === 0) {
                    this.app.pageManager.pages = [{
                        id: Date.now(),
                        name: 'Sayfa 1',
                        objects: [],
                        backgroundColor: 'white',
                        backgroundPattern: 'none',
                        thumbnail: null
                    }];
                    this.app.pageManager.renderPageList();
                    // Pass false for shouldSave because it's a new board
                    this.app.pageManager.switchPage(0, true, false);
                }
            }
        }

        this.app.redrawOffscreen();
        this.app.render();
    }

    saveCurrentBoard() {
        if (!this.currentBoardId) return;

        // 1. Sync current page state before saving everything
        if (this.app.pageManager) {
            this.app.pageManager.saveCurrentPageState();
        }

        // Generate preview (thumbnail) with error handling for CORS/tainted canvas
        let preview = null;
        try {
            preview = this.app.canvas.toDataURL('image/webp', 0.5);
        } catch (error) {
            console.warn('Could not generate preview due to canvas tainting:', error);
            // Continue without preview - this is not critical
        }

        // Update board meta
        const boardIndex = this.boards.findIndex(b => b.id === this.currentBoardId);
        if (boardIndex !== -1) {
            this.boards[boardIndex].lastModified = Date.now();
            if (preview) {
                this.boards[boardIndex].preview = preview;
            }
            this.boards[boardIndex].objectCount = this.app.state.objects.length;
            this.saveData('wb_boards', this.boards);
        }

        // Save content with deep clone
        const content = {
            objects: Utils.deepClone(this.app.state.objects),
            pages: this.app.pageManager ? Utils.deepClone(this.app.pageManager.pages) : null
        };
        localStorage.setItem(`wb_content_${this.currentBoardId}`, JSON.stringify(content));
    }

    showDashboard() {
        this.saveCurrentBoard();

        // Keep tabs open when returning to dashboard
        // Users can close tabs manually if needed

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

            // Remove from TabManager if open
            if (this.app.tabManager) {
                this.app.tabManager.closeTab(id);
            }

            this.renderBoards();
        }
    }

    emptyTrash() {
        const trashCount = this.boards.filter(b => b.deleted).length;
        if (trashCount === 0) return;

        if (confirm(`Çöp kutusundaki ${trashCount} öğeyi kalıcı olarak silmek istediğinize emin misiniz?`)) {
            // Permanently delete boards and their content
            this.boards.filter(b => b.deleted).forEach(b => {
                localStorage.removeItem(`wb_content_${b.id}`);
                // Also remove from Utils.db if it's a PDF
                if (b.isPDF) {
                    Utils.db.delete(b.id).catch(err => console.error('Error deleting PDF from DB:', err));
                }
            });

            const idsToClose = this.boards.filter(b => b.deleted).map(b => b.id);
            this.boards = this.boards.filter(b => !b.deleted);
            this.saveData('wb_boards', this.boards);

            // Remove from TabManager if open
            if (this.app.tabManager) {
                idsToClose.forEach(id => this.app.tabManager.closeTab(id));
            }

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

            // Update tab title if this board is open in a tab
            if (this.app.tabManager) {
                this.app.tabManager.updateTabTitle(id, newName.trim());
            }
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

    /**
     * Template Gallery Methods
     */
    openTemplateGallery() {
        const modal = document.getElementById('templateGalleryModal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.renderTemplateGallery();
        this.setupTemplateGalleryHandlers();
    }

    closeTemplateGallery() {
        const modal = document.getElementById('templateGalleryModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setupTemplateGalleryHandlers() {
        // Close button
        const closeBtn = document.getElementById('btnCloseTemplateModal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeTemplateGallery();
        }

        // Overlay click
        const overlay = document.querySelector('.template-modal-overlay');
        if (overlay) {
            overlay.onclick = () => this.closeTemplateGallery();
        }

        // Category filtering
        document.querySelectorAll('.category-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const category = item.dataset.category;
                this.renderTemplateGallery(category);
            };
        });

        // Search
        const searchInput = document.getElementById('templateSearchInput');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const query = e.target.value;
                this.renderTemplateGallery(null, query);
            };
        }

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeTemplateGallery();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    renderTemplateGallery(category = 'Tümü', searchQuery = '') {
        const grid = document.getElementById('templateGrid');
        if (!grid || !this.app.templateManager) return;

        let templates = [];

        if (searchQuery) {
            templates = this.app.templateManager.searchTemplates(searchQuery);
        } else if (category) {
            templates = this.app.templateManager.getTemplatesByCategory(category);
        } else {
            templates = this.app.templateManager.templates;
        }

        grid.innerHTML = '';

        if (templates.length === 0) {
            grid.innerHTML = `
                <div class="template-empty-state">
                    <h3>Şablon bulunamadı</h3>
                    <p>Arama kriterlerinizi değiştirmeyi deneyin</p>
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const isFavorite = this.app.templateManager.favoriteTemplates.includes(template.id);
            const isUserTemplate = template.isUserTemplate || false;

            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <div class="template-thumbnail" style="${template.thumbnail ? `background-image: url(${template.thumbnail}); background-size: cover; background-position: center;` : ''}">
                    ${!template.thumbnail ? '<div style="font-size: 48px; opacity: 0.3;">📋</div>' : ''}
                </div>
                <button class="template-favorite-btn ${isFavorite ? 'active' : ''}" data-template-id="${template.id}">
                    <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                ${isUserTemplate ? `
                <button class="template-delete-btn" data-template-id="${template.id}" title="Şablonu Sil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
                ` : ''}
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-description">${template.description}</div>
                    <span class="template-category-badge">${template.category}</span>
                </div>
            `;

            // Apply template on click
            card.onclick = (e) => {
                if (e.target.closest('.template-favorite-btn') || e.target.closest('.template-delete-btn')) return;
                this.applyTemplateAndCreateBoard(template.id);
            };

            // Favorite toggle
            const favoriteBtn = card.querySelector('.template-favorite-btn');
            favoriteBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.templateManager.toggleFavorite(template.id);
                this.renderTemplateGallery(category, searchQuery);
                this.updateFavoritesCount();
            };

            // Delete button (for user templates)
            const deleteBtn = card.querySelector('.template-delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    const success = this.app.templateManager.deleteUserTemplate(template.id);
                    if (success) {
                        this.renderTemplateGallery(category, searchQuery);
                    }
                };
            }

            grid.appendChild(card);
        });

        this.updateFavoritesCount();
    }

    updateFavoritesCount() {
        const countEl = document.getElementById('favoritesCount');
        if (countEl && this.app.templateManager) {
            const count = this.app.templateManager.favoriteTemplates.length;
            countEl.textContent = `${count} favori şablon`;
        }
    }

    applyTemplateAndCreateBoard(templateId) {
        // Create a new board first
        const id = 'b_' + Date.now();
        const template = this.app.templateManager.templates.find(t => t.id === templateId);

        const newBoard = {
            id: id,
            name: template ? template.name : 'Yeni Not',
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

        // Close template gallery
        this.closeTemplateGallery();

        // Load the board
        this.loadBoard(id);

        // Apply template after a short delay to ensure board is loaded
        setTimeout(() => {
            if (this.app.templateManager) {
                this.app.templateManager.applyTemplate(templateId);
            }
        }, 100);
    }
}
