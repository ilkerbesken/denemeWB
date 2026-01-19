const DOTTED_NOTES_TEMPLATE = {
    id: "dotted-notes-template",
    name: "Noktalı Not Kağıdı",
    category: "Eğitim",
    description: "Tamamen JS ile oluşturulmuş dinamik şablon.",
    objects: [
        {
            type: "oval",
            x: 50, y: 50, width: 690, height: 1000,
            color: "#e0e0e0", filled: false, borderRadius: 30, strokeWidth: 1,
            locked: true
        },
        {
            type: "text",
            x: 90, y: 100, text: "NOTLAR", color: "#424242",
            locked: true
        },
        {
            type: "text",
            x: 460, y: 100, text: "tarih : ...../...../.......", fontWeight: "bold", color: "#424242", alignment: "right",
            locked: true
        }
    ],
    /**
     * Şablon nesnelerini dinamik olarak üretir/günceller
     */
    generate: function () {
        // Noktaları döngü ile ekle
        for (let y = 160; y <= 1000; y += 20) { // Dikey aralık
            for (let x = 100; x <= 700; x += 20) { // Yatay aralık
                this.objects.push({
                    type: "ellipse",
                    x: x,
                    y: y,
                    width: 2,
                    height: 2,
                    color: "#bdbdbd",
                    fillColor: "#bdbdbd",
                    filled: true,
                    opacity: 0.6,
                    locked: true
                });
            }
        }
    }
};
