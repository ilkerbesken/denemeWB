class SelectTool {
    constructor() {
        this.selectedObjects = [];
        this.isDragging = false;
        this.dragStartPoint = null;
        this.dragCurrentPoint = null;
        this.clipboard = null; // Kopyalanan nesne

        // Handle sistemi
        this.activeHandle = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotate'
        this.resizeStartBounds = null;
        this.rotateStartAngle = 0;
        this.rotateCenter = null;
        this.rotateCenter = null;
        this.handleSize = 8; // Tutamaç boyutu (px)

        // Long Press Logic for Touch Devices
        this.longPressTimer = null;
        this.longPressStartPos = null;
        this.LONG_PRESS_DURATION = 500; // ms
        this.LONG_PRESS_THRESHOLD = 5; // px movement tolerance
    }

    handlePointerDown(e, pos, canvas, ctx, state) {
        const clickPoint = { x: pos.x, y: pos.y };

        // Start Long Press Timer
        this.startLongPressTimer(e, canvas, state);

        const isCtrlPressed = e.ctrlKey || e.metaKey;

        // Önce seçili nesne varsa handle kontrolü yap
        if (this.selectedObjects.length > 0 && !isCtrlPressed) {
            const selectedIndex = this.selectedObjects[0];
            const selectedObj = state.objects[selectedIndex];

            if (selectedObj) {
                // Eğri kontrol noktası kontrolü (curved arrow için)
                if (selectedObj.type === 'arrow' && selectedObj.pathType === 'curved' && selectedObj.curveControlPoint) {
                    const dist = Math.sqrt(
                        Math.pow(clickPoint.x - selectedObj.curveControlPoint.x, 2) +
                        Math.pow(clickPoint.y - selectedObj.curveControlPoint.y, 2)
                    );

                    if (dist < this.handleSize + 5) {
                        // Kontrol noktası yakalandı
                        this.activeHandle = 'curveControl';
                        this.dragStartPoint = clickPoint;
                        // Amplified dragging için başlangıç konumunu sakla
                        this.initialCurveControlPoint = { ...selectedObj.curveControlPoint };
                        return true;
                    }
                }

                const bounds = this.getBoundingBox(selectedObj);
                // Orijinal bounds'u (döndürülmemiş) kullanmak için
                // getBoundingBox döndürülmüş AABB veriyor.
                // Bize resize için "unrotated" bounds lazım.
                const allShapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                let unrotatedBounds = bounds;
                if (allShapes.includes(selectedObj.type) && (selectedObj.rotation || selectedObj.angle)) {
                    if (selectedObj.x !== undefined) {
                        unrotatedBounds = {
                            minX: selectedObj.x,
                            minY: selectedObj.y,
                            maxX: selectedObj.x + selectedObj.width,
                            maxY: selectedObj.y + selectedObj.height
                        };
                    } else if (selectedObj.start && selectedObj.end) {
                        const minX = Math.min(selectedObj.start.x, selectedObj.end.x);
                        const maxX = Math.max(selectedObj.start.x, selectedObj.end.x);
                        const minY = Math.min(selectedObj.start.y, selectedObj.end.y);
                        const maxY = Math.max(selectedObj.start.y, selectedObj.end.y);
                        unrotatedBounds = { minX, minY, maxX, maxY };
                    }
                }

                const handle = this.getHandleAtPoint(clickPoint, unrotatedBounds, selectedObj);

                if (handle) {
                    // Handle yakalandı
                    this.activeHandle = handle;
                    this.dragStartPoint = clickPoint;
                    this.resizeStartBounds = { ...unrotatedBounds };

                    if (handle === 'rotate') {
                        // Döndürme için merkez nokta
                        this.rotateCenter = {
                            x: (bounds.minX + bounds.maxX) / 2,
                            y: (bounds.minY + bounds.maxY) / 2
                        };
                    }

                    return true;
                }
            }
        }

        // Tıklanan nesneyi bul
        let clickedIndex = -1;
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            if (this.isNearObject(obj, clickPoint)) {
                clickedIndex = i;
                break;
            }
        }

        // Ctrl basılıysa çoklu seçim modu
        if (isCtrlPressed) {
            if (clickedIndex !== -1) {
                // Nesne bulundu
                const indexInSelection = this.selectedObjects.indexOf(clickedIndex);
                if (indexInSelection !== -1) {
                    // Zaten seçili, seçimden çıkar
                    this.selectedObjects.splice(indexInSelection, 1);
                } else {
                    // Seçime ekle
                    this.selectedObjects.push(clickedIndex);
                }
            }
            return true;
        }

        // Ctrl basılı değil - normal tek seçim modu
        // Önce seçili nesnelerden biri üzerinde miyiz kontrol et
        if (this.selectedObjects.length > 0) {
            const isOnSelectedObject = this.selectedObjects.some(index => {
                const obj = state.objects[index];
                return obj && this.isNearObject(obj, clickPoint);
            });

            if (isOnSelectedObject) {
                // Seçili nesne üzerindeyiz, sürüklemeyi başlat
                this.isDragging = true;
                this.dragStartPoint = clickPoint;
                this.dragCurrentPoint = clickPoint;
                return true;
            }
        }

        // Seçili nesne üzerinde değiliz
        if (clickedIndex !== -1) {
            // Yeni bir nesneye tıkladık -> Seç ve sürüklemeyi başlat
            this.selectedObjects = [clickedIndex];
            this.isDragging = true;
            this.dragStartPoint = clickPoint;
            this.dragCurrentPoint = clickPoint;
        } else {
            // Boş alana tıkladık -> Drag Select Başlat
            this.selectedObjects = []; // Mevcut seçimi temizle
            this.isDragSelecting = true;
            this.dragSelectStart = clickPoint;
            this.dragCurrentPoint = clickPoint;
        }

        return true;
    }

    handlePointerMove(e, pos, canvas, ctx, state) {
        const currentPoint = { x: pos.x, y: pos.y };

        // Check long press movement threshold
        if (this.longPressTimer && this.longPressStartPos) {
            const dist = Math.sqrt(
                Math.pow(e.clientX - this.longPressStartPos.x, 2) +
                Math.pow(e.clientY - this.longPressStartPos.y, 2)
            );
            if (dist > this.LONG_PRESS_THRESHOLD) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }

        // Handle aktifse (resize veya rotate veya curveControl)
        if (this.activeHandle && this.selectedObjects.length > 0) {
            const selectedIndex = this.selectedObjects[0];
            const selectedObj = state.objects[selectedIndex];

            if (selectedObj) {
                if (this.activeHandle === 'curveControl') {
                    // Kontrol noktasını sürükle - HAREKET KISITLAMASI + AMPLIFIED DRAGGING
                    // Nokta sadece Orta Dikme üzerinde hareket eder VE mouse hareketinden daha hızlı tepki verir.
                    if (selectedObj.curveControlPoint && this.initialCurveControlPoint) {
                        const start = selectedObj.start;
                        const end = selectedObj.end;

                        // 1. Orta Nokta (Midpoint)
                        const midX = (start.x + end.x) / 2;
                        const midY = (start.y + end.y) / 2;

                        // 2. Doğru Parçası Vektörü
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;

                        // 3. Orta Dikme Vektörü (-dy, dx)
                        const perpX = -dy;
                        const perpY = dx;

                        // 4. Uzunluk normalizasyonu
                        const len = Math.sqrt(perpX * perpX + perpY * perpY);

                        if (len > 0.001) {
                            const unitPerpX = perpX / len;
                            const unitPerpY = perpY / len;

                            // 5. Başlangıçtaki Mesafe (Initial Projection)
                            const initialVecX = this.initialCurveControlPoint.x - midX;
                            const initialVecY = this.initialCurveControlPoint.y - midY;
                            const initialDist = initialVecX * unitPerpX + initialVecY * unitPerpY;

                            // 6. Mouse Hareketi (Delta)
                            const mouseDeltaX = currentPoint.x - this.dragStartPoint.x;
                            const mouseDeltaY = currentPoint.y - this.dragStartPoint.y;

                            // 7. Mouse Hareketinin Dik Vektör Üzerindeki İzdüşümü
                            const deltaProj = mouseDeltaX * unitPerpX + mouseDeltaY * unitPerpY;

                            // 8. Çarpan (Multiplier) - Hassasiyet
                            const multiplier = 4.0; // Daha da artırdım ki hissedilsin

                            // 9. Yeni Mesafe
                            const finalDist = initialDist + deltaProj * multiplier;

                            // 10. Yeni Konum
                            selectedObj.curveControlPoint.x = midX + finalDist * unitPerpX;
                            selectedObj.curveControlPoint.y = midY + finalDist * unitPerpY;
                        }
                    }
                    return true;
                } else if (this.activeHandle === 'rotate') {
                    // Döndürme
                    this.handleRotate(selectedObj, this.rotateCenter, this.dragStartPoint, currentPoint);
                } else {
                    // Boyutlandırma
                    this.handleResize(this.activeHandle, selectedObj, this.resizeStartBounds, this.dragStartPoint, currentPoint);
                }
                return true;
            }
        }

        // Drag Select işlemi
        if (this.isDragSelecting) {
            this.dragCurrentPoint = currentPoint;
            return true; // Yeniden çiz
        }

        // Normal sürükleme (move)
        if (this.isDragging && this.selectedObjects.length > 0) {
            const deltaX = currentPoint.x - this.dragCurrentPoint.x;
            const deltaY = currentPoint.y - this.dragCurrentPoint.y;

            // Tüm seçili nesneleri taşı
            this.selectedObjects.forEach(index => {
                const obj = state.objects[index];
                if (obj) {
                    this.moveObject(obj, deltaX, deltaY);
                }
            });

            this.dragCurrentPoint = currentPoint;
            return true;
        }

        return false;
    }

    handlePointerUp(e, pos, canvas, ctx, state) {
        // Cancel Timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        // Handle işlemi bitir
        if (this.activeHandle) {
            this.activeHandle = null;
            this.resizeStartBounds = null;
            this.rotateCenter = null;
            this.originalObjectState = null;
            return false;
        }

        // Drag Select bitir
        if (this.isDragSelecting) {
            this.isDragSelecting = false;
            this.finishDragSelection(state);
            this.dragSelectStart = null;
            this.dragCurrentPoint = null;
            return true;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.dragStartPoint = null;
            this.dragCurrentPoint = null;
        }

        return false;
    }

    finishDragSelection(state) {
        if (!this.dragSelectStart || !this.dragCurrentPoint) return;

        // Seçim kutusu sınırları
        const startX = Math.min(this.dragSelectStart.x, this.dragCurrentPoint.x);
        const startY = Math.min(this.dragSelectStart.y, this.dragCurrentPoint.y);
        const endX = Math.max(this.dragSelectStart.x, this.dragCurrentPoint.x);
        const endY = Math.max(this.dragSelectStart.y, this.dragCurrentPoint.y);
        const width = endX - startX;
        const height = endY - startY;

        // Çok küçük oynamaları yoksay (tıklama gibi algıla)
        if (width < 3 && height < 3) return;

        const selectionBox = { x: startX, y: startY, width, height };

        // Kutu içindeki veya temas eden nesneleri bul
        state.objects.forEach((obj, index) => {
            if (this.checkIntersection(obj, selectionBox)) {
                if (!this.selectedObjects.includes(index)) {
                    this.selectedObjects.push(index);
                }
            }
        });
    }

    checkIntersection(obj, box) {
        const objBounds = this.getBoundingBox(obj);

        // Basit AABB kesişim testi (Temas eden veya içinde olan)
        // !(obj.Left > box.Right || obj.Right < box.Left || obj.Top > box.Bottom || obj.Bottom < box.Top)

        return !(objBounds.minX > box.x + box.width ||
            objBounds.maxX < box.x ||
            objBounds.minY > box.y + box.height ||
            objBounds.maxY < box.y);
    }

    moveObject(obj, deltaX, deltaY) {
        if (obj.type === 'group') {
            obj.children.forEach(child => this.moveObject(child, deltaX, deltaY));
            return;
        }

        if (obj._renderCachePoints) delete obj._renderCachePoints;

        switch (obj.type) {
            case 'highlighter':
            case 'pen':
                // Tüm noktaları taşı
                obj.points.forEach(point => {
                    point.x += deltaX;
                    point.y += deltaY;
                });
                break;

            case 'line':
            case 'arrow':
                // Başlangıç ve bitiş noktalarını taşı
                obj.start.x += deltaX;
                obj.start.y += deltaY;
                obj.end.x += deltaX;
                obj.end.y += deltaY;
                // Eğri kontrol noktasını da taşı (varsa)
                if (obj.curveControlPoint) {
                    obj.curveControlPoint.x += deltaX;
                    obj.curveControlPoint.y += deltaY;
                }
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                // Support both start/end (OLD) and x/y (NEW) formats
                if (obj.x !== undefined) {
                    obj.x += deltaX;
                    obj.y += deltaY;
                }
                if (obj.start) {
                    obj.start.x += deltaX;
                    obj.start.y += deltaY;
                }
                if (obj.end) {
                    obj.end.x += deltaX;
                    obj.end.y += deltaY;
                }
                if (obj.center) {
                    obj.center.x += deltaX;
                    obj.center.y += deltaY;
                }
                break;
        }
    }

    isNearObject(obj, point, threshold = 10) {
        if (obj.type === 'group') {
            // Check bounds first optimization?
            // const bounds = this.getBoundingBox(obj);
            // if (!this.checkIntersection({ type: 'rect', ...bounds }, { x: point.x - threshold, y: point.y - threshold, width: threshold * 2, height: threshold * 2 })) return false;

            return obj.children.some(child => this.isNearObject(child, point, threshold));
        }

        switch (obj.type) {
            case 'highlighter':
            case 'pen':
                // Check if point is near spine, accounting for stroke width
                const hitThreshold = threshold + (obj.width || 2) / 2;
                return obj.points.some(p =>
                    Utils.distance(p, point) < hitThreshold
                );

            case 'line':
            case 'arrow':
                const dist = this.pointToLineDistance(
                    point, obj.start, obj.end
                );
                return dist < threshold;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                // Use ShapeTool's generic hit detection
                const shapeTool = app.tools.shape || app.tools.rectangle;
                if (shapeTool && shapeTool.isPointInside) {
                    if (shapeTool.isPointInside(obj, point)) return true;
                }

                // If not inside, check if near border (optional but good for non-filled shapes)
                const bounds = this.getBoundingBox(obj);
                if (point.x >= bounds.minX - threshold && point.x <= bounds.maxX + threshold &&
                    point.y >= bounds.minY - threshold && point.y <= bounds.maxY + threshold) {
                    // For rectangles, BBox check IS the inside check. 
                    // For other shapes, it's a rough fallback if shapeTool fails.
                    if (obj.type === 'rectangle' || obj.type === 'rect') return true;
                }
                return false;

            default:
                return false;
        }
    }

    getBoundingBox(obj) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        let padding = 0;

        // Base padding (from stroke width)
        if (obj.strokeWidth !== undefined) {
            padding = obj.strokeWidth / 2;
        } else if (obj.width !== undefined && (obj.type === 'pen' || obj.type === 'highlighter' || obj.type === 'line' || obj.type === 'arrow')) {
            padding = obj.width / 2;
        }

        // Arrow specific extra padding for heads
        if (obj.type === 'arrow') {
            padding = Math.max(padding, 20 + (obj.width || 2));
        }

        if (obj.type === 'group') {
            obj.children.forEach(child => {
                const childBounds = this.getBoundingBox(child);
                minX = Math.min(minX, childBounds.minX);
                minY = Math.min(minY, childBounds.minY);
                maxX = Math.max(maxX, childBounds.maxX);
                maxY = Math.max(maxY, childBounds.maxY);
            });
            // Children bounds already include their padding
            return { minX, minY, maxX, maxY };
        } else if (obj.type === 'pen' || obj.type === 'highlighter') {
            obj.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        } else if (obj.type === 'line' || obj.type === 'arrow') {
            minX = Math.min(obj.start.x, obj.end.x);
            minY = Math.min(obj.start.y, obj.end.y);
            maxX = Math.max(obj.start.x, obj.end.x);
            maxY = Math.max(obj.start.y, obj.end.y);
        } else if (['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(obj.type)) {
            const rotation = obj.rotation !== undefined ? obj.rotation : (obj.angle || 0);
            if (rotation !== 0) {
                const corners = this.getRotatedCorners(obj);
                corners.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            } else {
                if (obj.x !== undefined) {
                    minX = obj.x;
                    minY = obj.y;
                    maxX = obj.x + obj.width;
                    maxY = obj.y + obj.height;
                } else if (obj.start && obj.end) {
                    minX = Math.min(obj.start.x, obj.end.x);
                    minY = Math.min(obj.start.y, obj.end.y);
                    maxX = Math.max(obj.start.x, obj.end.x);
                    maxY = Math.max(obj.start.y, obj.end.y);
                } else if (obj.center) {
                    minX = obj.center.x - obj.radiusX;
                    minY = obj.center.y - obj.radiusY;
                    maxX = obj.center.x + obj.radiusX;
                    maxY = obj.center.y + obj.radiusY;
                }
            }
        }

        // Fallback or fix for undefined min/max if object is empty
        if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

        // Apply Padding
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding
        };
    }

    getRotatedCorners(obj) {
        let rx, ry, rw, rh;
        if (obj.x !== undefined) {
            rx = obj.x; ry = obj.y; rw = obj.width; rh = obj.height;
        } else if (obj.start && obj.end) {
            rx = Math.min(obj.start.x, obj.end.x);
            ry = Math.min(obj.start.y, obj.end.y);
            rw = Math.max(0.1, Math.abs(obj.end.x - obj.start.x));
            rh = Math.max(0.1, Math.abs(obj.end.y - obj.start.y));
        } else if (obj.center) {
            rx = obj.center.x - obj.radiusX;
            ry = obj.center.y - obj.radiusY;
            rw = obj.radiusX * 2;
            rh = obj.radiusY * 2;
        } else {
            return [];
        }

        const centerX = rx + rw / 2;
        const centerY = ry + rh / 2;
        const rotation = obj.rotation !== undefined ? obj.rotation : (obj.angle || 0);

        const rotate = (x, y) => {
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            return {
                x: cos * (x - centerX) - sin * (y - centerY) + centerX,
                y: sin * (x - centerX) + cos * (y - centerY) + centerY
            };
        };

        return [
            rotate(rx, ry),
            rotate(rx + rw, ry),
            rotate(rx + rw, ry + rh),
            rotate(rx, ry + rh)
        ];
    }
    getRawBounds(obj) {
        if (obj.x !== undefined) {
            return {
                minX: obj.x,
                minY: obj.y,
                maxX: obj.x + obj.width,
                maxY: obj.y + obj.height
            };
        } else if (obj.start && obj.end) {
            return {
                minX: Math.min(obj.start.x, obj.end.x),
                minY: Math.min(obj.start.y, obj.end.y),
                maxX: Math.max(obj.start.x, obj.end.x),
                maxY: Math.max(obj.start.y, obj.end.y)
            };
        } else if (obj.center) {
            return {
                minX: obj.center.x - (obj.radiusX || 0),
                minY: obj.center.y - (obj.radiusY || 0),
                maxX: obj.center.x + (obj.radiusX || 0),
                maxY: obj.center.y + (obj.radiusY || 0)
            };
        } else if (obj.points) {
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            obj.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            return { minX, minY, maxX, maxY };
        }
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }


    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            return Utils.distance(point, lineStart);
        }

        const t = Math.max(0, Math.min(1,
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
        ));

        const projection = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };

        return Utils.distance(point, projection);
    }

    draw(ctx, object) {
        // Normal çizim
    }

    drawPreview(ctx, object) {
        // Önizleme yok
    }

    drawSelection(ctx, state, zoom = 1) {
        const uiScale = 1 / zoom;
        const handleSize = this.handleSize * uiScale;

        // Drag Select kutusunu çiz
        if (this.isDragSelecting && this.dragSelectStart && this.dragCurrentPoint) {
            const startX = Math.min(this.dragSelectStart.x, this.dragCurrentPoint.x);
            const startY = Math.min(this.dragSelectStart.y, this.dragCurrentPoint.y);
            const width = Math.abs(this.dragCurrentPoint.x - this.dragSelectStart.x);
            const height = Math.abs(this.dragCurrentPoint.y - this.dragSelectStart.y);

            ctx.save();
            ctx.fillStyle = 'rgba(33, 150, 243, 0.1)'; // Çok açık mavi dolgu
            ctx.strokeStyle = '#2196f3'; // Mavi kenarlık
            ctx.lineWidth = 1 * uiScale;
            ctx.setLineDash([5 * uiScale, 5 * uiScale]);
            ctx.fillRect(startX, startY, width, height);
            ctx.strokeRect(startX, startY, width, height);
            ctx.restore();
        }

        if (this.selectedObjects.length === 0) return;

        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 2 * uiScale;
        ctx.setLineDash([5 * uiScale, 5 * uiScale]);

        this.selectedObjects.forEach(index => {
            const obj = state.objects[index];
            if (!obj) return;

            // Tutamaçları hesapla (döndürülmüş olabilir)
            let handles;
            const bounds = this.getBoundingBox(obj);

            // Path Spine Visualization for Pen Tool
            // This renders a thin line showing the actual path structure inside the stroke
            if ((obj.type === 'pen' || obj.type === 'highlighter') && obj.points && obj.points.length > 1) {
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = '#2196f3'; // Blue selection color
                // Make spine more visible for highlighter as it's often wider/lighter
                ctx.lineWidth = (obj.type === 'highlighter' ? 2 : 1) * uiScale;
                ctx.globalAlpha = obj.type === 'highlighter' ? 0.8 : 0.6;
                ctx.setLineDash([]); // Solid line for spine

                ctx.moveTo(obj.points[0].x, obj.points[0].y);

                // Use the same smoothing logic as PenTool draw for the spine
                if (obj.points.length === 2) {
                    ctx.lineTo(obj.points[1].x, obj.points[1].y);
                } else {
                    for (let i = 0; i < obj.points.length - 2; i++) {
                        const p0 = obj.points[i];
                        const p1 = obj.points[i + 1];
                        const p2 = obj.points[i + 2];

                        const cp1x = p0.x + (p1.x - p0.x) * 0.66;
                        const cp1y = p0.y + (p1.y - p0.y) * 0.66;
                        const cp2x = p1.x + (p2.x - p1.x) * 0.33;
                        const cp2y = p1.y + (p2.y - p1.y) * 0.33;

                        const midX = (cp1x + cp2x) / 2;
                        const midY = (cp1y + cp2y) / 2;

                        ctx.quadraticCurveTo(cp1x, cp1y, midX, midY);
                    }
                    const last = obj.points[obj.points.length - 1];
                    ctx.lineTo(last.x, last.y);
                }

                ctx.stroke();
                ctx.restore();
            }

            // Eğer açı varsa ve destekleniyorsa, döndürülmemiş bounds ile handle hesapla
            const rotation = obj.rotation !== undefined ? obj.rotation : (obj.angle || 0);
            if (rotation !== 0) {
                const rawBounds = this.getRawBounds(obj);
                handles = this.getHandlePositions(rawBounds, obj);
            } else {
                handles = this.getHandlePositions(bounds, obj);
            }

            // Seçim kutusu çiz (döndürülmüş olabilir)
            ctx.beginPath();
            ctx.moveTo(handles.nw.x, handles.nw.y);
            ctx.lineTo(handles.ne.x, handles.ne.y);
            ctx.lineTo(handles.se.x, handles.se.y);
            ctx.lineTo(handles.sw.x, handles.sw.y);
            ctx.closePath();
            ctx.stroke();

            // Tutamaçları çiz (sadece tek seçimde)
            if (this.selectedObjects.length === 1) {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#2196F3';
                ctx.lineWidth = 2 * uiScale;
                ctx.setLineDash([]);

                // Boyutlandırma tutamaçları (kareler)
                for (let [name, pos] of Object.entries(handles)) {
                    if (name !== 'rotate') {
                        ctx.fillRect(
                            pos.x - handleSize / 2,
                            pos.y - handleSize / 2,
                            handleSize,
                            handleSize
                        );
                        ctx.strokeRect(
                            pos.x - handleSize / 2,
                            pos.y - handleSize / 2,
                            handleSize,
                            handleSize
                        );
                    }
                }

                // Döndürme tutamacı (daire)
                const rotateHandle = handles.rotate;
                ctx.beginPath();
                ctx.arc(rotateHandle.x, rotateHandle.y, handleSize / 2 + 1 * uiScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Döndürme çizgisi (üst orta noktadan)
                ctx.beginPath();
                ctx.moveTo(handles.n.x, handles.n.y);
                ctx.lineTo(rotateHandle.x, rotateHandle.y);
                ctx.stroke();

                // Eğri kontrol noktası (curved arrow için)
                if (obj.type === 'arrow' && obj.pathType === 'curved' && obj.curveControlPoint) {
                    ctx.save();
                    ctx.fillStyle = '#FF9800'; // Turuncu renk
                    ctx.strokeStyle = '#F57C00';
                    ctx.lineWidth = 2 * uiScale;
                    ctx.setLineDash([]);

                    // Kontrol noktası daireyi çiz
                    ctx.beginPath();
                    ctx.arc(
                        obj.curveControlPoint.x,
                        obj.curveControlPoint.y,
                        handleSize / 2 + 2 * uiScale,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.stroke();

                    // Kontrol noktasından start ve end'e ince çizgiler (yardımcı)
                    ctx.strokeStyle = '#FF9800';
                    ctx.lineWidth = 1 * uiScale;
                    ctx.setLineDash([3 * uiScale, 3 * uiScale]);
                    ctx.globalAlpha = 0.5;

                    ctx.beginPath();
                    ctx.moveTo(obj.start.x, obj.start.y);
                    ctx.lineTo(obj.curveControlPoint.x, obj.curveControlPoint.y);
                    ctx.lineTo(obj.end.x, obj.end.y);
                    ctx.stroke();

                    ctx.restore();
                }

                // Dash'i geri al
                ctx.setLineDash([5 * uiScale, 5 * uiScale]);
            }
        });

        ctx.setLineDash([]);
    }

    // Clipboard İşlevleri
    copySelected(state) {
        if (this.selectedObjects.length === 0) return false;

        const items = [];
        this.selectedObjects.forEach(index => {
            const obj = state.objects[index];
            if (obj) {
                // Deep copy to clipboard
                items.push(JSON.parse(JSON.stringify(obj)));
            }
        });

        if (items.length > 0) {
            this.clipboard = items; // Array olarak sakla
            return true;
        }

        return false;
    }

    cutSelected(state) {
        if (this.copySelected(state)) {
            return this.deleteSelected(state);
        }
        return null;
    }

    paste(state, offsetX = 20, offsetY = 20) {
        if (!this.clipboard) return null;

        const pastedObjects = [];
        const newSelection = [];

        // Clipboard array mi tek obje mi kontrolü
        const items = Array.isArray(this.clipboard) ? this.clipboard : [this.clipboard];

        items.forEach(item => {
            // Deep copy clipboard item
            const newObj = JSON.parse(JSON.stringify(item));

            // Offset uygula
            this.moveObject(newObj, offsetX, offsetY);

            pastedObjects.push(newObj);
            // Biz eklemiyoruz, App.js ekleyecek mi? 
            // App.js past logic: const pastedObj = selectTool.paste(this.state); if(pastedObj) state.objects.push(pastedObj);
            // App.js tek obje bekliyor.
            // Burayi array donersek App.js patlar.
            // App.js'i guncellememiz lzim.
        });

        // Simdilik array donelim, sonra App.js'i fixleyelim
        return pastedObjects;
    }

    // Context Menu İşlevleri
    deleteSelected(state) {
        if (this.selectedObjects.length === 0) return null;

        // Sort indices descending to avoid shift issues
        const indices = [...this.selectedObjects].sort((a, b) => b - a);
        const deletedObjects = [];

        indices.forEach(index => {
            if (state.objects[index]) {
                deletedObjects.push(state.objects[index]);
                state.objects.splice(index, 1);
            }
        });

        this.selectedObjects = [];
        return deletedObjects.length > 0 ? deletedObjects : null;
    }

    duplicateSelected(state) {
        if (this.selectedObjects.length === 0) return null;

        const copies = [];
        this.selectedObjects.forEach(index => {
            const obj = state.objects[index];
            if (obj) {
                // Deep copy
                const duplicate = JSON.parse(JSON.stringify(obj));
                // Offset uygula
                this.moveObject(duplicate, 20, 20);
                copies.push(duplicate);
            }
        });

        if (copies.length > 0) {
            // Yeni selection indices
            const newSelection = [];
            copies.forEach(copy => {
                state.objects.push(copy);
                newSelection.push(state.objects.length - 1);
            });
            this.selectedObjects = newSelection;
            // Return array instead of single object if multiple? Or last one?
            // App.js usually pushes single object to history but handling array might need app.js change?
            // App.js handles history save before this call.
            // But App.js handles push(duplicate). 
            // We should check app.js usage.
            // If duplicateSelected returns an object, app.js adds it.
            // If we modify state.objects here, app.js might duplicate it again?

            // Let's check app.js usage:
            // const duplicate = selectTool.duplicateSelected(this.state);
            // if (duplicate) { this.state.objects.push(duplicate); }

            // Wait, if duplicateSelected ALREADY pushes to state (as above logic suggests), 
            // then app.js will push it AGAIN?
            // Refactoring needed: either app.js does the pushing, or we do.
            // Current code in duplicateSelected returns the object and DOES NOT push.
            // So for bulk, we should return an array or object?
            // App.js expects a single object return to push. 
            // We need to change app.js to handle array return or handle pushing here and return nothing (or null) to signal "already handled".

            // Let's modify app.js logic later or make this return null and handle push locally.
            // But app.js logic is:
            // if (duplicate) { history.save(); objects.push(duplicate); render(); }
            // This implies app.js manages the state push.

            // If we have multiple duplicates, we can't return just one.
            // Strategy: Modify this method to return an array of duplicates, 
            // AND modify app.js to handle array return.
            return copies;
        }
        return null;
    }

    bringToFront(state) {
        if (this.selectedObjects.length === 0) return false;

        const selectedIndex = this.selectedObjects[0];
        const obj = state.objects[selectedIndex];

        if (obj && selectedIndex < state.objects.length - 1) {
            // Nesneyi diziden çıkar
            state.objects.splice(selectedIndex, 1);
            // En sona ekle
            state.objects.push(obj);
            // Yeni indeksi seç
            this.selectedObjects = [state.objects.length - 1];
            return true;
        }
        return false;
    }

    bringForward(state) {
        if (this.selectedObjects.length === 0) return false;

        const selectedIndex = this.selectedObjects[0];
        const obj = state.objects[selectedIndex];

        if (obj && selectedIndex < state.objects.length - 1) {
            // Bir adım öne getir (index + 1)
            state.objects.splice(selectedIndex, 1);
            state.objects.splice(selectedIndex + 1, 0, obj);
            // Yeni indeksi seç
            this.selectedObjects = [selectedIndex + 1];
            return true;
        }
        return false;
    }

    sendBackward(state) {
        if (this.selectedObjects.length === 0) return false;

        const selectedIndex = this.selectedObjects[0];
        const obj = state.objects[selectedIndex];

        if (obj && selectedIndex > 0) {
            // Bir adım arkaya gönder (index - 1)
            state.objects.splice(selectedIndex, 1);
            state.objects.splice(selectedIndex - 1, 0, obj);
            // Yeni indeksi seç
            this.selectedObjects = [selectedIndex - 1];
            return true;
        }
        return false;
    }

    sendToBack(state) {
        if (this.selectedObjects.length === 0) return false;

        const selectedIndex = this.selectedObjects[0];
        const obj = state.objects[selectedIndex];

        if (obj && selectedIndex > 0) {
            // Nesneyi diziden çıkar
            state.objects.splice(selectedIndex, 1);
            // En başa ekle
            state.objects.unshift(obj);
            // Yeni indeksi seç
            this.selectedObjects = [0];
            return true;
        }
        return false;
    }

    handleContextMenu(e, canvas, state) {
        // Seçili nesne yoksa menüyü gösterme
        if (this.selectedObjects.length === 0) return;

        e.preventDefault();

        const menu = document.getElementById('contextMenu');

        // Menüyü konumlandır
        menu.style.left = e.clientX + 'px';

        if (e.clientY > window.innerHeight / 2) {
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - e.clientY) + 'px';
        } else {
            menu.style.top = e.clientY + 'px';
            menu.style.bottom = 'auto';
        }

        // Prevent overflow on the right
        const menuWidth = 150; // Estimated width or getComputedStyle? Can't get computed easily before display.
        if (e.clientX + menuWidth > window.innerWidth) {
            menu.style.left = 'auto';
            menu.style.right = '10px';
        } else {
            menu.style.right = 'auto';
            menu.style.left = e.clientX + 'px';
        }

        // Show/Hide "Change Border Color" only for shapes
        const borderItem = document.getElementById('ctxChangeBorderColor');
        if (borderItem) {
            let isShape = false;
            if (this.selectedObjects.length === 1) {
                const obj = state.objects[this.selectedObjects[0]];
                if (obj && ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'].includes(obj.type)) {
                    isShape = true;
                }
            }
            borderItem.style.display = isShape ? 'flex' : 'none';
        }

        menu.classList.add('show');

        return true;
    }

    // Flip İşlevleri
    flipHorizontal(state) {
        if (this.selectedObjects.length === 0) return false;

        // Bounding box merkezi hesapla (tüm seçim için)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.selectedObjects.forEach(index => {
            const b = this.getBoundingBox(state.objects[index]);
            minX = Math.min(minX, b.minX);
            minY = Math.min(minY, b.minY);
            maxX = Math.max(maxX, b.maxX);
            maxY = Math.max(maxY, b.maxY);
        });

        const centerX = (minX + maxX) / 2;

        this.selectedObjects.forEach(index => {
            this.flipObjectHorizontal(state.objects[index], centerX);
        });
        return true;
    }

    flipObjectHorizontal(obj, centerX) {
        if (obj._renderCachePoints) delete obj._renderCachePoints;

        if (obj.type === 'group') {
            obj.children.forEach(child => this.flipObjectHorizontal(child, centerX));
            return;
        }

        // Nesneyi yatay eksende çevir
        switch (obj.type) {
            case 'pen':
                obj.points.forEach(point => {
                    point.x = centerX - (point.x - centerX);
                });
                break;

            case 'line':
            case 'arrow':
                const tempStartX = obj.start.x;
                obj.start.x = centerX - (obj.end.x - centerX);
                obj.end.x = centerX - (tempStartX - centerX);
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                if (obj.x !== undefined) {
                    // Reposition centered around centerX
                    obj.x = 2 * centerX - obj.x - obj.width;

                    // Mirror rotation
                    if (obj.rotation !== undefined) obj.rotation = -obj.rotation;
                    if (obj.angle !== undefined) obj.angle = -obj.angle;

                    // Handle internal points if it's a legacy shape with start/end
                    if (obj.start && obj.end) {
                        const tempStartX = obj.start.x;
                        obj.start.x = 2 * centerX - obj.end.x;
                        obj.end.x = 2 * centerX - tempStartX;
                    }
                    if (obj.center) {
                        obj.center.x = 2 * centerX - obj.center.x;
                    }
                } else if (obj.start && obj.end) {
                    // Support for line/arrow style objects if they fall here
                    const tempStartX = obj.start.x;
                    obj.start.x = 2 * centerX - obj.end.x;
                    obj.end.x = 2 * centerX - tempStartX;
                    if (obj.angle) obj.angle = -obj.angle;
                }
                break;
        }
    }

    flipVertical(state) {
        if (this.selectedObjects.length === 0) return false;

        // Bounding box merkezi hesapla (tüm seçim için)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.selectedObjects.forEach(index => {
            const b = this.getBoundingBox(state.objects[index]);
            minX = Math.min(minX, b.minX);
            minY = Math.min(minY, b.minY);
            maxX = Math.max(maxX, b.maxX);
            maxY = Math.max(maxY, b.maxY);
        });

        const centerY = (minY + maxY) / 2;

        this.selectedObjects.forEach(index => {
            this.flipObjectVertical(state.objects[index], centerY);
        });
        return true;
    }

    flipObjectVertical(obj, centerY) {
        if (obj._renderCachePoints) delete obj._renderCachePoints;

        if (obj.type === 'group') {
            obj.children.forEach(child => this.flipObjectVertical(child, centerY));
            return;
        }

        // Nesneyi dikey eksende çevir
        switch (obj.type) {
            case 'pen':
                obj.points.forEach(point => {
                    point.y = centerY - (point.y - centerY);
                });
                break;

            case 'line':
            case 'arrow':
                const tempStartY = obj.start.y;
                obj.start.y = centerY - (obj.end.y - centerY);
                obj.end.y = centerY - (tempStartY - centerY);
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                if (obj.x !== undefined) {
                    // Reposition centered around centerY
                    obj.y = 2 * centerY - obj.y - obj.height;

                    // Mirror rotation
                    if (obj.rotation !== undefined) obj.rotation = -obj.rotation;
                    if (obj.angle !== undefined) obj.angle = -obj.angle;

                    // Handle internal points if it's a legacy shape with start/end
                    if (obj.start && obj.end) {
                        const tempStartY = obj.start.y;
                        obj.start.y = 2 * centerY - obj.end.y;
                        obj.end.y = 2 * centerY - tempStartY;
                    }
                    if (obj.center) {
                        obj.center.y = 2 * centerY - obj.center.y;
                    }
                } else if (obj.start && obj.end) {
                    const tempStartY = obj.start.y;
                    obj.start.y = 2 * centerY - obj.end.y;
                    obj.end.y = 2 * centerY - tempStartY;
                    if (obj.angle) obj.angle = -obj.angle;
                }
                break;
        }
    }



    // Gruplama İşlevleri
    groupSelected(state) {
        if (this.selectedObjects.length < 2) {
            // alert('Gruplamak için en az 2 nesne seçin'); // Alert is interfering sometimes
            return null;
        }

        // Seçilen nesneleri kopyala (referans değil, diziden alacağız)
        // İndeksleri büyükten küçüğe sırala ki silerken kayma olmasın
        const indices = [...this.selectedObjects].sort((a, b) => b - a);
        const children = [];

        // Orijinal sıralamayı korumak için, önce çekelim sonra ters çevirip ekleyelim ya da 
        // indices arrayini ters çevirmeyip, splice yaparken dikkatli olalım.
        // indices: [5, 2, 0] (descending)
        // children dizisine, orijinal sırasıyla (0, 2, 5) girmeli aslında.
        // O yüzden önce nesneleri toplayalım.

        const sortedIndices = [...this.selectedObjects].sort((a, b) => a - b);
        sortedIndices.forEach(idx => {
            children.push(state.objects[idx]);
        });

        // Şimdi state.objects'ten sil (indekslerin kaymaması için büyükten küçüğe)
        indices.forEach(idx => {
            state.objects.splice(idx, 1);
        });

        // Yeni grup oluştur
        const newGroup = {
            type: 'group',
            children: children
        };

        // Grubu ekle
        state.objects.push(newGroup);

        // Yeni grubu seç
        this.selectedObjects = [state.objects.length - 1];

        return newGroup;
    }

    ungroupSelected(state) {
        if (this.selectedObjects.length !== 1) return false;

        const groupIndex = this.selectedObjects[0];
        const groupObj = state.objects[groupIndex];

        if (groupObj.type !== 'group') return false;

        // Grubu sil
        state.objects.splice(groupIndex, 1);

        // Çocukları ana diziye ekle (grubun olduğu yere veya en sona?)
        // Kullanıcı deneyimi için grubun olduğu yere eklemek mantıklı olabilir ama z-index karışabilir.
        // Basitlik için en sona ekleyelim ya da grubun olduğu indexe insert edelim.

        // groupIndex konumuna çocukları insert et
        // splice(start, deleteCount, item1, item2, ...)
        state.objects.splice(groupIndex, 0, ...groupObj.children);

        // Yeni eklenen çocukları seçili yap
        this.selectedObjects = [];
        for (let i = 0; i < groupObj.children.length; i++) {
            this.selectedObjects.push(groupIndex + i);
        }

        return true;
    }

    // Handle Sistemi
    getHandlePositions(bounds, obj = null) {
        const { minX, minY, maxX, maxY } = bounds;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        let handles = {
            // Köşeler
            nw: { x: minX, y: minY },
            ne: { x: maxX, y: minY },
            sw: { x: minX, y: maxY },
            se: { x: maxX, y: maxY },
            // Kenarlar
            n: { x: centerX, y: minY },
            s: { x: centerX, y: maxY },
            e: { x: maxX, y: centerY },
            w: { x: minX, y: centerY },
            // Döndürme (üstte, biraz yukarıda)
            rotate: { x: centerX, y: minY - 30 }
        };

        // Eğer nesne döndürülmüşse, tutamaçları da döndür
        const rotationAngle = obj ? (obj.rotation !== undefined ? obj.rotation : (obj.angle || 0)) : 0;
        if (rotationAngle !== 0) {
            const rotate = (point) => {
                const cos = Math.cos(rotationAngle);
                const sin = Math.sin(rotationAngle);
                return {
                    x: cos * (point.x - centerX) - sin * (point.y - centerY) + centerX,
                    y: sin * (point.x - centerX) + cos * (point.y - centerY) + centerY
                };
            };

            // Tüm tutamaçları döndür
            for (let key in handles) {
                handles[key] = rotate(handles[key]);
            }
        }

        return handles;
    }

    getHandleAtPoint(point, bounds, obj = null) {
        // Eğer obj parametresi gelmezse ve seçili nesne varsa onu kullan
        if (!obj && this.selectedObjects.length === 1) {
            const index = this.selectedObjects[0];
            // state.objects erişimi için this.state'e ihtiyacımız var ama burada yok
            // Bu nedenle bounds ile birlikte obj da gönderilmeli
        }

        const handles = this.getHandlePositions(bounds, obj);
        const threshold = this.handleSize + 2;

        for (let [name, pos] of Object.entries(handles)) {
            const dist = Math.sqrt(
                Math.pow(point.x - pos.x, 2) +
                Math.pow(point.y - pos.y, 2)
            );
            if (dist <= threshold) {
                return name;
            }
        }
        return null;
    }

    handleResize(handle, obj, startBounds, startPoint, currentPoint) {
        let deltaX = currentPoint.x - startPoint.x;
        let deltaY = currentPoint.y - startPoint.y;

        // Eğer nesnenin açısı varsa, delta'yı yerel koordinatlara çevir
        if ((obj.type === 'rectangle' || obj.type === 'ellipse') && obj.angle) {
            const cos = Math.cos(-obj.angle);
            const sin = Math.sin(-obj.angle);
            const rotatedDeltaX = cos * deltaX - sin * deltaY;
            const rotatedDeltaY = sin * deltaX + cos * deltaY;
            deltaX = rotatedDeltaX;
            deltaY = rotatedDeltaY;
        }

        let newBounds = { ...startBounds };

        // Tutamaca göre bounds güncelle
        switch (handle) {
            case 'se': // Güneydoğu
                newBounds.maxX += deltaX;
                newBounds.maxY += deltaY;
                break;
            case 'nw': // Kuzeybatı
                newBounds.minX += deltaX;
                newBounds.minY += deltaY;
                break;
            case 'ne': // Kuzeydoğu
                newBounds.maxX += deltaX;
                newBounds.minY += deltaY;
                break;
            case 'sw': // Güneybatı
                newBounds.minX += deltaX;
                newBounds.maxY += deltaY;
                break;
            case 'n': // Kuzey
                newBounds.minY += deltaY;
                break;
            case 's': // Güney
                newBounds.maxY += deltaY;
                break;
            case 'e': // Doğu
                newBounds.maxX += deltaX;
                break;
            case 'w': // Batı
                newBounds.minX += deltaX;
                break;
        }

        // Minimum boyut kontrolü
        if (newBounds.maxX - newBounds.minX < 10) return;
        if (newBounds.maxY - newBounds.minY < 10) return;

        // Nesneyi yeni bounds'a uygula
        this.applyBoundsToObject(obj, newBounds);
    }

    applyBoundsToObject(obj, newBounds) {
        let { minX, minY, maxX, maxY } = newBounds;

        // "newBounds" parametresi, kullanıcının gördüğü/tuttuğu "Visual Bounds"dur (Resize handle'ları buna göre çizilir).
        // Ancak primitive nesneler (Line, Rect, Ellipse) "Center/Start/End" koordinatları ile tanımlanır (Stroke dahil değildir).
        // Bu yüzden Visual Bounds'dan Stroke Padding'i ÇIKARMALIYIZ.

        let padding = 0;
        if (obj.width) {
            padding = obj.width / 2;
        }

        // Apply Padding Inverse (To get Content Bounds)
        // Eğer Rectangle ise: VisualMinX = ContentMinX - padding. -> ContentMinX = VisualMinX + padding.

        const contentMinX = minX + padding;
        const contentMinY = minY + padding;
        const contentMaxX = maxX - padding;
        const contentMaxY = maxY - padding;

        switch (obj.type) {
            case 'line':
            case 'arrow':
                // Arrow head extra padding check?
                // getBoundingBox obj.type === 'arrow' padding = Math.max(padding, 20 + obj.width)
                // We should match that logic exactly or drag might feel "drifting".
                // But for generic resize, using standard padding is safer unless we want complexities.
                // NOTE: getBoundingBox for Arrow uses EXTRA padding.
                // If we don't account for it here, the arrow will shrink on every interaction.

                let arrowPadding = padding;
                if (obj.type === 'arrow') {
                    // Re-calculate the exact padding used in getBoundingBox to be symmetric
                    // padding = Math.max(obj.width/2, 20 + obj.width)
                    // Wait, getBoundingBox Logic: padding = Math.max(padding, 20 + obj.width);
                    arrowPadding = Math.max(padding, 20 + obj.width);
                }

                // Use Specific Arrow Padding for Arrow
                const aMinX = minX + arrowPadding;
                const aMinY = minY + arrowPadding;
                const aMaxX = maxX - arrowPadding;
                const aMaxY = maxY - arrowPadding;

                // Mevcut yönü koru
                const startX = obj.start.x;
                const endX = obj.end.x;
                const startY = obj.start.y;
                const endY = obj.end.y;

                const isLeftToRight = startX <= endX;
                const isTopToBottom = startY <= endY;

                // Eski kontrol noktası oranlarını hesapla (eğer varsa)
                let relCpX = 0.5, relCpY = 0.5;
                if (obj.curveControlPoint) {
                    const oldDx = endX - startX;
                    const oldDy = endY - startY;

                    if (Math.abs(oldDx) > 0.001) {
                        relCpX = (obj.curveControlPoint.x - startX) / oldDx;
                    }
                    if (Math.abs(oldDy) > 0.001) {
                        relCpY = (obj.curveControlPoint.y - startY) / oldDy;
                    }
                }

                if (isLeftToRight) {
                    obj.start.x = aMinX;
                    obj.end.x = aMaxX;
                } else {
                    obj.start.x = aMaxX;
                    obj.end.x = aMinX;
                }

                if (isTopToBottom) {
                    obj.start.y = aMinY;
                    obj.end.y = aMaxY;
                } else {
                    obj.start.y = aMaxY;
                    obj.end.y = aMinY;
                }

                // Kontrol noktasını güncelle
                if (obj.curveControlPoint) {
                    const newDx = obj.end.x - obj.start.x;
                    const newDy = obj.end.y - obj.start.y;
                    obj.curveControlPoint.x = obj.start.x + relCpX * newDx;
                    obj.curveControlPoint.y = obj.start.y + relCpY * newDy;
                }
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                // Use standard content bounds (un-padded)
                const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
                const sw = obj.strokeWidth || (shapes.includes(obj.type) ? 0 : (obj.width || 0));
                const padS = sw / 2;
                const cMinX = minX + padS;
                const cMinY = minY + padS;
                const cMaxX = maxX - padS;
                const cMaxY = maxY - padS;

                if (obj.x !== undefined) {
                    obj.x = cMinX;
                    obj.y = cMinY;
                    obj.width = Math.max(0.1, cMaxX - cMinX);
                    obj.height = Math.max(0.1, cMaxY - cMinY);
                } else if (obj.type === 'rectangle') {
                    obj.start = { x: cMinX, y: cMinY };
                    obj.end = { x: cMaxX, y: cMaxY };
                } else if (obj.type === 'ellipse') {
                    const centerX = (cMinX + cMaxX) / 2;
                    const centerY = (cMinY + cMaxY) / 2;
                    obj.center = { x: centerX, y: centerY };
                    obj.radiusX = Math.abs(cMaxX - cMinX) / 2;
                    obj.radiusY = Math.abs(cMaxY - cMinY) / 2;
                    obj.start = { x: cMinX, y: cMinY };
                    obj.end = { x: cMaxX, y: cMaxY };
                }
                break;

            case 'highlighter':
            case 'pen':
                // Pen ve Highlighter için zaten paddingli geliyor ama biz "Content" bounding box'a göre scale etmek istiyoruz.
                // Burada logic biraz daha karışık (Points scaling).
                // Mevcut kodda rMinX/Y hesaplanıp yapılıyordu, orası doğru.
                // Sadece "newBounds"un PADDED olduğunu bilelim.
                // Pen logic (aşağıda) kendi rMinX'ini hesaplıyor (raw points).
                // Scale factor hesaplarken: NewWidth / OldWidth.
                // OldWidth (raw points width).
                // NewWidth? Bizim "newBounds" Visual Bounds.
                // NewContentWidth = newBounds.width - Padding*2.
                // Scale = NewContentWidth / OldWidth.

                // Aşağıdaki Pen logic'i bu padding'i hesaba katmalı.

                let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
                obj.points.forEach(p => {
                    rMinX = Math.min(rMinX, p.x);
                    rMinY = Math.min(rMinY, p.y);
                    rMaxX = Math.max(rMaxX, p.x);
                    rMaxY = Math.max(rMaxY, p.y);
                });

                const oldWidth = Math.max(0.1, rMaxX - rMinX);
                const oldHeight = Math.max(0.1, rMaxY - rMinY);

                // Note: 'newBounds' passed here might be the user's drag selection which matches the VISUAL bounds (padded).
                // If user resizes the handle, they are resizing the VISUAL box.
                // If the visual box has padding, the content box should be smaller.

                // But typically, resize handle logic (handleResize) adds delta to the existing bounds.
                // Existing bounds coming from getBoundingBox (padded).
                // So newBounds is Padded.

                // We need to calculate the NEW CONTENT bounds from the NEW PADDED bounds.
                // Padding amount is obj.width/2 approx.
                const pad = (obj.width || 0) / 2;
                const contentMinX = minX + pad;
                const contentMinY = minY + pad;
                const contentMaxX = maxX - pad;
                const contentMaxY = maxY - pad;

                const newContentWidth = contentMaxX - contentMinX;
                const newContentHeight = contentMaxY - contentMinY;

                const scaleX = newContentWidth / oldWidth;
                const scaleY = newContentHeight / oldHeight;

                obj.points.forEach(point => {
                    point.x = contentMinX + (point.x - rMinX) * scaleX;
                    point.y = contentMinY + (point.y - rMinY) * scaleY;
                });
                break;

            case 'group':
                // Group logic: similar to Pen but recursive
                const gOldBounds = this.getBoundingBox(obj);
                const gOldWidth = Math.max(0.1, gOldBounds.maxX - gOldBounds.minX);
                const gOldHeight = Math.max(0.1, gOldBounds.maxY - gOldBounds.minY);

                const gScaleX = (maxX - minX) / gOldWidth;
                const gScaleY = (maxY - minY) / gOldHeight;

                // We need to transform each child such that it maintains relative position to group bounds
                // NewChildBounds = NewGroupMin + (ChildBounds - GroupOldMin) * Scale

                // But we can't just set bounds, we have to APPLY bounds recursively.
                // So we calculate the target bounds for the child and call applyBoundsToObject on it.

                obj.children.forEach(child => {
                    const childBounds = this.getBoundingBox(child);
                    const childRelX = childBounds.minX - gOldBounds.minX;
                    const childRelY = childBounds.minY - gOldBounds.minY;
                    const childWidth = childBounds.maxX - childBounds.minX;
                    const childHeight = childBounds.maxY - childBounds.minY;

                    const newChildMinX = minX + childRelX * gScaleX;
                    const newChildMinY = minY + childRelY * gScaleY;
                    const newChildWidth = childWidth * gScaleX;
                    const newChildHeight = childHeight * gScaleY;

                    this.applyBoundsToObject(child, {
                        minX: newChildMinX,
                        minY: newChildMinY,
                        maxX: newChildMinX + newChildWidth,
                        maxY: newChildMinY + newChildHeight
                    });
                });
                break;
        }
    }

    handleRotate(obj, centerPoint, startPoint, currentPoint) {
        // Başlangıç açısı
        const startAngle = Math.atan2(
            startPoint.y - centerPoint.y,
            startPoint.x - centerPoint.x
        );

        // Mevcut açı
        const currentAngle = Math.atan2(
            currentPoint.y - centerPoint.y,
            currentPoint.x - centerPoint.x
        );

        // Açı farkı (radyan)
        const deltaAngle = currentAngle - startAngle;

        const allShapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];

        if (allShapes.includes(obj.type)) {
            // Primitive şekiller için açı özelliğini güncelle
            if (!this.originalObjectState) {
                this.originalObjectState = JSON.parse(JSON.stringify(obj));
                this.originalObjectState.startRotation = obj.rotation !== undefined ? obj.rotation : (obj.angle || 0);
            }

            const newAngle = (this.originalObjectState.startRotation || 0) + deltaAngle;
            if (obj.x !== undefined || obj.center) {
                obj.rotation = newAngle;
                obj.angle = newAngle; // Sync both
            } else {
                obj.angle = newAngle;
                obj.rotation = newAngle; // Sync both for compatibility
            }
        } else {
            // Diğerleri için (line, arrow, pen) nokta dönüşümü yap
            if (!this.originalObjectState) {
                this.originalObjectState = JSON.parse(JSON.stringify(obj));
            }
            // Orijinal nesneden başlayarak döndür
            this.rotateObjectFromOriginal(obj, this.originalObjectState, deltaAngle, centerPoint);
        }
    }

    rotateObjectFromOriginal(obj, originalObj, angle, centerPoint) {
        if (obj._renderCachePoints) delete obj._renderCachePoints;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatePoint = (p) => ({
            x: cos * (p.x - centerPoint.x) - sin * (p.y - centerPoint.y) + centerPoint.x,
            y: sin * (p.x - centerPoint.x) + cos * (p.y - centerPoint.y) + centerPoint.y
        });

        if (obj.type === 'group' && originalObj.type === 'group') {
            obj.children.forEach((child, index) => {
                this.rotateObjectFromOriginal(child, originalObj.children[index], angle, centerPoint);
            });
            return;
        }

        switch (obj.type) {
            case 'highlighter':
            case 'pen':
                obj.points = originalObj.points.map(p => {
                    const rp = rotatePoint(p);
                    return {
                        ...p,
                        x: rp.x,
                        y: rp.y
                    };
                });
                break;

            case 'line':
            case 'arrow':
                obj.start = rotatePoint(originalObj.start);
                obj.end = rotatePoint(originalObj.end);
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                // 1. Merkezlerini (veya start/end noktalarını) taşı
                if (originalObj.start && originalObj.end) {
                    obj.start = rotatePoint(originalObj.start);
                    obj.end = rotatePoint(originalObj.end);
                } else if (originalObj.center) {
                    obj.center = rotatePoint(originalObj.center);
                } else if (originalObj.x !== undefined) {
                    const center = { x: originalObj.x + originalObj.width / 2, y: originalObj.y + originalObj.height / 2 };
                    const rotatedCenter = rotatePoint(center);
                    obj.x = rotatedCenter.x - originalObj.width / 2;
                    obj.y = rotatedCenter.y - originalObj.height / 2;
                }

                // 2. Kendi ekseni etrafındaki açıyı güncelle
                const newA = (originalObj.rotation !== undefined ? originalObj.rotation : (originalObj.angle || 0)) + angle;
                obj.rotation = newA;
                obj.angle = newA;
                break;
        }
    }

    rotateObject(obj, angle, centerPoint) {
        if (obj.type === 'group') {
            obj.children.forEach(child => this.rotateObject(child, angle, centerPoint));
            return;
        }

        if (obj._renderCachePoints) delete obj._renderCachePoints;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatePoint = (point) => {
            const x = point.x - centerPoint.x;
            const y = point.y - centerPoint.y;
            return {
                ...point, // Diğer özellikleri koru
                x: cos * x - sin * y + centerPoint.x,
                y: sin * x + cos * y + centerPoint.y
            };
        };

        switch (obj.type) {
            case 'line':
            case 'arrow':
                obj.start = rotatePoint(obj.start);
                obj.end = rotatePoint(obj.end);
                break;

            case 'rectangle':
            case 'rect':
            case 'ellipse':
            case 'triangle':
            case 'trapezoid':
            case 'star':
            case 'diamond':
            case 'parallelogram':
            case 'oval':
            case 'heart':
            case 'cloud':
                // 1. Position update (center of gravity or center of x/y)
                if (obj.x !== undefined) {
                    const center = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
                    const rotatedCenter = rotatePoint(center);
                    obj.x = rotatedCenter.x - obj.width / 2;
                    obj.y = rotatedCenter.y - obj.height / 2;
                } else if (obj.start && obj.end) {
                    obj.start = rotatePoint(obj.start);
                    obj.end = rotatePoint(obj.end);
                } else if (obj.center) {
                    obj.center = rotatePoint(obj.center);
                }

                // 2. Rotation update
                if (obj.rotation !== undefined) {
                    obj.rotation += angle;
                } else {
                    obj.angle = (obj.angle || 0) + angle;
                }
                break;

            case 'pen':
                obj.points = obj.points.map(rotatePoint);
                break;
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.classList.remove('show');
        }
    }

    updateSelectedObjectsStyle(state, style) {
        this.selectedObjects.forEach(index => {
            const obj = state.objects[index];
            if (obj) {
                this.updateObjectStyle(obj, style);
            }
        });
    }

    updateObjectStyle(obj, style) {
        if (obj.type === 'group') {
            obj.children.forEach(child => this.updateObjectStyle(child, style));
            return;
        }

        if (obj._renderCachePoints && (style.width !== undefined || style.lineStyle !== undefined)) {
            delete obj._renderCachePoints;
        }

        if (style.color !== undefined) {
            obj.color = style.color;
            // Eger obje doluysa fill rengini de guncelle (stayFillColor seçeneği yoksa)
            if (!style.stayFillColor && (obj.filled || obj.fillColor && obj.fillColor !== 'transparent')) {
                obj.fillColor = style.color;
            }
        }
        if (style.fillColor !== undefined) {
            obj.fillColor = style.fillColor;
        }
        if (style.filled !== undefined) {
            obj.filled = style.filled;
        }
        if (style.width !== undefined) {
            const shapes = ['rectangle', 'rect', 'ellipse', 'triangle', 'trapezoid', 'star', 'diamond', 'parallelogram', 'oval', 'heart', 'cloud'];
            if (shapes.includes(obj.type)) {
                obj.strokeWidth = style.width;
            } else {
                obj.width = style.width;
            }
        }
        if (style.lineStyle !== undefined) {
            obj.lineStyle = style.lineStyle;
        }
        if (style.opacity !== undefined) {
            obj.opacity = style.opacity;
        }
        if (style.highlighterCap !== undefined) {
            obj.cap = style.highlighterCap;
        }
        if (style.arrowStartStyle !== undefined) {
            obj.startStyle = style.arrowStartStyle;
        }
        if (style.arrowEndStyle !== undefined) {
            obj.endStyle = style.arrowEndStyle;
        }
        if (style.arrowPathType !== undefined) {
            obj.pathType = style.arrowPathType;
        }
    }

    startLongPressTimer(e, canvas, state) {
        if (this.longPressTimer) clearTimeout(this.longPressTimer);

        this.longPressStartPos = { x: e.clientX, y: e.clientY };

        this.longPressTimer = setTimeout(() => {
            const fakeEvent = {
                preventDefault: () => { },
                clientX: this.longPressStartPos.x,
                clientY: this.longPressStartPos.y,
                target: e.target
            };

            this.handleContextMenu(fakeEvent, canvas, state);
            this.longPressTimer = null;
            if (navigator.vibrate) navigator.vibrate(50);

        }, this.LONG_PRESS_DURATION);
    }
}
