class TableTool {
    constructor() {
        this.reset();
    }

    reset() {
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.isValidClick = false; // Initialize isValidClick
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        // Mark that we started a click interaction on the canvas
        // This prevents 'pointerleave' or random 'pointerup' events from triggering the tool
        this.isValidClick = true;
        return null;
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        // If we move too much, maybe invalidate click? 
        // For now, let's keep it simple.
        return false;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        // Only trigger if:
        // 1. It is a genuine 'pointerup' event (not 'pointerleave' etc)
        // 2. We actually started the click on the canvas (this.isValidClick)
        if (e.type !== 'pointerup' || !this.isValidClick) {
            this.isValidClick = false;
            return null;
        }

        this.isValidClick = false;

        // Show prompt to get row/col count       
        const rowCount = state.tableRows || 3;
        const colCount = state.tableCols || 3;
        const cellWidth = 100;
        const cellHeight = 40;

        // Use position from Up event

        const table = {
            type: 'table',
            x: pos.x,
            y: pos.y,
            rows: rowCount,
            cols: colCount,
            width: colCount * cellWidth,
            height: rowCount * cellHeight,
            rowHeights: Array(rowCount).fill(cellHeight),
            colWidths: Array(colCount).fill(cellWidth),
            data: Array(rowCount).fill(null).map(() => Array(colCount).fill("")),
            borderColor: state.strokeColor || '#000000',
            borderWidth: 0.5,
            backgroundColor: 'transparent',
            locked: false
        };

        return table;
    }

    draw(ctx, obj) {
        ctx.save();
        ctx.translate(obj.x, obj.y);

        // Calculate total width/height from arrays to be safe, though interactions should update obj.width/height
        // But let's trust obj.colWidths and obj.rowHeights are truth sources
        const totalW = obj.colWidths.reduce((a, b) => a + b, 0);
        const totalH = obj.rowHeights.reduce((a, b) => a + b, 0);

        // Draw Background
        if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
            ctx.fillStyle = obj.backgroundColor;
            ctx.fillRect(0, 0, totalW, totalH);
        }

        // Draw Lines & Text
        ctx.strokeStyle = obj.borderColor || '#000';
        ctx.lineWidth = obj.borderWidth || 2;
        ctx.fillStyle = '#000'; // Text color
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Draw Rows
        let currentY = 0;
        for (let r = 0; r < obj.rows; r++) {
            let currentX = 0;
            const rHeight = obj.rowHeights[r];

            for (let c = 0; c < obj.cols; c++) {
                const cWidth = obj.colWidths[c];

                // Draw Cell Border
                ctx.strokeRect(currentX, currentY, cWidth, rHeight);

                // Draw Text
                const text = obj.data[r][c];
                if (text) {
                    ctx.save();
                    // Clip text to cell
                    ctx.beginPath();
                    ctx.rect(currentX + 2, currentY + 2, cWidth - 4, rHeight - 4);
                    ctx.clip();

                    ctx.fillText(text, currentX + 5, currentY + rHeight / 2);
                    ctx.restore();
                }

                currentX += cWidth;
            }
            currentY += rHeight;
        }

        ctx.restore();
    }

    drawPreview(ctx, obj) {
        // Not used currently as we create instantly
    }
}
