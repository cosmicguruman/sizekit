/**
 * CardDetector - Simple credit card detection with green overlay
 * Uses edge detection + contour finding + aspect ratio filtering
 */

class CardDetector {
    constructor() {
        // Credit card standard dimensions (ISO/IEC 7810 ID-1)
        this.CARD_ASPECT_RATIO = 1.586; // 85.6mm / 53.98mm
        this.ASPECT_TOLERANCE = 0.30; // 30% tolerance (RELAXED for easier detection)
        
        // Size matching - card should fill guide reasonably
        this.MIN_GUIDE_FILL = 0.50; // Card should be at least 50% of guide (RELAXED)
        this.MAX_GUIDE_FILL = 1.15; // Card can exceed guide a bit (RELAXED)
        
        // Detection state
        this.lastDetection = null;
        this.detectionHistory = [];
        this.stableFrames = 0;
        this.smoothedCorners = null;  // Smoothed corner positions
        
        // Performance tracking
        this.lastProcessTime = 0;
        
        // Debug mode
        this.debugMode = false;
        this.debugData = null;
    }

    /**
     * Enable/disable debug visualization
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Detect credit card in image
     * @param {ImageData} imageData - Raw image data from canvas
     * @param {Object} guideRegion - Guide rectangle bounds {x, y, width, height}
     * @returns {Object|null} Detection result with 4 corners, or null
     */
    detectCard(imageData, guideRegion = null) {
        const startTime = performance.now();
        
        try {
            // 1. Convert to grayscale
            const gray = this._toGrayscale(imageData);
            
            // 2. Apply edge detection (Sobel + thresholding)
            const edges = this._detectEdges(gray, imageData.width, imageData.height);
            
            // 3. Find contours (only in guide region if provided)
            const contours = this._findContours(edges, imageData.width, imageData.height, guideRegion);
            
            // 4. Find rectangles matching card aspect ratio
            const rectangles = this._findCardRectangles(contours, imageData.width, imageData.height, guideRegion);
            
            // 5. Pick best candidate
            const detection = this._selectBestCandidate(rectangles, imageData, guideRegion);
            
            // Store debug data
            if (this.debugMode) {
                this.debugData = {
                    edges: edges,
                    contours: contours,
                    rectangles: rectangles,
                    guideRegion: guideRegion,
                    imageWidth: imageData.width,
                    imageHeight: imageData.height
                };
            }
            
            // Log detection info
            if (this.debugMode) {
                console.log(`🔍 Detection: ${contours.length} contours, ${rectangles.length} rectangles`);
                if (rectangles.length > 0 && !detection) {
                    console.log(`⚠️ Rectangles found but none selected`);
                }
            }
            
            // Update stability tracking
            if (detection) {
                this._updateHistory(detection);
                
                // Smooth the corners to reduce jitter
                this.smoothedCorners = this._smoothCorners(detection.corners);
                
                // Return detection with smoothed corners
                this.lastDetection = {
                    ...detection,
                    corners: this.smoothedCorners
                };
            } else {
                this.detectionHistory = [];
                this.stableFrames = 0;
                this.smoothedCorners = null;
            }
            
            this.lastProcessTime = performance.now() - startTime;
            return this.lastDetection;
            
        } catch (error) {
            console.error('Card detection error:', error);
            this.lastProcessTime = performance.now() - startTime;
            return null;
        }
    }

    /**
     * Draw green overlay on detected card
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} detection - Detection result with corners
     */
    drawOverlay(ctx, detection) {
        // Draw debug visualization if enabled
        if (this.debugMode && this.debugData) {
            this._drawDebugOverlay(ctx);
        }
        
        if (!detection || !detection.corners) return;
        
        const corners = detection.corners;
        
        // Draw semi-transparent green fill
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fill();
        
        // Draw bright green outline
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    /**
     * Draw debug visualization
     * @private
     */
    _drawDebugOverlay(ctx) {
        const data = this.debugData;
        if (!data) return;
        
        // Draw count at top
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 60, 250, 35);
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Contours: ${data.contours.length} | Rectangles: ${data.rectangles.length}`, 15, 80);
        
        // Draw all detected contours in red
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        for (const contour of data.contours) {
            if (contour.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(contour[0].x, contour[0].y);
            for (let i = 1; i < contour.length; i++) {
                ctx.lineTo(contour[i].x, contour[i].y);
            }
            ctx.stroke();
        }
        
        // Draw all rectangle candidates in yellow
        for (let i = 0; i < data.rectangles.length; i++) {
            const rect = data.rectangles[i];
            const isLargest = i === 0; // First is largest (sorted by size)
            
            // Largest rectangle gets brighter/thicker outline
            ctx.strokeStyle = isLargest ? 'rgba(255, 255, 0, 1.0)' : 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = isLargest ? 4 : 2;
            
            ctx.beginPath();
            ctx.moveTo(rect.corners[0].x, rect.corners[0].y);
            for (let j = 1; j < rect.corners.length; j++) {
                ctx.lineTo(rect.corners[j].x, rect.corners[j].y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Draw corner points as cyan dots
            ctx.fillStyle = isLargest ? 'cyan' : 'rgba(0, 255, 255, 0.5)';
            for (const corner of rect.corners) {
                ctx.beginPath();
                ctx.arc(corner.x, corner.y, isLargest ? 6 : 4, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Draw info text
            ctx.fillStyle = isLargest ? 'yellow' : 'rgba(255, 255, 0, 0.7)';
            ctx.font = isLargest ? 'bold 14px monospace' : '12px monospace';
            
            const label = isLargest ? '★ LARGEST' : `#${i+1}`;
            ctx.fillText(`${label} AR:${rect.aspectRatio.toFixed(2)}`, rect.corners[0].x, rect.corners[0].y - 8);
            
            // Draw dimensions
            ctx.fillText(`${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`, rect.corners[0].x, rect.corners[0].y - 24);
        }
    }

    /**
     * Check if detection is stable
     * @returns {boolean} True if we have smoothed corners (instant lock)
     */
    isStable() {
        return this.smoothedCorners !== null;
    }

    /**
     * Smooth corner positions by averaging recent history
     * Reduces jitter and makes overlay stable
     * @private
     */
    _smoothCorners(currentCorners) {
        if (this.detectionHistory.length === 0) {
            return currentCorners;
        }
        
        // Average corner positions from last 3 detections
        const recentDetections = this.detectionHistory.slice(-3);
        const smoothed = [];
        
        for (let i = 0; i < 4; i++) {
            let sumX = currentCorners[i].x;
            let sumY = currentCorners[i].y;
            let count = 1;
            
            for (const detection of recentDetections) {
                sumX += detection.corners[i].x;
                sumY += detection.corners[i].y;
                count++;
            }
            
            smoothed.push({
                x: Math.round(sumX / count),
                y: Math.round(sumY / count)
            });
        }
        
        return smoothed;
    }

    /**
     * Get last processing time
     * @returns {number} Processing time in ms
     */
    getProcessTime() {
        return this.lastProcessTime;
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Convert RGB image to grayscale
     * @private
     */
    _toGrayscale(imageData) {
        const data = imageData.data;
        const gray = new Uint8Array(imageData.width * imageData.height);
        
        for (let i = 0; i < data.length; i += 4) {
            // Luminosity method
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        return gray;
    }

    /**
     * Detect edges using Sobel operator
     * @private
     */
    _detectEdges(gray, width, height) {
        const edges = new Uint8Array(width * height);
        
        // Sobel kernels
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        // Apply Sobel operator
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                // Convolve with kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = gray[(y + ky) * width + (x + kx)];
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += pixel * sobelX[kernelIdx];
                        gy += pixel * sobelY[kernelIdx];
                    }
                }
                
                // Gradient magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                // Threshold to get binary edge map (RELAXED: 40 for easier detection)
                edges[y * width + x] = magnitude > 40 ? 255 : 0;
            }
        }
        
        return edges;
    }

    /**
     * Find contours in edge image
     * @private
     */
    _findContours(edges, width, height, guideRegion = null) {
        const visited = new Uint8Array(width * height);
        const contours = [];
        
        // Define search bounds (use guide region if provided)
        const minX = guideRegion ? Math.max(1, Math.floor(guideRegion.x)) : 1;
        const minY = guideRegion ? Math.max(1, Math.floor(guideRegion.y)) : 1;
        const maxX = guideRegion ? Math.min(width - 1, Math.floor(guideRegion.x + guideRegion.width)) : width - 1;
        const maxY = guideRegion ? Math.min(height - 1, Math.floor(guideRegion.y + guideRegion.height)) : height - 1;
        
        // Scan for edge pixels (only in search region)
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const idx = y * width + x;
                
                if (edges[idx] === 255 && !visited[idx]) {
                    // Start a new contour
                    const contour = this._traceContour(edges, visited, x, y, width, height);
                    
                    // Only keep LARGE contours (ignore text/logos/small features)
                    // Card outline will be one of the largest contours
                    if (contour.length > 200) {  // Increased from 50 to 200
                        contours.push(contour);
                    }
                }
            }
        }
        
        // Sort by size (largest first) - card outline should be biggest
        contours.sort((a, b) => b.length - a.length);
        
        // Only keep top 5 largest contours (ignore small internal features)
        return contours.slice(0, 5);
    }

    /**
     * Trace a contour starting from a point
     * @private
     */
    _traceContour(edges, visited, startX, startY, width, height) {
        const contour = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0 && contour.length < 1000) {
            const { x, y } = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[idx] || edges[idx] !== 255) continue;
            
            visited[idx] = 1;
            contour.push({ x, y });
            
            // Check 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    stack.push({ x: x + dx, y: y + dy });
                }
            }
        }
        
        return contour;
    }

    /**
     * Find rectangles matching card aspect ratio
     * @private
     */
    _findCardRectangles(contours, width, height, guideRegion = null) {
        const rectangles = [];
        let rejectedCount = { corners: 0, aspectRatio: 0, size: 0 };
        
        for (let i = 0; i < contours.length; i++) {
            const contour = contours[i];
            
            // Approximate contour to polygon
            const polygon = this._approximatePolygon(contour);
            
            if (this.debugMode && i < 3) {  // Log first 3 contours
                console.log(`  Contour ${i}: ${contour.length} points → ${polygon.length} corners`);
            }
            
            // Must have exactly 4 corners
            if (polygon.length !== 4) {
                rejectedCount.corners++;
                if (this.debugMode && i < 3) {
                    console.log(`    ❌ Has ${polygon.length} corners (need 4)`);
                }
                continue;
            }
            
            // Check aspect ratio
            const dims = this._getRectDimensions(polygon);
            const aspectRatio = dims.width / dims.height;
            const aspectError = Math.abs(aspectRatio - this.CARD_ASPECT_RATIO) / this.CARD_ASPECT_RATIO;
            
            if (aspectError > this.ASPECT_TOLERANCE) {
                rejectedCount.aspectRatio++;
                if (this.debugMode) {
                    console.log(`  ❌ Rejected AR: ${aspectRatio.toFixed(2)} (error: ${(aspectError*100).toFixed(0)}%)`);
                }
                continue;
            }
            
            // If guide region provided, check if card matches guide size
            let guideFill = null;
            if (guideRegion) {
                guideFill = dims.width / guideRegion.width;
                if (guideFill < this.MIN_GUIDE_FILL || guideFill > this.MAX_GUIDE_FILL) {
                    rejectedCount.size++;
                    if (this.debugMode) {
                        console.log(`  ❌ Rejected size: ${(guideFill*100).toFixed(0)}% fill (want ${this.MIN_GUIDE_FILL*100}-${this.MAX_GUIDE_FILL*100}%)`);
                    }
                    continue;
                }
            } else {
                // Fallback: check size relative to image
                const sizeRatio = dims.width / width;
                if (sizeRatio < 0.20 || sizeRatio > 0.60) {
                    rejectedCount.size++;
                    continue;
                }
            }
            
            if (this.debugMode) {
                console.log(`  ✅ Rectangle: AR=${aspectRatio.toFixed(2)}, fill=${guideFill ? (guideFill*100).toFixed(0)+'%' : 'N/A'}`);
            }
            
            rectangles.push({
                corners: polygon,
                width: dims.width,
                height: dims.height,
                aspectRatio: aspectRatio,
                aspectError: aspectError,
                guideFill: guideFill
            });
        }
        
        if (this.debugMode && rectangles.length === 0) {
            console.log(`📊 Rejections: ${rejectedCount.corners} corners, ${rejectedCount.aspectRatio} aspect ratio, ${rejectedCount.size} size`);
        }
        
        // Sort by size (largest first) - prioritize card outline over internal features
        rectangles.sort((a, b) => b.width - a.width);
        
        if (this.debugMode && rectangles.length > 0) {
            console.log(`📐 Found ${rectangles.length} valid rectangles (sorted by size)`);
        }
        
        return rectangles;
    }

    /**
     * Approximate contour to polygon using Douglas-Peucker
     * Try multiple epsilon values until we get 4 corners
     * @private
     */
    _approximatePolygon(contour) {
        if (contour.length < 4) return contour;
        
        const perimeter = this._perimeter(contour);
        
        // Try multiple epsilon values to get exactly 4 corners
        const epsilonValues = [
            0.02 * perimeter,
            0.03 * perimeter,
            0.04 * perimeter,
            0.05 * perimeter,
            0.06 * perimeter,
            0.08 * perimeter,
            0.10 * perimeter
        ];
        
        for (const epsilon of epsilonValues) {
            const simplified = this._douglasPeucker(contour, epsilon);
            if (simplified.length === 4) {
                return simplified;
            }
        }
        
        // If still not 4 corners, find the 4 extreme points (fallback)
        if (this.debugMode) {
            console.log(`  📐 Douglas-Peucker failed, using corner detection fallback`);
        }
        return this._findFourCorners(contour);
    }

    /**
     * Find 4 corners by detecting extreme points (fallback method)
     * @private
     */
    _findFourCorners(contour) {
        if (contour.length < 4) return contour;
        
        // Find extremes: top-left, top-right, bottom-right, bottom-left
        let topLeft = contour[0];
        let topRight = contour[0];
        let bottomLeft = contour[0];
        let bottomRight = contour[0];
        
        for (const point of contour) {
            // Top-left: minimize x+y
            if (point.x + point.y < topLeft.x + topLeft.y) {
                topLeft = point;
            }
            // Top-right: maximize x, minimize y
            if (point.x - point.y > topRight.x - topRight.y) {
                topRight = point;
            }
            // Bottom-right: maximize x+y
            if (point.x + point.y > bottomRight.x + bottomRight.y) {
                bottomRight = point;
            }
            // Bottom-left: minimize x, maximize y
            if (-point.x + point.y > -bottomLeft.x + bottomLeft.y) {
                bottomLeft = point;
            }
        }
        
        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    /**
     * Douglas-Peucker algorithm for polygon simplification
     * @private
     */
    _douglasPeucker(points, epsilon) {
        if (points.length < 3) return points;
        
        // Find point with max distance from line
        let maxDist = 0;
        let maxIdx = 0;
        const end = points.length - 1;
        
        for (let i = 1; i < end; i++) {
            const dist = this._pointToLineDistance(points[i], points[0], points[end]);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }
        
        // If max distance > epsilon, recursively simplify
        if (maxDist > epsilon) {
            const left = this._douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
            const right = this._douglasPeucker(points.slice(maxIdx), epsilon);
            return [...left.slice(0, -1), ...right];
        } else {
            return [points[0], points[end]];
        }
    }

    /**
     * Calculate perimeter of contour
     * @private
     */
    _perimeter(contour) {
        let perimeter = 0;
        for (let i = 0; i < contour.length; i++) {
            const p1 = contour[i];
            const p2 = contour[(i + 1) % contour.length];
            perimeter += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }
        return perimeter;
    }

    /**
     * Distance from point to line
     * @private
     */
    _pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lenSq = dx * dx + dy * dy;
        
        if (lenSq === 0) {
            return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
        }
        
        const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        
        return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
    }

    /**
     * Get rectangle dimensions
     * @private
     */
    _getRectDimensions(corners) {
        const width1 = Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2));
        const width2 = Math.sqrt(Math.pow(corners[3].x - corners[2].x, 2) + Math.pow(corners[3].y - corners[2].y, 2));
        const height1 = Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + Math.pow(corners[2].y - corners[1].y, 2));
        const height2 = Math.sqrt(Math.pow(corners[0].x - corners[3].x, 2) + Math.pow(corners[0].y - corners[3].y, 2));
        
        return {
            width: (width1 + width2) / 2,
            height: (height1 + height2) / 2
        };
    }

    /**
     * Select best candidate from rectangles
     * @private
     */
    _selectBestCandidate(rectangles, imageData, guideRegion = null) {
        if (rectangles.length === 0) return null;
        
        // Score each rectangle
        let bestScore = 0;
        let bestRect = null;
        
        // Find max width for normalization
        const maxWidth = Math.max(...rectangles.map(r => r.width));
        
        for (const rect of rectangles) {
            // Score based on: SIZE (most important), aspect ratio, guide fill
            const aspectScore = 1 - rect.aspectError;
            
            // SIZE SCORE: Heavily favor LARGEST rectangle (card outline)
            // This is the key - internal features will be smaller
            const absoluteSizeScore = rect.width / maxWidth;  // 0-1, relative to largest
            
            // If guide provided, also check fill
            let guideFillScore = 1.0;
            if (guideRegion && rect.guideFill) {
                const targetFill = 0.85;
                const fillError = Math.abs(rect.guideFill - targetFill);
                guideFillScore = Math.max(0, 1 - fillError * 2);
            }
            
            // SCORING: Size is most important (50%), then aspect ratio (30%), then guide fill (20%)
            const score = absoluteSizeScore * 0.5 + aspectScore * 0.3 + guideFillScore * 0.2;
            
            if (this.debugMode) {
                console.log(`    Score: ${score.toFixed(2)} = size:${absoluteSizeScore.toFixed(2)} × 0.5 + aspect:${aspectScore.toFixed(2)} × 0.3 + fill:${guideFillScore.toFixed(2)} × 0.2`);
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestRect = rect;
            }
        }
        
        if (this.debugMode && bestRect) {
            console.log(`  🏆 Best: ${bestRect.width.toFixed(0)}×${bestRect.height.toFixed(0)}px, score=${bestScore.toFixed(2)}`);
        }
        
        return bestRect;
    }

    /**
     * Check brightness uniformity inside rectangle
     * @private
     */
    _checkBrightness(corners, imageData) {
        // Sample 20 random points inside rectangle
        const samples = 20;
        let sum = 0;
        
        for (let i = 0; i < samples; i++) {
            const t = Math.random();
            const s = Math.random();
            
            // Bilinear interpolation to get point inside quad
            const x = Math.floor(
                (1 - t) * (1 - s) * corners[0].x +
                t * (1 - s) * corners[1].x +
                t * s * corners[2].x +
                (1 - t) * s * corners[3].x
            );
            const y = Math.floor(
                (1 - t) * (1 - s) * corners[0].y +
                t * (1 - s) * corners[1].y +
                t * s * corners[2].y +
                (1 - t) * s * corners[3].y
            );
            
            if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
                const idx = (y * imageData.width + x) * 4;
                const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                sum += brightness;
            }
        }
        
        const avgBrightness = sum / samples;
        
        // Cards are usually bright
        return Math.min(avgBrightness / 255, 1.0);
    }

    /**
     * Update detection history for stability
     * @private
     */
    _updateHistory(detection) {
        this.detectionHistory.push(detection);
        
        if (this.detectionHistory.length > 5) {
            this.detectionHistory.shift();
        }
        
        // Check if recent detections are consistent
        if (this.detectionHistory.length >= 3) {
            const isConsistent = this._checkConsistency();
            if (isConsistent) {
                this.stableFrames++;
            } else {
                this.stableFrames = 0;
            }
        }
    }

    /**
     * Check if recent detections are consistent
     * @private
     */
    _checkConsistency() {
        if (this.detectionHistory.length < 2) return false;
        
        const recent = this.detectionHistory.slice(-2);
        
        // Check if corner positions are similar (very lenient)
        for (let i = 0; i < 4; i++) {
            const x0 = recent[0].corners[i].x;
            const y0 = recent[0].corners[i].y;
            
            for (let j = 1; j < recent.length; j++) {
                const x = recent[j].corners[i].x;
                const y = recent[j].corners[i].y;
                const dist = Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
                
                // Very lenient: allow up to 50px movement (smoothing handles the rest)
                if (dist > 50) return false;
            }
        }
        
        return true;
    }
}

// Export for use in HTML
window.CardDetector = CardDetector;
