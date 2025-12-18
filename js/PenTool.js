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
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        this.isDrawing = true;
        this.isStraightLocked = false;
        this.points = [];
        this.rawPoints = [];

        clearTimeout(this.straightenTimer);

        const point = {
            x: pos.x,
            y: pos.y,
            pressure: (state.pressureEnabled !== false && state.currentTool !== 'highlighter') ? Utils.normalizePressure(pos.pressure) : (state.currentTool === 'highlighter' ? 0.5 : 0.5)
        };

        this.rawPoints.push(point);
        this.points.push(point);
        this.lastPoint = point;

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

        const point = {
            x: pos.x,
            y: pos.y,
            pressure: (state.pressureEnabled !== false && state.currentTool !== 'highlighter') ? Utils.normalizePressure(pos.pressure) : (state.currentTool === 'highlighter' ? 0.5 : 0.5)
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

        // Anlık yumuşatma uygula
        this.currentPath.points = this.getSmoothedPoints(this.points);

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

        // Final yumuşatma (eğer düzleştirilmediyse)
        if (!this.currentPath.isStraightened) {
            const finalPoints = this.getSmoothedPoints(this.points);
            const pressureSmoothed = Utils.smoothPressure(finalPoints);

            // Fix last point pressure for consistent endpoints
            // When lifting stylus quickly, last point often has very low pressure
            // causing rounded endpoints. Use average of previous points instead.
            if (pressureSmoothed.length >= 3) {
                const lastIdx = pressureSmoothed.length - 1;
                const prevIdx1 = lastIdx - 1;
                const prevIdx2 = lastIdx - 2;

                // Use average of previous 2 points, then reduce for natural taper
                const avgPressure = (pressureSmoothed[prevIdx1].pressure + pressureSmoothed[prevIdx2].pressure) / 2;

                // Apply taper: reduce to quarter for natural pen-like ending
                pressureSmoothed[lastIdx].pressure = avgPressure * 0.25;
            } else if (pressureSmoothed.length === 2) {
                // For very short strokes, use quarter of first point's pressure
                pressureSmoothed[1].pressure = pressureSmoothed[0].pressure * 0.25;
            }

            this.currentPath.points = pressureSmoothed;
        } else {
            // Düzleştirilmişse, son noktayı güncellemeye gerek yok, zaten düz.
            // Belki son noktayı eklemek gerekebilir ama straightenPath zaten yapıyor.
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

    getSmoothedPoints(points) {
        if (points.length < 3) return points;

        const smoothed = [points[0]];

        // Weighted moving average
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            // Ağırlıklı ortalama (4:2:1 oranı)
            smoothed.push({
                x: (prev.x + curr.x * 4 + next.x) / 6,
                y: (prev.y + curr.y * 4 + next.y) / 6,
                pressure: (prev.pressure + curr.pressure * 4 + next.pressure) / 6
            });
        }

        smoothed.push(points[points.length - 1]);
        return smoothed;
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
        // Highlighter Optimization: Draw as a single continuous path
        // This prevents opacity accumulation at segment overlaps (dots) and 
        // ensures a smooth, continuous line for transparent strokes.
        if (object.isHighlighter) {
            if (object.points.length < 2) return;

            ctx.lineWidth = object.width; // Highlighter has constant width
            ctx.lineCap = object.cap || 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(object.points[0].x, object.points[0].y);

            if (object.points.length === 2) {
                ctx.lineTo(object.points[1].x, object.points[1].y);
            } else {
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

                    ctx.quadraticCurveTo(cp1x, cp1y, midX, midY);
                }

                // Connect the last few points
                const lastIdx = object.points.length - 1;
                const pLast = object.points[lastIdx];
                ctx.lineTo(pLast.x, pLast.y);
            }

            ctx.stroke();
            return;
        }

        // Pen Optimization: Draw as a Single Filled Polygon (Variable Width)
        // This solves the overlapping segment artifacts when opacity < 1.0 while preserving pressure sensitivity.

        // Single point (Dot) support
        if (object.points.length === 1) {
            const p = object.points[0];
            const width = Utils.getPressureWidth(object.width, p.pressure) / 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, width, 0, Math.PI * 2);
            ctx.fillStyle = object.color;
            ctx.fill();
            return;
        }

        if (object.points.length < 2) return;

        // Pen with Pressure: Use overlapping circles for perfect round caps

        // Critical Performance Optimization:
        // Only use a temporary canvas if we have transparency (opacity < 1).
        // If opacity is 1, overlapping circles merge perfectly on the main canvas.
        // Creating a temporary canvas for every stroke is extremely expensive (VRAM/GC) 
        // and causes lag during rapid drawing or full redraws.
        const opacity = object.opacity !== undefined ? object.opacity : 1.0;
        const useTempCanvas = opacity < 1.0;

        let targetCtx = ctx;
        let tempCanvas = null;

        if (useTempCanvas) {
            // Use a temporary canvas to prevent opacity accumulation
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = ctx.canvas.width;
            tempCanvas.height = ctx.canvas.height;
            targetCtx = tempCanvas.getContext('2d');

            // Transfer properties
            targetCtx.lineCap = 'round';
            targetCtx.lineJoin = 'round';
        }

        targetCtx.fillStyle = object.color;

        // Draw circles at each point
        for (let i = 0; i < object.points.length; i++) {
            const p = object.points[i];
            const radius = Utils.getPressureWidth(object.width, p.pressure) / 2;

            // Only draw the first point explicitly
            // All other points will be drawn through interpolation
            if (i === 0) {
                targetCtx.beginPath();
                targetCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                targetCtx.fill();
            }

            // Draw connecting segments between points
            if (i > 0) {
                const prevP = object.points[i - 1];

                // Calculate angle between points
                const dx = p.x - prevP.x;
                const dy = p.y - prevP.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    // Draw interpolated circles along the segment for smooth connection
                    // Use dist / 1 for maximum density to handle fast strokes
                    const steps = Math.ceil(dist / 1); // One circle per pixel for perfect coverage
                    for (let j = 1; j <= steps; j++) {
                        const t = j / steps;
                        const interpX = prevP.x + dx * t;
                        const interpY = prevP.y + dy * t;
                        const interpPressure = prevP.pressure + (p.pressure - prevP.pressure) * t;
                        const interpRadius = Utils.getPressureWidth(object.width, interpPressure) / 2;

                        targetCtx.beginPath();
                        targetCtx.arc(interpX, interpY, interpRadius, 0, Math.PI * 2);
                        targetCtx.fill();
                    }
                }
            }
        }

        // Draw the temporary canvas onto the main canvas (if used)
        if (useTempCanvas) {
            ctx.drawImage(tempCanvas, 0, 0);
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
