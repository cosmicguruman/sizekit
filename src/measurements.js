/**
 * SizeKit Measurement Calculations
 * Pure functions: input data → output measurements
 * No side effects, easy to test and debug
 */

import { Config } from './config.js';

/**
 * Convert millimeters to nail size number
 * @param {number} mm - Nail width in millimeters
 * @returns {number} Size number (0-11)
 */
export function mmToSizeNumber(mm) {
    // Find matching size from table
    for (const sizeInfo of Config.nailSizeTable) {
        if (mm >= sizeInfo.minMm && mm < sizeInfo.maxMm) {
            return sizeInfo.size;
        }
    }
    
    // Edge cases
    if (mm >= 18) return 0; // Largest
    if (mm < 5) return 11;   // Smallest
    
    // Fallback: approximate
    const approxSize = Math.round(18 - mm);
    return Math.max(0, Math.min(11, approxSize));
}

/**
 * Convert size number to millimeter range
 * @param {number} sizeNumber - Size number (0-11)
 * @returns {Object} { min, max, average }
 */
export function sizeNumberToMm(sizeNumber) {
    const sizeInfo = Config.getSizeInfo(sizeNumber);
    if (sizeInfo) {
        return {
            min: sizeInfo.minMm,
            max: sizeInfo.maxMm,
            average: (sizeInfo.minMm + sizeInfo.maxMm) / 2
        };
    }
    return { min: 7, max: 18, average: 12 }; // Default fallback
}

/**
 * Calculate nail measurements from detection data
 * @param {Object} handData - Hand detection result with nails array
 * @param {Object} referenceData - Reference object detection with pixelsPerMm
 * @returns {Array} Array of measurements: [{ finger, mm, size, confidence }]
 */
export function calculateNailSizes(handData, referenceData) {
    if (!handData || !handData.nails || !referenceData) {
        throw new Error('Invalid input: missing hand or reference data');
    }
    
    const { pixelsPerMm } = referenceData;
    
    // Validate scale is reasonable
    if (!Config.isValidScale(pixelsPerMm)) {
        throw new Error(`Invalid scale: ${pixelsPerMm} pixels/mm (expected ${Config.measurement.validation.minPixelsPerMm}-${Config.measurement.validation.maxPixelsPerMm})`);
    }
    
    const measurements = handData.nails.map(nail => {
        // Convert pixels to millimeters
        const widthMm = nail.width.pixels / pixelsPerMm;
        
        // Validate measurement
        if (!Config.isValidMeasurement(widthMm)) {
            console.warn(`⚠️ ${nail.finger} measurement out of range: ${widthMm}mm`);
        }
        
        // Convert to size number
        const sizeNumber = mmToSizeNumber(widthMm);
        
        // Round mm to 1 decimal place
        const mmRounded = Math.round(widthMm * 10) / 10;
        
        if (Config.debug.logMeasurements) {
            console.log(`📏 ${nail.finger}: ${nail.width.pixels}px → ${mmRounded}mm → Size ${sizeNumber}`);
        }
        
        return {
            finger: nail.finger,
            mm: mmRounded,
            size: sizeNumber,
            confidence: handData.confidence || 0.8
        };
    });
    
    return measurements;
}

/**
 * Validate measurements are reasonable
 * @param {Array} measurements - Array of measurement objects
 * @returns {Object} { valid: boolean, issues: [] }
 */
export function validateMeasurements(measurements) {
    const issues = [];
    
    if (!measurements || measurements.length !== 5) {
        issues.push('Expected 5 nail measurements');
        return { valid: false, issues };
    }
    
    measurements.forEach(m => {
        // Check if measurement is in valid range
        if (!Config.isValidMeasurement(m.mm)) {
            issues.push(`${m.finger}: ${m.mm}mm is outside valid range (${Config.measurement.validation.minNailMm}-${Config.measurement.validation.maxNailMm}mm)`);
        }
        
        // Check if size matches typical range for finger
        const fingerType = m.finger.toLowerCase();
        const typicalRange = Config.fingers.typicalRanges[fingerType];
        if (typicalRange && (m.size < typicalRange.minSize - 2 || m.size > typicalRange.maxSize + 2)) {
            issues.push(`${m.finger}: Size ${m.size} seems unusual for this finger (typical: ${typicalRange.minSize}-${typicalRange.maxSize})`);
        }
    });
    
    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Format measurements as text for sharing
 * @param {Object} measurements - { left: [], right: [] }
 * @returns {string} Formatted text
 */
export function formatMeasurementsForSharing(measurements) {
    let text = '📏 My Nail Sizes (SizeKit)\n\n';
    
    text += 'LEFT HAND\n';
    measurements.left.forEach(nail => {
        text += `${nail.finger}: Size ${nail.size} (${nail.mm}mm)\n`;
    });
    
    text += '\nRIGHT HAND\n';
    measurements.right.forEach(nail => {
        text += `${nail.finger}: Size ${nail.size} (${nail.mm}mm)\n`;
    });
    
    text += '\nMeasured with SizeKit 💅';
    
    return text;
}

/**
 * Get summary statistics from measurements
 * @param {Array} measurements - Array of measurement objects  
 * @returns {Object} Statistics
 */
export function getMeasurementStats(measurements) {
    const mms = measurements.map(m => m.mm);
    const sizes = measurements.map(m => m.size);
    
    return {
        avgMm: mms.reduce((a, b) => a + b, 0) / mms.length,
        minMm: Math.min(...mms),
        maxMm: Math.max(...mms),
        avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
        range: Math.max(...sizes) - Math.min(...sizes)
    };
}
