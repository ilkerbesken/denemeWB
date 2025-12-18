class PenTool {
    constructor(onRepaint) {
        this.isDrawing = false;
        this.currentPath = null;
        this.points = [];
        this.rawPoints = [];
        this.lastPoint = null;
        this.minDistance = 1; // Çok küçük mesafe = daha fazla nokta = daha smooth
        this.onRepaint = onRepaint;
        this.straightenTimer = null;
        this.isStraightLocked = false;

        // Streamline state
        this.streamlinePoints = [];
        this.lastStreamlined = null;
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isDrawing = true;
        this.isStraightLocked = false;
        this.points = [];
        this.rawPoints = [];
        this.streamlinePoints = [];
        this.lastStreamlined = null;
        this.lastPoint = null;

        clearTimeout(this.straightenTimer);

        const point = {
            x: pos.x,
            y: pos.y,
            pressure: (state.pressureEnabled !== false && state.currentTool !== 'highlighter') ? Utils.normalizePressure(pos.pressure) : (state.currentTool === 'highlighter' ? 0.5 : 0.5)
        };

        this.rawPoints.push(point);
        this.points.push(point);
        this.lastPoint = point;
        this.lastStreamlined = point;
        this.streamlinePoints = [point];

        this.currentPath = {
            type: state.currentTool === 'highlighter' ? 'highlighter' : 'pen',
            points: [...this.points],
            color: state.strokeColor,
            width: state.strokeWidth,
            opacity: state.opacity,
            lineStyle: state.lineStyle || 'solid',
            cap: state.currentTool === 'highlighter' ? state.highlighterCap : 'round',
            isHighlighter: state.currentTool === 'highlighter'
        };
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return;

        // Pressure simulation for mouse / smoothing for pen
        let currentPressure = (state.pressureEnabled !== false && state.currentTool !== 'highlighter')
            ? Utils.normalizePressure(pos.pressure)
            : 0.5;

        // If mouse (pressure is always 0.5 or 0), simulate based on velocity
        if (e.pointerType === 'mouse' && state.pressureEnabled !== false) {
            const dist = Utils.distance(this.lastPoint || pos, pos);
            const time = 16; // Approx 60fps
            const velocity = dist / time;

            // Damping for stability (moving average with previous)
            const prevPressure = this.lastPoint ? this.lastPoint.pressure : 0.5;
            const targetPressure = Math.max(0.35, 1.0 - velocity * 0.4); // Less extreme thinning
            currentPressure = prevPressure + (targetPressure - prevPressure) * 0.2; // Damping
        }

        const point = {
            x: pos.x,
            y: pos.y,
            pressure: currentPressure
        };

        // Eğer kilitlendiyse, sadece son noktayı güncelle (Line tool gibi davran)
        if (this.isStraightLocked) {
            this.points[this.points.length - 1] = point;
            this.currentPath.points = [this.points[0], point];
            return true;
        }

        // Minimum mesafe kontrolü
        if (this.lastPoint && Utils.distance(this.lastPoint, point) < this.minDistance) {
            return false;
        }

        this.points.push(point);
        this.lastPoint = point;

        // Streamline (tldraw-style): Pull the point towards the actual cursor
        const streamlineFactor = 0.92; // High responsiveness as requested
        const prev = this.lastStreamlined;
        const streamlined = {
            x: prev.x + (point.x - prev.x) * streamlineFactor,
            y: prev.y + (point.y - prev.y) * streamlineFactor,
            pressure: prev.pressure + (point.pressure - prev.pressure) * streamlineFactor
        };
        this.lastStreamlined = streamlined;
        this.streamlinePoints.push(streamlined);

        // Update current path
        // Optimization: during active drawing, only smooth if we have enough points
        // and use a lower iteration count.
        let drawPoints = this.streamlinePoints;
        if (drawPoints.length > 8) {
            drawPoints = Utils.chaikin(drawPoints, 1);
        }

        this.currentPath.points = drawPoints;

        // Auto-straighten timer
        clearTimeout(this.straightenTimer);
        this.straightenTimer = setTimeout(() => {
            if (this.isDrawing && this.points.length > 10) {
                this.straightenPath();
            }
        }, 500); // 0.5s bekleme

        return true;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        if (!this.isDrawing) return null;

        this.isDrawing = false;
        clearTimeout(this.straightenTimer);

        // Final smoothing and tapering
        if (!this.currentPath.isStraightened) {
            let finalPoints = [...this.streamlinePoints];

            // Apply Tapering (natural end)
            // Gradually reduce pressure of the last ~8 points
            const taperCount = Math.min(8, finalPoints.length);
            for (let i = 0; i < taperCount; i++) {
                const idx = finalPoints.length - 1 - i;
                const taperFactor = i / taperCount; // 0 at the very end, approaches 1 backwards
                // Ensure pressure goes towards zero or a very small value
                const minTaper = 0.1;
                finalPoints[idx].pressure = Math.max(minTaper, finalPoints[idx].pressure * taperFactor);
            }

            if (finalPoints.length > 5) {
                finalPoints = Utils.chaikin(finalPoints, 2);
            }
            this.currentPath.points = Utils.smoothPressure(finalPoints);
        }

        const completedPath = this.currentPath;
        this.currentPath = null;
        this.points = [];
        this.rawPoints = [];
        this.lastPoint = null;

        return completedPath;
    }

    straightenPath() {
        if (this.points.length < 2) return;

        const start = this.points[0];
        const end = this.points[this.points.length - 1];

        // Düz çizgi oluştur (arada nokta olmadan)
        // Ya da düz çizgi üzerinde interpolate edilmiş noktalar
        // Düz çizgi çizimi 2 nokta ile handle ediliyor draw metodunda

        const straightPoints = [start, end];

        // Orijinal (freehand) noktaları sakla - Undo için
        this.currentPath.originalPoints = [...this.points];

        this.currentPath.points = straightPoints;
        this.currentPath.isStraightened = true; // Flag to prevent re-smoothing on up
        this.isStraightLocked = true; // Kilit modunu aç

        // Repaint triggers
        if (this.onRepaint) this.onRepaint();
    }

    draw(ctx, object) {
        if (!object.points || object.points.length < 2) return;

        ctx.save();
        ctx.globalAlpha = object.opacity !== undefined ? object.opacity : 1.0;
        ctx.strokeStyle = object.color;

        if (object.isHighlighter) {
            // Transparency is now handled by object.opacity from state (defaulted to 0.7 in app.js)
            // But if we want to ensure it works even if object.opacity is missing for old highlighters:
            if (object.opacity === undefined) ctx.globalAlpha = 0.7;
        }

        // Manual Dashing Implementation
        // We will walk the path and manually stroke dash segments
        // This avoids browser artifacts at segment joins and ensures perfect spacing control

        let pattern = []; // [dash, gap, dash, gap...]
        const w = object.width;

        switch (object.lineStyle) {
            case 'solid': pattern = []; break; // Solid
            case 'dotted': pattern = [w * 0.1, w * 3]; break;
            case 'dashed': pattern = [w * 3, w * 3]; break;
            case 'dash-dot': pattern = [w * 4, w * 3, w * 0.1, w * 3]; break;
            case 'wavy':
                this.drawWavy(ctx, object);
                ctx.restore();
                return;
        }

        // If solid, use standard variable width drawing (it's efficient and looks good)
        if (pattern.length === 0) {
            this.drawSolid(ctx, object);
            ctx.restore();
            return;
        }

        // For dashed styles
        ctx.lineCap = object.cap || 'round'; // Use correct cap
        ctx.lineJoin = 'round';

        // Prepare path walker
        const pathPoints = this.flattenPath(object);

        let patternIdx = 0;
        let distInState = 0; // Distance covered in current pattern state (dash or gap)
        let isDash = true; // Start with dash

        let currentSubPath = []; // Points for current dash segment

        // Helper to draw a dashed segment
        const strokeDash = (points) => {
            if (points.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            // Calculate average pressure for this dash
            let totalPressure = 0;
            points.forEach(p => totalPressure += p.pressure);
            const avgPressure = totalPressure / points.length;

            ctx.lineWidth = Utils.getPressureWidth(object.width, avgPressure);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        };

        for (let i = 0; i < pathPoints.length - 1; i++) {
            const p1 = pathPoints[i];
            const p2 = pathPoints[i + 1];

            const segmentLen = Utils.distance(p1, p2);
            let remainingSegmentLen = segmentLen;
            let cursor = 0; // progress along this segment (0 to segmentLen)

            while (remainingSegmentLen > 0) {
                const targetLen = pattern[patternIdx];
                const spaceRemainingInState = targetLen - distInState;

                if (remainingSegmentLen <= spaceRemainingInState) {
                    // This entire segment (or remainder of it) fits in current state
                    if (isDash) {
                        if (currentSubPath.length === 0) currentSubPath.push(p1);
                        // Add interpolated point at the end if needed, but here p2 is the end
                        currentSubPath.push(p2);
                    }

                    distInState += remainingSegmentLen;
                    remainingSegmentLen = 0;
                } else {
                    // State change happens in the middle of this segment
                    const ratio = (cursor + spaceRemainingInState) / segmentLen;
                    const splitPoint = {
                        x: p1.x + (p2.x - p1.x) * ratio,
                        y: p1.y + (p2.y - p1.y) * ratio,
                        pressure: p1.pressure + (p2.pressure - p1.pressure) * ratio
                    };

                    if (isDash) {
                        currentSubPath.push(splitPoint);
                        strokeDash(currentSubPath);
                        currentSubPath = [];
                    }

                    // Advance state
                    distInState = 0;
                    patternIdx = (patternIdx + 1) % pattern.length;
                    isDash = (patternIdx % 2 === 0);

                    // If we just started a dash, add the split point as start
                    if (isDash) {
                        currentSubPath.push(splitPoint);
                    }

                    cursor += spaceRemainingInState;
                    remainingSegmentLen -= spaceRemainingInState;
                }
            }
        }

        // Draw last pending dash if any
        if (isDash && currentSubPath.length > 1) {
            strokeDash(currentSubPath);
        }

        ctx.restore();
    }

    drawSolid(ctx, object) {
        if (object.points.length < 1) return;

        // Highlighter: Single continuous path with constant width
        if (object.isHighlighter) {
            ctx.lineWidth = object.width;
            ctx.lineCap = object.cap || 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(object.points[0].x, object.points[0].y);

            if (object.points.length === 1) {
                ctx.lineTo(object.points[0].x, object.points[0].y);
            } else if (object.points.length === 2) {
                ctx.lineTo(object.points[1].x, object.points[1].y);
            } else {
                for (let i = 1; i < object.points.length - 1; i++) {
                    const xc = (object.points[i].x + object.points[i + 1].x) / 2;
                    const yc = (object.points[i].y + object.points[i + 1].y) / 2;
                    ctx.quadraticCurveTo(object.points[i].x, object.points[i].y, xc, yc);
                }
                const last = object.points[object.points.length - 1];
                ctx.lineTo(last.x, last.y);
            }
            ctx.stroke();
            return;
        }

        // Pen: Polygon-based drawing (Variable Width)
        if (object.points.length === 1) {
            const p = object.points[0];
            const radius = Utils.getPressureWidth(object.width, p.pressure) / 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = object.color;
            ctx.fill();
            return;
        }

        // Draw in segments to avoid massive self-intersecting polygons
        ctx.fillStyle = object.color;

        const pts = object.points;
        const len = pts.length;
        const baseWidth = object.width;

        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const pressure = p.pressure !== undefined ? p.pressure : 0.5;
            const r = Utils.getPressureWidth(baseWidth, pressure) / 2;

            // Draw joint circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Draw connecting ribbon segment
            if (i < len - 1) {
                const pNext = pts[i + 1];
                const d = Utils.distance(p, pNext);

                if (d > 0.1) {
                    const pNextPressure = pNext.pressure !== undefined ? pNext.pressure : 0.5;
                    const rNext = Utils.getPressureWidth(baseWidth, pNextPressure) / 2;

                    const angle = Math.atan2(pNext.y - p.y, pNext.x - p.x);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    const nx = -sin;
                    const ny = cos;

                    ctx.beginPath();
                    ctx.moveTo(p.x + nx * r, p.y + ny * r);
                    ctx.lineTo(pNext.x + nx * rNext, pNext.y + ny * rNext);
                    ctx.lineTo(pNext.x - nx * rNext, pNext.y - ny * rNext);
                    ctx.lineTo(p.x - nx * r, p.y - ny * r);
                    ctx.fill();
                }
            }
        }
    }


    flattenPath(object) {
        // Convert bezier path to high-resolution polyline for accurate dashing
        if (object.points.length < 3) return object.points;

        let flattened = [object.points[0]];
        const steps = 5; // Resolution per segment

        for (let i = 0; i < object.points.length - 2; i++) {
            const p0 = object.points[i];
            const p1 = object.points[i + 1];
            const p2 = object.points[i + 2];

            const cp1x = p0.x + (p1.x - p0.x) * 0.66;
            const cp1y = p0.y + (p1.y - p0.y) * 0.66;
            const cp2x = p1.x + (p2.x - p1.x) * 0.33;
            const cp2y = p1.y + (p2.y - p1.y) * 0.33;
            const midX = (cp1x + cp2x) / 2;
            const midY = (cp1y + cp2y) / 2;

            // Sample quadratic bezier (p0 -> mid via control points)
            // Wait, previous draw used 2 QCs here? 
            // Previous code: quadraticCurveTo(cp1x, cp1y, midX, midY)
            // That's ONE quadratic curve from p0 to midX,midY with cp1 as control.

            // Wait, previous code logic was:
            // p0 is start.
            // cp1 is control.
            // mid is end.

            // So we sample this single Quad curve.
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const it = 1 - t;
                // Quad Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                // P0=(p0.x,y), P1=(cp1x,cp1y), P2=(midX,midY)

                const x = it * it * p0.x + 2 * it * t * cp1x + t * t * midX;
                const y = it * it * p0.y + 2 * it * t * cp1y + t * t * midY;
                const pressure = p0.pressure + (p1.pressure - p0.pressure) * (t * 0.5); // Approx pressure interpolation

                flattened.push({ x, y, pressure });
            }
        }

        // Add last point
        flattened.push(object.points[object.points.length - 1]);

        return flattened;
    }

    drawWavy(ctx, object) {
        if (object.points.length < 2) return;

        const amplitude = Math.max(2, object.width * 0.8);
        // Eski haline (sabit frekans) yakın bir değer
        const wavelength = 20 + object.width * 2; // Hafif ölçekleme, ama eskisi kadar agresif değil
        const frequency = (Math.PI * 2) / wavelength;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let totalDist = 0;

        ctx.beginPath();

        // İlk nokta
        const p0 = object.points[0];

        // Bezier noktalarını topla
        // Normal draw'daki mantığın aynısını kullanarak curve üzerinde gezineceğiz

        if (object.points.length === 2) {
            // Düz çizgi üzerinde dalga
            const p1 = object.points[0];
            const p2 = object.points[1];
            const width = Utils.getPressureWidth(object.width, (p1.pressure + p2.pressure) / 2);
            this.drawWavySegment(ctx, p1.x, p1.y, p2.x, p2.y, totalDist, amplitude, frequency, width);
            ctx.stroke();
            return;
        }

        // 3+ nokta
        let startX = object.points[0].x;
        let startY = object.points[0].y;

        for (let i = 0; i < object.points.length - 2; i++) {
            const p0 = object.points[i];
            const p1 = object.points[i + 1];
            const p2 = object.points[i + 2];

            const cp1x = p0.x + (p1.x - p0.x) * 0.66;
            const cp1y = p0.y + (p1.y - p0.y) * 0.66;
            const cp2x = p1.x + (p2.x - p1.x) * 0.33;
            const cp2y = p1.y + (p2.y - p1.y) * 0.33;

            const midX = (cp1x + cp2x) / 2;
            const midY = (cp1y + cp2y) / 2;

            const pressure = (p0.pressure + p1.pressure) / 2;
            const width = Utils.getPressureWidth(object.width, pressure);

            // Quadratic curve'ü sample al
            totalDist = this.drawWavyQuadCurve(ctx, startX, startY, cp1x, cp1y, midX, midY, totalDist, amplitude, frequency, width);

            startX = midX;
            startY = midY;
        }

        // Son segment
        const lastIdx = object.points.length - 1;
        const pLast1 = object.points[lastIdx - 1];
        const pLast2 = object.points[lastIdx];

        this.drawWavySegment(ctx, startX, startY, pLast2.x, pLast2.y, totalDist, amplitude, frequency, Utils.getPressureWidth(object.width, (pLast1.pressure + pLast2.pressure) / 2));

        ctx.stroke();
    }


    drawWavyQuadCurve(ctx, x0, y0, cpX, cpY, x1, y1, startDist, amplitude, frequency, width) {
        const steps = 10; // Precision
        let prevX = x0;
        let prevY = y0;
        let dist = startDist;

        // Curve uzunluğu tahmini için
        const chord = Math.hypot(x1 - x0, y1 - y0);
        if (chord < 1) return dist; // Çok küçükse atla

        // Daha fazla adım gerekirse artırılabilir
        const stepCount = Math.max(steps, Math.floor(chord / 2));

        for (let i = 1; i <= stepCount; i++) {
            const t = i / stepCount;
            const inverseT = 1 - t;

            // Quadratic Bezier formula
            const x = inverseT * inverseT * x0 + 2 * inverseT * t * cpX + t * t * x1;
            const y = inverseT * inverseT * y0 + 2 * inverseT * t * cpY + t * t * y1;

            dist = this.drawWavySegment(ctx, prevX, prevY, x, y, dist, amplitude, frequency, width);
            prevX = x;
            prevY = y;
        }
        return dist;
    }

    drawWavySegment(ctx, x0, y0, x1, y1, startDist, amplitude, frequency, width) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.1) return startDist;

        const ux = dx / len;
        const uy = dy / len;
        // Normal vector (-uy, ux)
        const nx = -uy;
        const ny = ux;

        // Dalga çiz
        // Tek tek nokta koymak yerine lineTo ile ilerle
        // Ancak performansı korumak için, bu segment çok kısaysa sadece sonuna kadar dalgayı ilerlet.
        // Ama biz zaten curve'ü parçaladık, bu segmentler küçük.
        // O yüzden sadece bu segment boyunca lineer interpolasyon yapıp dalgayı ekleyelim.

        // Küçük segment olduğu için tek bir adım yeterli mi? Hayır, segment düz olsa da dalga olmalı.
        // Segment uzunluğuna göre adım sayısı
        const segmentSteps = Math.ceil(len / 2); // 2px steps

        ctx.lineWidth = width;

        for (let i = 0; i <= segmentSteps; i++) {
            const t = i / segmentSteps;
            const px = x0 + dx * t;
            const py = y0 + dy * t;

            const currentDist = startDist + len * t;
            const offset = Math.sin(currentDist * frequency) * amplitude;

            const wx = px + nx * offset;
            const wy = py + ny * offset;

            if (currentDist === 0) {
                ctx.moveTo(wx, wy);
            } else {
                ctx.lineTo(wx, wy);
            }
        }
        return startDist + len;
    }

    drawPreview(ctx, object) {
        this.draw(ctx, object);
    }
}
