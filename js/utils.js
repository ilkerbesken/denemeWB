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
    }
};
