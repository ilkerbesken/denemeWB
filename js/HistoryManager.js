class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
    }

    saveState(objects) {
        // Derin kopyalama
        const state = JSON.parse(JSON.stringify(objects));
        this.undoStack.push(state);
        
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        // Yeni durum kaydedildiğinde redo stack'i temizle
        this.redoStack = [];
    }

    undo(currentObjects) {
        if (this.undoStack.length === 0) return null;
        
        // Mevcut durumu redo stack'e kaydet
        this.redoStack.push(JSON.parse(JSON.stringify(currentObjects)));
        
        // Önceki durumu geri getir
        return this.undoStack.pop();
    }

    redo(currentObjects) {
        if (this.redoStack.length === 0) return null;
        
        // Mevcut durumu undo stack'e kaydet
        this.undoStack.push(JSON.parse(JSON.stringify(currentObjects)));
        
        // İleri durumu geri getir
        return this.redoStack.pop();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
