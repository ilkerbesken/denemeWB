class LineTool {
    constructor() {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentLine = null;
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isDrawing = true;
        this.startPoint = {
            x: pos.x,
            y: pos.y,
            pressure: state.pressureEnabled ? Utils.normalizePressure(pos.pressure) : 0.5
        };

        this.currentLine = {
            type: 'line',
            start: this.startPoint,
            end: this.startPoint,
            color: state.strokeColor,
            width: state.strokeWidth,
            opacity: state.opacity,
            lineStyle: state.lineStyle || 'solid'
        };
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return;

        this.currentLine.end = {
            x: pos.x,
            y: pos.y,
            pressure: state.pressureEnabled ? Utils.normalizePressure(pos.pressure) : 0.5
        };

        return true;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return null;

        this.isDrawing = false;
        const completedLine = this.currentLine;
        this.currentLine = null;
        this.startPoint = null;

        return completedLine;
    }

    draw(ctx, object) {
        ctx.save();
        ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1.0;
        let color = object.color;
        if (color === 'rainbow') {
            color = Utils.getRainbowGradientForRect(
                ctx,
                Math.min(object.start.x, object.end.x),
                Math.min(object.start.y, object.end.y),
                Math.max(1, Math.abs(object.end.x - object.start.x)),
                Math.max(1, Math.abs(object.end.y - object.start.y))
            );
        }
        ctx.strokeStyle = color;

        const avgPressure = (object.start.pressure + object.end.pressure) / 2;
        const lineWidth = Utils.getPressureWidth(object.width, avgPressure);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        // Apply line style
        const lineStyle = object.lineStyle || 'solid';
        switch (lineStyle) {
            case 'dashed':
                ctx.setLineDash([lineWidth * 3, lineWidth * 3]);
                break;
            case 'dotted':
                ctx.setLineDash([lineWidth * 0.1, lineWidth * 3]);
                break;
            case 'dash-dot':
                ctx.setLineDash([lineWidth * 4, lineWidth * 3, lineWidth * 0.1, lineWidth * 3]);
                break;
            default:
                ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(object.start.x, object.start.y);
        ctx.lineTo(object.end.x, object.end.y);
        ctx.stroke();

        ctx.restore();
    }

    drawPreview(ctx, object) {
        this.draw(ctx, object);
    }
}
