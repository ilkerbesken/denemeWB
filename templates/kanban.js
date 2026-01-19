const KANBAN_TEMPLATE = {
    id: "kanban-board-modern",
    name: "Modern Kanban Panosu",
    category: "İş Planlama",
    description: "Görevlerinizi organize etmek için çok sütunlu dinamik Kanban yapısı",
    thumbnail: "assets/templates/kanban.png",
    objects: [],
    generate: function () {
        const config = {
            startX: 80,
            startY: 100,
            headerHeight: 50,
            columnWidth: 200,
            columnHeight: 450,
            gap: 20,
            headerColor: "#2196f3",
            bodyColor: "#f5f5f5",
            borderColor: "#e0e0e0"
        };

        // Verileri tek bir dizide topladık (Hata buradaydı)
        const columns = [
            { title: "Yapılacak", bodyText: "Yapılacaklar" },
            { title: "Devam Eden", bodyText: "Devam Edenler" },
            { title: "Tamamlandı", bodyText: "Tamamlanmışlar" }
        ];

        this.objects = [];

        columns.forEach((col, index) => {
            const currentX = config.startX + (index * (config.columnWidth + config.gap));

            // 1. Header (Mavi Başlık Kutusu)
            this.objects.push({
                type: "rectangle",
                x: currentX, y: config.startY,
                width: config.columnWidth, height: config.headerHeight,
                color: config.headerColor, fillColor: config.headerColor, filled: true,
                opacity: 1.0, strokeWidth: 2, lineStyle: "solid",
                locked: true
            });

            // 2. Header Text (Sütun Başlığı)
            this.objects.push({
                type: "text",
                x: currentX, y: config.startY,
                width: config.columnWidth, height: config.headerHeight,
                text: col.title, htmlContent: `<div>${col.title}</div>`,
                fontSize: 18, fontWeight: "bold", color: "#ffffff",
                alignment: "center", opacity: 1.0,
                locked: true
            });

            // 3. Column Body (Gri Gövde)
            this.objects.push({
                type: "rectangle",
                x: currentX, y: config.startY + config.headerHeight,
                width: config.columnWidth, height: config.columnHeight,
                color: config.borderColor, fillColor: config.bodyColor, filled: true,
                opacity: 0.6, strokeWidth: 1, lineStyle: "solid",
                locked: true
            });

            // 4. Column Text (Sütun İçeriği)
            // col.text yerine yeni tanımladığımız col.bodyText kullanıldı.
            this.objects.push({
                type: "text",
                x: currentX, y: config.startY + config.headerHeight,
                width: config.columnWidth, height: config.columnHeight,
                text: col.bodyText, htmlContent: `<div>${col.bodyText}</div>`,
                fontSize: 14, fontWeight: "normal", color: "#000000",
                alignment: "center", opacity: 1.0,
                locked: true
            });
        });
    }
};