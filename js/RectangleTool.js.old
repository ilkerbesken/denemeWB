class RectangleTool {
    constructor() {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentRect = null;
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isDrawing = true;
        this.startPoint = { x: pos.x, y: pos.y };

        this.currentRect = {
            type: 'rectangle',
            start: this.startPoint,
            end: this.startPoint,
            color: state.strokeColor,
            width: state.strokeWidth,
            lineStyle: state.lineStyle || 'solid',
            opacity: state.opacity,
            pressure: state.pressureEnabled ? Utils.normalizePressure(pos.pressure) : 0.5
        };
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return;

        this.currentRect.end = { x: pos.x, y: pos.y };
        this.currentRect.pressure = state.pressureEnabled ? Utils.normalizePressure(pos.pressure) : 0.5;

        return true;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return null;

        this.isDrawing = false;
        const completedRect = this.currentRect;
        this.currentRect = null;
        this.startPoint = null;

        return completedRect;
    }

    draw(ctx, object) {
        const x = Math.min(object.start.x, object.end.x);
        const y = Math.min(object.start.y, object.end.y);
        const width = Math.abs(object.end.x - object.start.x);
        const height = Math.abs(object.end.y - object.start.y);
        const angle = object.angle || 0;

        const lineWidth = Utils.getPressureWidth(object.width, object.pressure);

        ctx.save();
        ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1.0;
        ctx.strokeStyle = object.color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
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

        if (angle !== 0) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.translate(-centerX, -centerY);
        }

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.stroke();

        ctx.restore();
    }

    drawPreview(ctx, object) {
        this.draw(ctx, object);

        // Köşelerde küçük noktalar göster
        ctx.fillStyle = object.color;
        const corners = [
            object.start,
            { x: object.end.x, y: object.start.y },
            object.end,
            { x: object.start.x, y: object.end.y }
        ];

        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
