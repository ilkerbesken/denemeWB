const SWOT_TEMPLATE = {
    id: "swot-analysis",
    name: "SWOT Analizi",
    category: "İş Planlama",
    description: "Güçlü/Zayıf yönler ve Fırsat/Tehdit analizi",
    thumbnail: "assets/templates/swot.png",
    objects: [],

    generate: function () {
        const config = {
            startX: 100,
            startY: 100,
            size: 250,
            gap: 20,
            titleOffset: 30
        };

        const quadrants = [
            { label: "Güçlü Yönler", color: "#4caf50", row: 0, col: 0 },
            { label: "Zayıf Yönler", color: "#f44336", row: 0, col: 1 },
            { label: "Fırsatlar", color: "#2196f3", row: 1, col: 0 },
            { label: "Tehditler", color: "#ff9800", row: 1, col: 1 }
        ];

        // 1. Ana Başlığı Ekle
        this.objects = [{
            type: "text",
            x: config.startX + config.size + (config.gap / 2),
            y: 60,
            text: "SWOT Analizi",
            fontSize: 24, fontWeight: "bold", color: "#2d3436", textAlign: "center"
        }];

        // 2. Çeyrekleri Döngü ile Oluştur
        quadrants.forEach(q => {
            const posX = config.startX + (q.col * (config.size + config.gap));
            const posY = config.startY + (q.row * (config.size + config.gap));

            // Arka plan kutusu
            this.objects.push({
                type: "rectangle",
                x: posX, y: posY, width: config.size, height: config.size,
                color: q.color, fillColor: q.color, filled: true,
                opacity: 0.2, strokeWidth: 2, lineStyle: "solid"
            });

            // Bölüm başlığı
            this.objects.push({
                type: "text",
                x: posX + (config.size / 2), // Yatayda kutunun ortası
                y: posY + config.titleOffset,
                text: q.label,
                fontSize: 16, fontWeight: "bold", color: q.color, textAlign: "center"
            });
        });
    }
};