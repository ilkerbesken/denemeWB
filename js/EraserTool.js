class EraserTool {
    constructor() {
        this.isErasing = false;
        this.eraserSize = 20;
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isErasing = true;
        this.erase(pos, state);
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        if (!this.isErasing) return;
        this.erase(pos, state);
        return true;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        this.isErasing = false;
        return null;
    }

    erase(pos, state) {
        if (state.eraserMode === 'partial') {
            this.erasePartial(pos, state);
        } else {
            this.eraseObject(pos, state);
        }
    }

    eraseObject(pos, state) {
        const eraserX = pos.x;
        const eraserY = pos.y;
        const eraserRadius = this.eraserSize;

        // Silgiye yakın nesneleri bul ve sil
        state.objects = state.objects.filter(obj => {
            return !this.intersectsWithEraser(obj, eraserX, eraserY, eraserRadius);
        });
    }

    erasePartial(pos, state) {
        const r = this.eraserSize;
        const nextObjects = [];
        let modified = false;

        for (const obj of state.objects) {
            // Sadece kalem ve fosforlu kalem yollarını böl
            if (obj.type === 'pen' || obj.type === 'highlighter') {
                if (this.intersectsWithEraser(obj, pos.x, pos.y, r)) {
                    const segments = this.splitPath(obj, pos, r);
                    nextObjects.push(...segments);
                    modified = true;
                } else {
                    nextObjects.push(obj);
                }
            } else {
                // Diğer nesneler etkilenmez
                nextObjects.push(obj);
            }
        }

        if (modified) {
            state.objects = nextObjects;
        }
    }

    splitPath(obj, pos, radius) {
        const points = obj.points;
        const segments = [];
        let currentSegment = [];

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            // Nokta silgi yarıçapı dışında mı?
            if (Utils.distance(p, pos) > radius) {
                currentSegment.push(p);
            } else {
                // Kopuş noktası
                if (currentSegment.length > 0) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
            }
        }
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        // Yeni segmentlerden nesneler oluştur
        return segments
            .filter(seg => seg.length > 1) // Tek noktalı (görünmez) segmentleri at
            .map(seg => {
                const newObj = Object.assign({}, obj);
                newObj.points = seg;
                newObj.id = Date.now() + Math.random(); // Yeni benzersiz ID
                return newObj;
            });
    }

    intersectsWithEraser(obj, x, y, radius) {
        switch (obj.type) {
            case 'highlighter':
            case 'pen':
                return obj.points.some(p =>
                    Utils.distance(p, { x, y }) < radius
                );

            case 'line':
            case 'arrow':
                return this.lineIntersectsCircle(
                    obj.start, obj.end, { x, y }, radius
                );

            case 'rectangle':
                return this.rectIntersectsCircle(obj, { x, y }, radius);

            case 'ellipse':
                return this.ellipseIntersectsCircle(obj, { x, y }, radius);

            default:
                return false;
        }
    }

    lineIntersectsCircle(start, end, center, radius) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const fx = start.x - center.x;
        const fy = start.y - center.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - radius * radius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return false;

        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }

    rectIntersectsCircle(rect, center, radius) {
        const x = Math.min(rect.start.x, rect.end.x);
        const y = Math.min(rect.start.y, rect.end.y);
        const w = Math.abs(rect.end.x - rect.start.x);
        const h = Math.abs(rect.end.y - rect.start.y);

        const closestX = Math.max(x, Math.min(center.x, x + w));
        const closestY = Math.max(y, Math.min(center.y, y + h));

        const dist = Utils.distance({ x: closestX, y: closestY }, center);
        return dist < radius;
    }

    ellipseIntersectsCircle(ellipse, center, radius) {
        const cx = (ellipse.start.x + ellipse.end.x) / 2;
        const cy = (ellipse.start.y + ellipse.end.y) / 2;

        const dist = Utils.distance({ x: cx, y: cy }, center);
        return dist < radius + 50; // Yaklaşık kontrol
    }

    draw(ctx, object) {
        // Silgi için çizim yok
    }

    drawPreview(ctx, object) {
        // Önizleme yok
    }

    drawCursor(ctx, x, y) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.arc(x, y, this.eraserSize, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
    }
}
