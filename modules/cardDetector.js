/**
 * CardDetector - Credit card detection using OpenCV.js
 * Clean, maintainable implementation using proven CV algorithms
 */

class CardDetector {
    constructor() {
        // Credit card standard dimensions (ISO/IEC 7810 ID-1)
        this.CARD_ASPECT_RATIO = 1.586; // 85.6mm / 53.98mm
        this.ASPECT_TOLERANCE = 0.25; // 25% tolerance
        
        // Detection state
        this.lastDetection = null;
        this.smoothedCorners = null;
        
        // OpenCV matrices (reused for performance)
        this.mat = null;
        this.gray = null;
        this.blurred = null;
        this.edges = null;
        this.hierarchy = null;
    }

    /**
     * Detect credit card in image using OpenCV
     * @param {ImageData} imageData - Raw image data from canvas
     * @param {Object} guideRegion - Optional guide region {x, y, width, height}
     * @returns {Object|null} Detection result with 4 corners, or null
     */
    detectCard(imageData, guideRegion = null) {
        if (!window.cv || !cv.Mat) {
            console.error('OpenCV not loaded yet');
            return null;
        }

        try {
            // 1. Convert ImageData to OpenCV Mat
            this.mat = cv.matFromImageData(imageData);
            
            // 2. Convert to grayscale
            this.gray = new cv.Mat();
            cv.cvtColor(this.mat, this.gray, cv.COLOR_RGBA2GRAY);
            
            // 3. Apply Gaussian blur to reduce noise
            this.blurred = new cv.Mat();
            cv.GaussianBlur(this.gray, this.blurred, new cv.Size(5, 5), 0);
            
            // 4. Detect edges using Canny
            this.edges = new cv.Mat();
            cv.Canny(this.blurred, this.edges, 50, 150);
            
            // 5. Find contours
            const contours = new cv.MatVector();
            this.hierarchy = new cv.Mat();
            cv.findContours(
                this.edges,
                contours,
                this.hierarchy,
                cv.RETR_EXTERNAL,
                cv.CHAIN_APPROX_SIMPLE
            );
            
            // 6. Find rectangles matching card aspect ratio
            const rectangles = this._findCardRectangles(contours, imageData, guideRegion);
            
            // 7. Select best candidate
            const detection = this._selectBestCandidate(rectangles, guideRegion);
            
            // 8. Smooth corners if we have a detection
            if (detection) {
                this.smoothedCorners = this._smoothCorners(detection.corners);
                this.lastDetection = {
                    ...detection,
                    corners: this.smoothedCorners
                };
            } else {
                this.smoothedCorners = null;
                this.lastDetection = null;
            }
            
            // Cleanup
            contours.delete();
            this._cleanup();
            
            return this.lastDetection;
            
        } catch (error) {
            console.error('Card detection error:', error);
            this._cleanup();
            return null;
        }
    }

    /**
     * Draw green overlay on detected card
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} detection - Detection result with corners
     */
    drawOverlay(ctx, detection) {
        if (!detection || !detection.corners || detection.corners.length !== 4) return;
        
        const corners = detection.corners;
        
        // Draw semi-transparent green fill
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.25)';
        ctx.fill();
        
        // Draw bright green outline
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw corner dots
        ctx.fillStyle = 'rgb(0, 255, 0)';
        for (const corner of corners) {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 6, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    /**
     * Check if detection is stable
     * @returns {boolean} True if we have smoothed corners
     */
    isStable() {
        return this.smoothedCorners !== null;
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Find rectangles matching card aspect ratio
     * @private
     */
    _findCardRectangles(contours, imageData, guideRegion) {
        const rectangles = [];
        const minArea = guideRegion ? 
            (guideRegion.width * guideRegion.height * 0.3) : 
            (imageData.width * imageData.height * 0.05);
        
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            // Skip small contours
            if (area < minArea) continue;
            
            // Approximate contour to polygon
            const perimeter = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
            
            // Must have exactly 4 corners (quadrilateral)
            if (approx.rows === 4) {
                // Extract corners
                const corners = [];
                for (let j = 0; j < 4; j++) {
                    corners.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }
                
                // Order corners: top-left, top-right, bottom-right, bottom-left
                const orderedCorners = this._orderCorners(corners);
                
                // Calculate dimensions
                const width = this._distance(orderedCorners[0], orderedCorners[1]);
                const height = this._distance(orderedCorners[1], orderedCorners[2]);
                const aspectRatio = width / height;
                
                // Check if aspect ratio matches credit card
                const aspectError = Math.abs(aspectRatio - this.CARD_ASPECT_RATIO) / this.CARD_ASPECT_RATIO;
                
                if (aspectError <= this.ASPECT_TOLERANCE) {
                    rectangles.push({
                        corners: orderedCorners,
                        width: width,
                        height: height,
                        area: area,
                        aspectRatio: aspectRatio,
                        aspectError: aspectError
                    });
                }
            }
            
            approx.delete();
        }
        
        // Sort by area (largest first)
        rectangles.sort((a, b) => b.area - a.area);
        
        return rectangles;
    }

    /**
     * Select best rectangle candidate
     * @private
     */
    _selectBestCandidate(rectangles, guideRegion) {
        if (rectangles.length === 0) return null;
        
        // If we have a guide region, prefer rectangles inside it
        if (guideRegion) {
            for (const rect of rectangles) {
                if (this._isInsideGuide(rect.corners, guideRegion)) {
                    return rect;
                }
            }
        }
        
        // Otherwise, return the largest rectangle
        return rectangles[0];
    }

    /**
     * Check if corners are inside guide region
     * @private
     */
    _isInsideGuide(corners, guide) {
        const centerX = (corners[0].x + corners[2].x) / 2;
        const centerY = (corners[0].y + corners[2].y) / 2;
        
        return centerX >= guide.x &&
               centerX <= guide.x + guide.width &&
               centerY >= guide.y &&
               centerY <= guide.y + guide.height;
    }

    /**
     * Order corners: top-left, top-right, bottom-right, bottom-left
     * @private
     */
    _orderCorners(corners) {
        // Sort by sum (x + y) to find top-left and bottom-right
        const sorted = [...corners].sort((a, b) => (a.x + a.y) - (b.x + b.y));
        const topLeft = sorted[0];
        const bottomRight = sorted[3];
        
        // Sort remaining by difference (x - y) to find top-right and bottom-left
        const remaining = [sorted[1], sorted[2]];
        remaining.sort((a, b) => (b.x - b.y) - (a.x - a.y));
        const topRight = remaining[0];
        const bottomLeft = remaining[1];
        
        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    /**
     * Calculate Euclidean distance between two points
     * @private
     */
    _distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Smooth corner positions with exponential moving average
     * @private
     */
    _smoothCorners(currentCorners) {
        if (!this.smoothedCorners) {
            return currentCorners;
        }
        
        // Exponential moving average: 85% previous, 15% current
        const alpha = 0.15;
        const smoothed = [];
        
        for (let i = 0; i < 4; i++) {
            const prevX = this.smoothedCorners[i].x;
            const prevY = this.smoothedCorners[i].y;
            const currX = currentCorners[i].x;
            const currY = currentCorners[i].y;
            
            smoothed.push({
                x: Math.round(prevX * (1 - alpha) + currX * alpha),
                y: Math.round(prevY * (1 - alpha) + currY * alpha)
            });
        }
        
        return smoothed;
    }

    /**
     * Cleanup OpenCV matrices
     * @private
     */
    _cleanup() {
        if (this.mat) this.mat.delete();
        if (this.gray) this.gray.delete();
        if (this.blurred) this.blurred.delete();
        if (this.edges) this.edges.delete();
        if (this.hierarchy) this.hierarchy.delete();
        
        this.mat = null;
        this.gray = null;
        this.blurred = null;
        this.edges = null;
        this.hierarchy = null;
    }
}

// Export for use in HTML
window.CardDetector = CardDetector;
