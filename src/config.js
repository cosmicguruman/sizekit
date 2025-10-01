/**
 * SizeKit Configuration
 * All constants, specs, and calibration values in one place
 */

export const Config = {
    // ============================================
    // REFERENCE OBJECTS
    // ============================================
    referenceObjects: {
        creditCard: {
            name: 'Credit Card',
            widthMm: 85.6,
            heightMm: 53.98,
            aspectRatio: 1.586, // 85.6 / 53.98
            toleranceRatio: 0.15 // 15% tolerance for detection
        },
        quarter: {
            name: 'US Quarter',
            diameterMm: 24.26,
            aspectRatio: 1.0, // circular
            toleranceRatio: 0.10 // 10% tolerance
        }
    },

    // ============================================
    // NAIL SIZE TABLE (mm to size number)
    // ============================================
    nailSizeTable: [
        { size: 0, minMm: 16.0, maxMm: 18.0, typical: 'Large thumbs' },
        { size: 1, minMm: 15.0, maxMm: 16.0, typical: 'Standard thumbs' },
        { size: 2, minMm: 14.0, maxMm: 15.0, typical: 'Large index/thumbs' },
        { size: 3, minMm: 13.0, maxMm: 14.0, typical: 'Index finger' },
        { size: 4, minMm: 12.0, maxMm: 13.0, typical: 'Index/middle finger' },
        { size: 5, minMm: 11.0, maxMm: 12.0, typical: 'Middle finger' },
        { size: 6, minMm: 10.0, maxMm: 11.0, typical: 'Middle/ring finger' },
        { size: 7, minMm: 9.0, maxMm: 10.0, typical: 'Ring finger' },
        { size: 8, minMm: 8.0, maxMm: 9.0, typical: 'Ring/pinky finger' },
        { size: 9, minMm: 7.0, maxMm: 8.0, typical: 'Pinky finger' },
        { size: 10, minMm: 6.0, maxMm: 7.0, typical: 'Small pinky' },
        { size: 11, minMm: 5.0, maxMm: 6.0, typical: 'Very small pinky' }
    ],

    // ============================================
    // FINGER CONFIGURATION
    // ============================================
    fingers: {
        names: ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'],
        
        // MediaPipe hand landmark indices
        landmarks: {
            thumbTip: 4,
            indexTip: 8,
            middleTip: 12,
            ringTip: 16,
            pinkyTip: 20
        },
        
        tipIndices: [4, 8, 12, 16, 20],
        
        // Typical size ranges by finger
        typicalRanges: {
            thumb: { minSize: 0, maxSize: 2 },
            index: { minSize: 3, maxSize: 5 },
            middle: { minSize: 4, maxSize: 6 },
            ring: { minSize: 6, maxSize: 8 },
            pinky: { minSize: 8, maxSize: 11 }
        }
    },

    // ============================================
    // CAMERA SETTINGS
    // ============================================
    camera: {
        // Primary constraints (back camera)
        primary: {
            video: {
                facingMode: { exact: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        },
        
        // Fallback constraints
        fallback: {
            video: {
                facingMode: "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        },
        
        // Photo quality
        photoQuality: 0.95, // JPEG quality (0-1)
        photoFormat: 'image/jpeg'
    },

    // ============================================
    // MEASUREMENT SETTINGS
    // ============================================
    measurement: {
        // Minimum confidence scores to accept results
        minConfidence: {
            reference: 0.6,  // Reference object detection
            hand: 0.5,       // Hand detection
            overall: 0.7     // Overall measurement confidence
        },
        
        // Nail width estimation factor
        // (nail width as fraction of finger segment length)
        nailWidthFactor: 0.45,
        
        // Validation ranges
        validation: {
            minNailMm: 5,   // Smallest realistic nail
            maxNailMm: 20,  // Largest realistic nail
            minPixelsPerMm: 2,  // Sanity check for scale
            maxPixelsPerMm: 50
        }
    },

    // ============================================
    // UI TEXT & MESSAGES
    // ============================================
    messages: {
        instructions: {
            landing: "Measure your nail sizes in seconds using your phone camera",
            whatYouNeed: "What You'll Need",
            items: [
                "📱 Your phone camera",
                "✋ Both hands",
                "💳 A credit card OR 25¢ quarter"
            ],
            steps: [
                "Place your LEFT hand flat on a table",
                "Put credit card or quarter next to your hand",
                "Take a photo from above",
                "Repeat for RIGHT hand",
                "Get your nail sizes instantly!"
            ]
        },
        
        capture: {
            left: {
                title: "Place LEFT hand with reference object",
                hint: "Credit card or quarter next to hand"
            },
            right: {
                title: "Place RIGHT hand with reference object",
                hint: "Credit card or quarter next to hand"
            }
        },
        
        processing: {
            reference: "Detecting reference object...",
            hand: "Detecting hands and nails...",
            measurement: "Measuring nail sizes..."
        },
        
        errors: {
            noCamera: "Could not access camera. Please ensure camera permissions are enabled.",
            noReference: "No reference object detected. Please ensure a credit card or quarter is clearly visible.",
            noHand: "No hand detected. Please ensure your hand is clearly visible and well-lit.",
            measurementFailed: "Failed to process measurements. Please ensure your hand and reference object are clearly visible.",
            invalidMeasurement: "Measurements appear invalid. Please retake photos with better lighting."
        }
    },

    // ============================================
    // DEBUG SETTINGS
    // ============================================
    debug: {
        enabled: true,  // Set to false in production
        logDetection: true,
        logMeasurements: true,
        showConfidenceScores: true
    }
};

// Helper function to get size info by number
Config.getSizeInfo = function(sizeNumber) {
    return this.nailSizeTable.find(s => s.size === sizeNumber);
};

// Helper function to validate measurement
Config.isValidMeasurement = function(mm) {
    return mm >= this.measurement.validation.minNailMm && 
           mm <= this.measurement.validation.maxNailMm;
};

// Helper function to validate scale
Config.isValidScale = function(pixelsPerMm) {
    return pixelsPerMm >= this.measurement.validation.minPixelsPerMm && 
           pixelsPerMm <= this.measurement.validation.maxPixelsPerMm;
};
