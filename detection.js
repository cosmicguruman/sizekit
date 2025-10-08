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

// Tomica size chart: Size 0 = 17mm, down to Size 9 = 8mm (1mm steps)
const NAIL_SIZE_TABLE = [
    { size: 0, mm: 17 },
    { size: 1, mm: 16 },
    { size: 2, mm: 15 },
    { size: 3, mm: 14 },
    { size: 4, mm: 13 },
    { size: 5, mm: 12 },
    { size: 6, mm: 11 },
    { size: 7, mm: 10 },
    { size: 8, mm: 9 },
    { size: 9, mm: 8 }
];

// Curvature multiplier: converts chord length to actual curved length
const CURVATURE_MULTIPLIER = 1.06;

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
 * Detect credit card - WITH STRICT FILTERING
 * Only accept bright, uniform rectangles with correct aspect ratio
 */
async function detectCreditCard(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    console.log(`📐 Scanning ${width}x${height}px image for credit card...`);
    
    const targetAspect = 1.586;
    const minCardWidth = width * 0.18;  // Card must be 18-45% of image
    const maxCardWidth = width * 0.45;
    
    console.log(`   Card width range: ${minCardWidth.toFixed(0)}-${maxCardWidth.toFixed(0)}px`);
    
    const candidates = [];
    const rejected = { brightness: 0, uniformity: 0, aspect: 0, total: 0 };
    
    // Scan image in a grid pattern
    const step = 40; // Grid spacing
    for (let y = 0; y < height - 100; y += step) {
        for (let x = 0; x < width - 100; x += step) {
            // Try different rectangle sizes
            for (let w = minCardWidth; w <= maxCardWidth; w += 70) {
                const h = w / targetAspect;
                
                if (x + w > width || y + h > height) continue;
                
                rejected.total++;
                
                // Check brightness and uniformity
                const brightness = getRegionBrightness(data, x, y, w, h, width);
                const uniformity = getRegionUniformity(data, x, y, w, h, width);
                
                // RELAXED: Lower thresholds
                if (brightness < 110) {  // Was 120, now 110
                    rejected.brightness++;
                    continue;
                }
                if (uniformity < 0.75) {  // Was 0.85, now 0.75
                    rejected.uniformity++;
                    continue;
                }
                
                // Check aspect ratio
                const aspectRatio = w / h;
                const aspectError = Math.abs(aspectRatio - targetAspect) / targetAspect;
                if (aspectError > 0.2) {  // Was 0.15, now 0.2
                    rejected.aspect++;
                    continue;
                }
                
                // This one passed! Add it
                const sizeScore = w / width;
                const qualityScore = (brightness / 255) * uniformity;
                const score = sizeScore * qualityScore * 100;
                
                candidates.push({
                    x: Math.floor(x),
                    y: Math.floor(y),
                    width: Math.floor(w),
                    height: Math.floor(h),
                    brightness,
                    uniformity,
                    score
                });
            }
        }
    }
    
    console.log(`   Checked ${rejected.total} regions:`);
    console.log(`     - ${rejected.brightness} rejected (brightness < 110)`);
    console.log(`     - ${rejected.uniformity} rejected (uniformity < 0.75)`);
    console.log(`     - ${rejected.aspect} rejected (wrong aspect ratio)`);
    console.log(`     - ${candidates.length} PASSED all filters ✓`);
    
    if (candidates.length === 0) {
        console.warn('❌ NO CARDS FOUND!');
        console.warn('   Try:');
        console.warn('   - Better lighting');
        console.warn('   - Hold card flat');
        console.warn('   - Use a white/light colored card');
        console.warn('   - Move card closer to camera');
        return null;
    }
    
    // Sort by score and take best
    candidates.sort((a, b) => b.score - a.score);
    const bestRect = candidates[0];
    
    const pixelsPerMm = bestRect.width / 85.6;
    
    console.log(`✅ CARD FOUND!`);
    console.log(`   Position: (${bestRect.x}, ${bestRect.y})`);
    console.log(`   Size: ${bestRect.width}×${bestRect.height}px`);
    console.log(`   Brightness: ${bestRect.brightness.toFixed(0)}/255`);
    console.log(`   Uniformity: ${bestRect.uniformity.toFixed(2)}`);
    console.log(`   Scale: ${pixelsPerMm.toFixed(2)} px/mm`);
    
    // Show top 3 candidates for comparison
    if (candidates.length > 1) {
        console.log(`   Other candidates:`);
        for (let i = 1; i < Math.min(3, candidates.length); i++) {
            console.log(`     ${i+1}. Score ${candidates[i].score.toFixed(1)} at (${candidates[i].x}, ${candidates[i].y})`);
        }
    }
    
    return {
        type: 'creditCard',
        pixelsPerMm: pixelsPerMm,
        confidence: Math.min(bestRect.score / 100, 0.95),
        boundingBox: {
            x: bestRect.x,
            y: bestRect.y,
            width: bestRect.width,
            height: bestRect.height
        },
        referenceSizeMm: 85.6
    };
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
                
                // Get image data for actual nail detection
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Extract nail locations from keypoints (with actual detection)
                const nails = extractNailLocations(hand, img.width, img.height, imageData);
                
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
function extractNailLocations(hand, imageWidth, imageHeight, imageData = null) {
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
            width: calculateNailWidth(landmarks, tipIndex, imageWidth, imageHeight, imageData)
        };
    });
}

/**
 * Calculate nail width from hand landmarks - STRICT MODE: DETECTION ONLY
 */
function calculateNailWidth(landmarks, tipIndex, imageWidth, imageHeight, imageData = null) {
    const tip = landmarks[tipIndex];
    
    // MUST have image data - no fallback
    if (!imageData) {
        console.error(`  ❌ No image data provided for nail detection`);
        return {
            pixels: 0,
            location: { x: tip[0], y: tip[1] },
            method: 'failed',
            error: 'No image data'
        };
    }
    
    // Detect actual nail boundary
    const actualWidth = detectActualNailBoundary(imageData, tip[0], tip[1], landmarks, tipIndex);
    
    if (actualWidth > 0) {
        console.log(`  ✨ NAIL DETECTED: ${actualWidth.toFixed(1)}px`);
        return {
            pixels: actualWidth,
            location: { x: tip[0], y: tip[1] },
            method: 'segmentation'
        };
    }
    
    // Detection failed - NO FALLBACK
    console.error(`  ❌ NAIL DETECTION FAILED - insufficient nail pixels`);
    return {
        pixels: 0,
        location: { x: tip[0], y: tip[1] },
        method: 'failed',
        error: 'Detection failed'
    };
}

/**
 * 🔬 ACTUAL NAIL BOUNDARY DETECTION
 * Scans left/right from fingertip to find nail edges
 */
function detectActualNailBoundary(imageData, fingertipX, fingertipY, landmarks, tipIndex) {
    const data = imageData.data;
    const imgWidth = imageData.width;
    const imgHeight = imageData.height;
    
    console.log(`  🔬 Detecting nail at fingertip (${Math.round(fingertipX)}, ${Math.round(fingertipY)})`);
    
    // Sample skin tone from finger base
    const baseJoint = landmarks[tipIndex - 3];
    const skinTone = getSkinTone(data, imgWidth, baseJoint[0], baseJoint[1]);
    console.log(`  Skin brightness: ${skinTone.brightness.toFixed(0)}`);
    
    // Sample an AREA around fingertip (not just one pixel) to find nail
    const tipY = Math.round(fingertipY);
    const tipX = Math.round(fingertipX);
    
    // Sample 5x5 area around fingertip and find brightest pixel
    let maxBrightness = 0;
    const sampleRadius = 2;
    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
        for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            const sampleX = tipX + dx;
            const sampleY = tipY + dy;
            if (sampleX >= 0 && sampleX < imgWidth && sampleY >= 0 && sampleY < imgHeight) {
                const idx = (sampleY * imgWidth + sampleX) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > maxBrightness) {
                    maxBrightness = brightness;
                }
            }
        }
    }
    
    const tipBrightness = maxBrightness;
    console.log(`  Nail area brightness: ${tipBrightness.toFixed(0)} (max in 5x5 region)`);
    
    // If nail area isn't brighter than skin, detection might fail
    if (tipBrightness < skinTone.brightness * 1.02) {
        console.warn(`  ⚠️ Nail area not significantly brighter than skin`);
        // Don't give up yet - continue with detection
    }
    
    // Scan multiple horizontal lines near the fingertip
    let maxWidth = 0;
    const scanLines = 7; // Check 7 lines above/below fingertip (was 5)
    const scanStep = 2;  // 2 pixels apart (was 3)
    
    // Calculate edge threshold: nail edge is where brightness drops significantly
    const edgeThreshold = Math.max(
        tipBrightness * 0.75,  // 25% drop from nail (was 15%)
        skinTone.brightness * 1.02  // OR just slightly above skin
    );
    
    for (let offset = -scanLines * scanStep; offset <= scanLines * scanStep; offset += scanStep) {
        const scanY = tipY + offset;
        if (scanY < 0 || scanY >= imgHeight) continue;
        
        // Scan LEFT from fingertip until we hit edge
        let leftEdge = tipX;
        for (let x = tipX; x >= Math.max(0, tipX - 60); x--) {
            const idx = (scanY * imgWidth + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            // Stop if brightness drops below threshold (hit nail edge)
            if (brightness < edgeThreshold) {
                leftEdge = x + 1; // Edge is one pixel back
                break;
            }
        }
        
        // Scan RIGHT from fingertip until we hit edge
        let rightEdge = tipX;
        for (let x = tipX; x <= Math.min(imgWidth - 1, tipX + 60); x++) {
            const idx = (scanY * imgWidth + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            // Stop if brightness drops below threshold (hit nail edge)
            if (brightness < edgeThreshold) {
                rightEdge = x - 1; // Edge is one pixel back
                break;
            }
        }
        
        const width = rightEdge - leftEdge + 1;
        if (width > maxWidth && width > 3) { // Must be at least 3px wide (was 5)
            maxWidth = width;
            console.log(`  Scan y=${scanY}: L=${leftEdge} R=${rightEdge} W=${width}px`);
        }
    }
    
    if (maxWidth === 0) {
        console.warn(`  ⚠️ Could not find nail edges`);
        return 0;
    }
    
    console.log(`  📏 Measured nail width: ${maxWidth}px`);
    return maxWidth;
}

/**
 * Sample skin tone from a region
 */
function getSkinTone(data, imgWidth, centerX, centerY) {
    const samples = 20;
    const sampleRadius = 10;
    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;
    
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * 2 * Math.PI;
        const x = Math.round(centerX + sampleRadius * Math.cos(angle));
        const y = Math.round(centerY + sampleRadius * Math.sin(angle));
        const idx = (y * imgWidth + x) * 4;
        
        if (idx >= 0 && idx < data.length - 3) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
        }
    }
    
    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;
    
    return {
        r: Math.round(avgR),
        g: Math.round(avgG),
        b: Math.round(avgB),
        brightness: (avgR + avgG + avgB) / 3
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
        // Convert pixels to millimeters (chord length)
        const chordMm = nail.width.pixels / pixelsPerMm;
        
        // Apply curvature multiplier to get actual curved length
        const curvedMm = chordMm * CURVATURE_MULTIPLIER;
        
        // Convert mm to Tomica size number
        const sizeNumber = mmToSizeNumber(curvedMm);
        
        console.log(`  ${nail.finger}: ${nail.width.pixels.toFixed(1)}px → ${chordMm.toFixed(1)}mm (chord) × ${CURVATURE_MULTIPLIER} = ${curvedMm.toFixed(1)}mm → Size ${sizeNumber}`);
        
        return {
            finger: nail.finger,
            chordMm: Math.round(chordMm * 10) / 10,
            curvedMm: Math.round(curvedMm * 10) / 10,
            widthMm: Math.round(curvedMm * 10) / 10, // final measurement
            sizeNumber: sizeNumber,
            confidence: nail.width.pixels > 0 ? handData.confidence : 0
        };
    });
}

/**
 * Convert millimeter measurement to Tomica nail size number
 * Tomica sizes: 0=17mm, 1=16mm, ..., 9=8mm (1mm steps)
 */
function mmToSizeNumber(mm) {
    // Round to nearest mm
    const roundedMm = Math.round(mm);
    
    // Find exact match first
    const exactMatch = NAIL_SIZE_TABLE.find(s => s.mm === roundedMm);
    if (exactMatch) {
        return exactMatch.size;
    }
    
    // Edge cases
    if (roundedMm >= 17) return 0; // Largest (Size 0)
    if (roundedMm <= 8) return 9;  // Smallest (Size 9)
    
    // Find closest size: 17 - mm gives the size
    // 17mm → 0, 16mm → 1, 15mm → 2, etc.
    const size = 17 - roundedMm;
    return Math.max(0, Math.min(9, size));
}

/**
 * Convert Tomica size number to millimeter measurement
 */
function sizeNumberToMm(sizeNumber) {
    const sizeInfo = NAIL_SIZE_TABLE.find(s => s.size === sizeNumber);
    if (sizeInfo) {
        return sizeInfo.mm;
    }
    // Default: size 4 = 13mm (middle size)
    return 13;
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
