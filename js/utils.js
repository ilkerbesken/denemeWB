// Yardımcı Fonksiyonlar
const Utils = {
    // İki nokta arası mesafe
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Basınç değerini normalize et
    normalizePressure(pressure) {
        // Fare kullanıyorsa 0.5, stylus kullanıyorsa gerçek basınç
        return pressure || 0.5;
    },

    // Basınca göre çizgi kalınlığı hesapla
    getPressureWidth(baseWidth, pressure) {
        const p = (pressure !== undefined && !isNaN(pressure)) ? pressure : 0.5;
        // 0.4x ile 1.6x arası dengeli bir aralık
        return baseWidth * (0.4 + p * 1.2);
    },

    // Noktaları yumuşat (Douglas-Peucker benzeri)
    simplifyPoints(points, tolerance = 2) {
        if (points.length < 3) return points;

        const simplified = [points[0]];

        for (let i = 1; i < points.length - 1; i++) {
            const prev = simplified[simplified.length - 1];
            const curr = points[i];

            if (this.distance(prev, curr) > tolerance) {
                simplified.push(curr);
            }
        }

        simplified.push(points[points.length - 1]);
        return simplified;
    },

    // Basınç değerlerini yumuşat
    smoothPressure(points) {
        if (points.length < 3) return points;

        const smoothed = points.map(p => ({ ...p }));

        for (let pass = 0; pass < 1; pass++) {
            for (let i = 1; i < smoothed.length - 1; i++) {
                const prev = smoothed[i - 1].pressure !== undefined ? smoothed[i - 1].pressure : 0.5;
                const curr = smoothed[i].pressure !== undefined ? smoothed[i].pressure : 0.5;
                const next = smoothed[i + 1].pressure !== undefined ? smoothed[i + 1].pressure : 0.5;
                smoothed[i].pressure = (prev + curr * 2 + next) / 4;
            }
        }

        return smoothed;
    },

    // Catmull-Rom interpolasyon
    getCatmullRomPoint(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: 0.5 * ((2 * p1.x) +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    },

    // Vektör İşlemleri
    vecSub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    },
    vecAdd(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    },
    vecMul(a, n) {
        return { x: a.x * n, y: a.y * n };
    },
    vecDiv(a, n) {
        return { x: a.x / n, y: a.y / n };
    },
    vecLen(a) {
        return Math.sqrt(a.x * a.x + a.y * a.y);
    },
    vecNormalize(a) {
        const len = this.vecLen(a);
        return len === 0 ? { x: 0, y: 0 } : this.vecDiv(a, len);
    },
    vecPerp(a) {
        return { x: -a.y, y: a.x };
    },
    vecLrp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            pressure: (a.pressure !== undefined && b.pressure !== undefined)
                ? a.pressure + (b.pressure - a.pressure) * t
                : (a.pressure || b.pressure || 0.5)
        };
    },
    // Chaikin Smoothing Pass
    chaikin(points, iterations = 1) {
        if (points.length < 3) return points;
        let smoothed = points;
        for (let i = 0; i < iterations; i++) {
            const next = [smoothed[0]];
            for (let j = 0; j < smoothed.length - 1; j++) {
                const p0 = smoothed[j];
                const p1 = smoothed[j + 1];
                next.push(this.vecLrp(p0, p1, 0.25));
                next.push(this.vecLrp(p0, p1, 0.75));
            }
            next.push(smoothed[smoothed.length - 1]);
            smoothed = next;
        }
        return smoothed;
    },

    // Point to segment distance
    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return this.distance(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return this.distance(p, {
            x: v.x + t * (w.x - v.x),
            y: v.y + t * (w.y - v.y)
        });
    },

    // Line segment (p1, p2) intersection with Rectangle (rect:{x,y,width,height})
    lineRectIntersect(p1, p2, rect) {
        const minX = rect.x;
        const minY = rect.y;
        const maxX = rect.x + rect.width;
        const maxY = rect.y + rect.height;

        // Cohen-Sutherland Line Clipping Algorithm simplified usually works, 
        // or just check intersection with 4 sides.

        // Helper to check line intersection
        const intersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
            const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            if (denom === 0) return false;
            const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
            const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
            return (ua >= 0 && ua <= 1) && (ub >= 0 && ub <= 1);
        };

        // Check 4 sides of rect
        const topLeft = { x: minX, y: minY };
        const topRight = { x: maxX, y: minY };
        const bottomRight = { x: maxX, y: maxY };
        const bottomLeft = { x: minX, y: maxY };

        if (intersect(p1.x, p1.y, p2.x, p2.y, topLeft.x, topLeft.y, topRight.x, topRight.y)) return true;
        if (intersect(p1.x, p1.y, p2.x, p2.y, topRight.x, topRight.y, bottomRight.x, bottomRight.y)) return true;
        if (intersect(p1.x, p1.y, p2.x, p2.y, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y)) return true;
        if (intersect(p1.x, p1.y, p2.x, p2.y, bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y)) return true;

        // Check if line is completely inside (already handled by point check, but harmless to repeat implicitly if endpoints are inside)
        // If one point inside, it's intersection.
        if ((p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
            (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY)) {
            return true;
        }

        return false;
    },
    // Line segment (p1, p2) intersection with Line segment (p3, p4)
    lineLineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        return (ua >= 0 && ua <= 1) && (ub >= 0 && ub <= 1);
    },
    // Deep clone objects whilst preserving Canvas/Image references
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;

        if (obj instanceof HTMLCanvasElement || obj instanceof HTMLImageElement) {
            return obj; // Maintain reference
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
};
