class EllipseTool {
    constructor() {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentEllipse = null;
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isDrawing = true;
        this.startPoint = { x: pos.x, y: pos.y };

        this.currentEllipse = {
            type: 'ellipse',
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

        this.currentEllipse.end = { x: pos.x, y: pos.y };
        this.currentEllipse.pressure = state.pressureEnabled ? Utils.normalizePressure(pos.pressure) : 0.5;

        return true;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return null;

        this.isDrawing = false;

        // Final özellikleri hesapla
        const centerX = (this.currentEllipse.start.x + this.currentEllipse.end.x) / 2;
        const centerY = (this.currentEllipse.start.y + this.currentEllipse.end.y) / 2;
        const radiusX = Math.abs(this.currentEllipse.end.x - this.currentEllipse.start.x) / 2;
        const radiusY = Math.abs(this.currentEllipse.end.y - this.currentEllipse.start.y) / 2;

        this.currentEllipse.center = { x: centerX, y: centerY };
        this.currentEllipse.radiusX = radiusX;
        this.currentEllipse.radiusY = radiusY;
        this.currentEllipse.angle = 0; // Başlangıç açısı

        const completedEllipse = this.currentEllipse;
        this.currentEllipse = null;
        this.startPoint = null;

        return completedEllipse;
    }

    draw(ctx, object) {
        // Eski nesneler için hesaplama (geriye dönük uyumluluk)
        const centerX = object.center ? object.center.x : (object.start.x + object.end.x) / 2;
        const centerY = object.center ? object.center.y : (object.start.y + object.end.y) / 2;
        const radiusX = object.radiusX !== undefined ? object.radiusX : Math.abs(object.end.x - object.start.x) / 2;
        const radiusY = object.radiusY !== undefined ? object.radiusY : Math.abs(object.end.y - object.start.y) / 2;
        const angle = object.angle || 0;

        const lineWidth = Utils.getPressureWidth(object.width, object.pressure);

        ctx.save();
        ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1.0;
        ctx.strokeStyle = object.color;
        ctx.lineWidth = lineWidth;

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

        // Döndürme işlemi
        if (angle !== 0) {
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.translate(-centerX, -centerY);
        }

        ctx.beginPath();
        if (radiusX > 0 && radiusY > 0) {
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        }
        ctx.stroke();

        ctx.restore();
    }

    drawPreview(ctx, object) {
        // Önizleme sırasında döndürme yok
        this.draw(ctx, object);
    }
}
