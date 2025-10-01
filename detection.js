/**
 * SizeKit Phase 2B-D: AI Detection & Measurement
 * Reference object detection, hand pose detection, and nail measurement
 */

// ============================================
// CONSTANTS
// ============================================
const REFERENCE_OBJECTS = {
    creditCard: {
        name: 'Credit Card',
        widthMm: 85.6,
        heightMm: 53.98,
        aspectRatio: 85.6 / 53.98, // ~1.586
        toleranceRatio: 0.15 // 15% tolerance
    },
    quarter: {
        name: 'Quarter',
        diameterMm: 24.26,
        aspectRatio: 1.0, // circular
        toleranceRatio: 0.10 // 10% tolerance
    }
};

// Size number conversion table (mm to size)
const NAIL_SIZE_TABLE = [
    { size: 0, minMm: 16.0, maxMm: 18.0 },
    { size: 1, minMm: 15.0, maxMm: 16.0 },
    { size: 2, minMm: 14.0, maxMm: 15.0 },
    { size: 3, minMm: 13.0, maxMm: 14.0 },
    { size: 4, minMm: 12.0, maxMm: 13.0 },
    { size: 5, minMm: 11.0, maxMm: 12.0 },
    { size: 6, minMm: 10.0, maxMm: 11.0 },
    { size: 7, minMm: 9.0, maxMm: 10.0 },
    { size: 8, minMm: 8.0, maxMm: 9.0 },
    { size: 9, minMm: 7.0, maxMm: 8.0 },
    { size: 10, minMm: 6.0, maxMm: 7.0 },
    { size: 11, minMm: 5.0, maxMm: 6.0 }
];

// ============================================
// HAND POSE MODEL
// ============================================
let handposeModel = null;

async function loadHandposeModel() {
    if (!handposeModel) {
        console.log('Loading handpose model...');
        handposeModel = await handpose.load();
        console.log('✓ Handpose model loaded');
    }
    return handposeModel;
}

// ============================================
// REFERENCE OBJECT DETECTION
// ============================================

/**
 * Detect reference object in image
 * @param {Object} photo - Photo object with dataUrl
 * @returns {Object} Detection result with type and scale
 */
async function detectReferenceObject(photo) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            try {
                // Create canvas for processing
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Try to detect credit card first (more common)
                let detection = await detectCreditCard(canvas, ctx);
                
                if (!detection || detection.confidence < 0.7) {
                    // Try quarter if credit card not found
                    detection = await detectQuarter(canvas, ctx);
                }
                
                if (!detection || detection.confidence < 0.6) {
                    reject(new Error('No reference object detected. Please ensure a credit card or quarter is clearly visible in the image.'));
                    return;
                }
                
                resolve(detection);
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = photo.dataUrl;
    });
}

/**
 * Detect credit card - SIMPLIFIED TO THE MAX
 * Just scan for bright rectangles and pick the best one
 */
async function detectCreditCard(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    console.log(`📐 Scanning ${width}x${height}px image for credit card...`);
    
    const targetAspect = 1.586;
    const minCardWidth = width * 0.15;  // Card must be at least 15% of image
    const maxCardWidth = width * 0.50;  // Card must be at most 50% of image
    
    let bestRect = null;
    let bestScore = 0;
    
    // Scan image in a grid pattern
    const step = 30;
    for (let y = 0; y < height - 100; y += step) {
        for (let x = 0; x < width - 100; x += step) {
            // Try different rectangle sizes
            for (let w = minCardWidth; w <= maxCardWidth; w += 50) {
                const h = w / targetAspect;
                
                if (x + w > width || y + h > height) continue;
                
                // Check if this region looks like a card (bright, uniform)
                const brightness = getRegionBrightness(data, x, y, w, h, width);
                const uniformity = getRegionUniformity(data, x, y, w, h, width);
                
                const score = brightness * uniformity * (w / width); // Prefer larger cards
                
                if (score > bestScore) {
                    bestScore = score;
                    bestRect = { x: Math.floor(x), y: Math.floor(y), width: Math.floor(w), height: Math.floor(h) };
                }
            }
        }
    }
    
    if (bestRect) {
        const pixelsPerMm = bestRect.width / 85.6;
        
        console.log(`✅ Credit card detected!`);
        console.log(`   Position: (${bestRect.x}, ${bestRect.y})`);
        console.log(`   Size: ${bestRect.width}x${bestRect.height}px`);
        console.log(`   Scale: ${pixelsPerMm.toFixed(2)} pixels/mm`);
        
        return {
            type: 'creditCard',
            pixelsPerMm: pixelsPerMm,
            confidence: Math.min(bestScore * 10, 0.95),
            boundingBox: bestRect,
            referenceSizeMm: 85.6
        };
    }
    
    console.warn('⚠️ No credit card found');
    return null;
}

// Helper: Get average brightness of a region
function getRegionBrightness(data, x, y, w, h, imgWidth) {
    let sum = 0;
    let count = 0;
    const samples = 50; // Sample 50 pixels
    
    for (let i = 0; i < samples; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        const idx = (Math.floor(py) * imgWidth + Math.floor(px)) * 4;
        
        if (idx >= 0 && idx < data.length - 3) {
            // Calculate grayscale brightness
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            sum += brightness;
            count++;
        }
    }
    
    return count > 0 ? sum / count / 255 : 0; // Normalize to 0-1
}

// Helper: Get uniformity (low variance = more uniform)
function getRegionUniformity(data, x, y, w, h, imgWidth) {
    const samples = 30;
    const brightnesses = [];
    
    for (let i = 0; i < samples; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        const idx = (Math.floor(py) * imgWidth + Math.floor(px)) * 4;
        
        if (idx >= 0 && idx < data.length - 3) {
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            brightnesses.push(brightness);
        }
    }
    
    if (brightnesses.length === 0) return 0;
    
    const mean = brightnesses.reduce((a, b) => a + b) / brightnesses.length;
    const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / brightnesses.length;
    
    // Low variance = high uniformity
    return 1 / (1 + variance / 1000);
}

/**
 * Detect quarter (circular object)
 */
async function detectQuarter(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple circle detection
    const circles = findCircles(imageData);
    
    // Look for circle with reasonable size
    for (const circle of circles) {
        const diameterPixels = circle.radius * 2;
        const pixelsPerMm = diameterPixels / REFERENCE_OBJECTS.quarter.diameterMm;
        
        // Validate size is reasonable (not too small/large)
        if (pixelsPerMm > 2 && pixelsPerMm < 50) {
            return {
                type: 'quarter',
                pixelsPerMm: pixelsPerMm,
                confidence: 0.75,
                boundingBox: circle,
                referenceSizeMm: REFERENCE_OBJECTS.quarter.diameterMm
            };
        }
    }
    
    return null;
}

/**
 * Simple rectangle detection - FIXED VERSION
 * Just generates candidate rectangles based on typical credit card size/position
 */
function findRectangles(imageData) {
    const rectangles = [];
    const width = imageData.width;
    const height = imageData.height;
    
    console.log(`📐 Image size: ${width}x${height}px`);
    
    // Credit card aspect ratio: 1.586 (85.6mm / 53.98mm)
    const targetAspect = 1.586;
    
    // Test realistic credit card sizes (15-35% of image width)
    const testWidths = [
        Math.floor(width * 0.15),
        Math.floor(width * 0.20),
        Math.floor(width * 0.25),
        Math.floor(width * 0.30),
        Math.floor(width * 0.35)
    ];
    
    console.log(`🔍 Testing card widths:`, testWidths);
    
    testWidths.forEach(cardWidth => {
        const cardHeight = Math.floor(cardWidth / targetAspect);
        
        // Assume card is in the frame somewhere reasonable
        // Try center position
        const x = Math.floor((width - cardWidth) / 2);
        const y = Math.floor((height - cardHeight) / 2);
        
        rectangles.push({ 
            x, 
            y, 
            width: cardWidth, 
            height: cardHeight
        });
    });
    
    console.log(`📦 Generated ${rectangles.length} candidate credit card regions`);
    return rectangles;
}

/**
 * Simple circle detection
 */
function findCircles(imageData) {
    // Simplified circle detection
    const circles = [];
    const width = imageData.width;
    const height = imageData.height;
    
    // Look for circular bright regions
    const stepSize = 20;
    for (let y = 50; y < height - 50; y += stepSize) {
        for (let x = 50; x < width - 50; x += stepSize) {
            for (let r = 30; r < 150; r += 10) {
                if (isCircle(imageData, x, y, r)) {
                    circles.push({ x, y, radius: r });
                }
            }
        }
    }
    
    return circles.slice(0, 3); // Return top 3 candidates
}

/**
 * Check if region is rectangular
 */
function isRectangle(imageData, x, y, w, h) {
    // Simplified check: look for edges on all 4 sides
    const edgeThreshold = w * h * 0.1;
    let edgeCount = 0;
    
    // Count edge pixels (simplified)
    const data = imageData.data;
    const width = imageData.width;
    
    // Top edge
    for (let i = x; i < x + w; i++) {
        const idx = (y * width + i) * 4;
        if (data[idx] > 128) edgeCount++;
    }
    
    // Bottom edge
    for (let i = x; i < x + w; i++) {
        const idx = ((y + h) * width + i) * 4;
        if (data[idx] > 128) edgeCount++;
    }
    
    return edgeCount > edgeThreshold;
}

/**
 * Check if region is circular
 */
function isCircle(imageData, cx, cy, r) {
    // Simplified check: sample points around circle
    const data = imageData.data;
    const width = imageData.width;
    let brightPoints = 0;
    const samples = 16;
    
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * 2 * Math.PI;
        const x = Math.round(cx + r * Math.cos(angle));
        const y = Math.round(cy + r * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness > 100) brightPoints++;
        }
    }
    
    return brightPoints > samples * 0.6;
}

/**
 * Simple edge detection (Sobel-like)
 */
function detectEdges(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new ImageData(width, height);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Simple gradient
            const gx = data[idx + 4] - data[idx - 4];
            const gy = data[idx + width * 4] - data[idx - width * 4];
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            
            edges.data[idx] = magnitude > 30 ? 255 : 0;
            edges.data[idx + 1] = edges.data[idx];
            edges.data[idx + 2] = edges.data[idx];
            edges.data[idx + 3] = 255;
        }
    }
    
    return edges;
}

// ============================================
// HAND DETECTION
// ============================================

/**
 * Detect hand and nails in image
 * @param {Object} photo - Photo object with dataUrl
 * @param {Object} referenceData - Reference object detection result
 * @returns {Object} Hand detection with nail locations
 */
async function detectHandAndNails(photo, referenceData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            try {
                // Load handpose model
                const model = await loadHandposeModel();
                
                // Detect hand
                const predictions = await model.estimateHands(img);
                
                if (predictions.length === 0) {
                    reject(new Error('No hand detected. Please ensure your hand is clearly visible and well-lit.'));
                    return;
                }
                
                // Use first detected hand
                const hand = predictions[0];
                
                // Extract nail locations from keypoints
                const nails = extractNailLocations(hand, img.width, img.height);
                
                resolve({
                    detected: true,
                    keypoints: hand.landmarks,
                    nails: nails,
                    confidence: hand.handInViewConfidence
                });
                
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = photo.dataUrl;
    });
}

/**
 * Extract nail locations from hand keypoints
 */
function extractNailLocations(hand, imageWidth, imageHeight) {
    const landmarks = hand.landmarks;
    
    // MediaPipe hand landmarks indices:
    // 4: thumb tip, 8: index tip, 12: middle tip, 16: ring tip, 20: pinky tip
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    
    return fingerTips.map((tipIndex, i) => {
        const tip = landmarks[tipIndex];
        const base = landmarks[tipIndex - 3]; // Approximate base of nail
        
        return {
            finger: fingerNames[i],
            tip: { x: tip[0], y: tip[1] },
            base: { x: base[0], y: base[1] },
            width: calculateNailWidth(landmarks, tipIndex, imageWidth, imageHeight)
        };
    });
}

/**
 * Calculate nail width from hand landmarks
 */
function calculateNailWidth(landmarks, tipIndex, imageWidth, imageHeight) {
    // Estimate nail width based on finger width at the tip
    // This is simplified - real implementation would analyze the actual nail region
    
    const tip = landmarks[tipIndex];
    const secondJoint = landmarks[tipIndex - 2];
    
    // Distance between joints gives us finger thickness estimate
    const dx = tip[0] - secondJoint[0];
    const dy = tip[1] - secondJoint[1];
    const fingerLength = Math.sqrt(dx * dx + dy * dy);
    
    // Nail width is approximately 0.4-0.5 of finger length
    const estimatedNailWidth = fingerLength * 0.45;
    
    console.log(`  Finger segment: ${fingerLength.toFixed(1)}px → Nail width: ${estimatedNailWidth.toFixed(1)}px`);
    
    return {
        pixels: estimatedNailWidth,
        location: { x: tip[0], y: tip[1] }
    };
}

// ============================================
// NAIL MEASUREMENT
// ============================================

/**
 * Measure nails and convert to size numbers
 * @param {Object} handData - Hand detection result
 * @param {Object} referenceData - Reference object detection result
 * @returns {Array} Nail measurements with sizes
 */
function measureNails(handData, referenceData) {
    const pixelsPerMm = referenceData.pixelsPerMm;
    
    console.log(`📏 Measuring nails with scale: ${pixelsPerMm.toFixed(2)} pixels/mm`);
    
    return handData.nails.map(nail => {
        // Convert pixels to millimeters
        const widthMm = nail.width.pixels / pixelsPerMm;
        
        // Convert mm to size number
        const sizeNumber = mmToSizeNumber(widthMm);
        
        console.log(`  ${nail.finger}: ${nail.width.pixels.toFixed(1)}px ÷ ${pixelsPerMm.toFixed(2)} = ${widthMm.toFixed(1)}mm → Size ${sizeNumber}`);
        
        return {
            finger: nail.finger,
            mm: Math.round(widthMm * 10) / 10, // Round to 1 decimal
            size: sizeNumber,
            confidence: handData.confidence
        };
    });
}

/**
 * Convert millimeter measurement to nail size number
 */
function mmToSizeNumber(mm) {
    // Find the size that best matches the measurement
    for (const sizeInfo of NAIL_SIZE_TABLE) {
        if (mm >= sizeInfo.minMm && mm < sizeInfo.maxMm) {
            return sizeInfo.size;
        }
    }
    
    // Edge cases
    if (mm >= 18) return 0; // Largest
    if (mm < 5) return 11; // Smallest
    
    // Default fallback: round to nearest size
    const approxSize = Math.round(18 - mm);
    return Math.max(0, Math.min(11, approxSize));
}

/**
 * Convert size number to millimeter range
 */
function sizeNumberToMm(sizeNumber) {
    const sizeInfo = NAIL_SIZE_TABLE.find(s => s.size === sizeNumber);
    if (sizeInfo) {
        return {
            min: sizeInfo.minMm,
            max: sizeInfo.maxMm,
            average: (sizeInfo.minMm + sizeInfo.maxMm) / 2
        };
    }
    return { min: 7, max: 18, average: 12 }; // Default
}

// ============================================
// EXPORTS
// ============================================
window.SizeKitDetection = {
    detectReferenceObject,
    detectHandAndNails,
    measureNails,
    mmToSizeNumber,
    sizeNumberToMm,
    loadHandposeModel
};
