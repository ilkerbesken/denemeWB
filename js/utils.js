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

    // Basınca göre çizgi kalınlığı hesapla (2 kat hassas)
    getPressureWidth(baseWidth, pressure) {
        // Çok daha geniş aralık: 0.2x ile 2.2x arası
        return baseWidth * (0.2 + pressure * 2.0);
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

    // Basınç değerlerini yumuşat (geliştirilmiş)
    smoothPressure(points) {
        if (points.length < 3) return points;
        
        const smoothed = [...points];
        
        // İki geçişli yumuşatma
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 1; i < smoothed.length - 1; i++) {
                const prev = smoothed[i - 1].pressure;
                const curr = smoothed[i].pressure;
                const next = smoothed[i + 1].pressure;
                
                // Gaussian-benzeri ağırlıklı ortalama
                smoothed[i].pressure = (prev + curr * 4 + next) / 6;
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
    }
};
