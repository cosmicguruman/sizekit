/**
 * SizeKit State Management
 * Single source of truth for all application state
 */

export const AppState = {
    // Current workflow state
    currentScreen: 'landing',
    currentHand: 'left', // 'left' or 'right'
    
    // Camera
    cameraStream: null,
    
    // Photos
    photos: {
        left: null,  // { blob, dataUrl, width, height }
        right: null
    },
    
    // Detection results
    detection: {
        left: {
            reference: null,  // { type, pixelsPerMm, confidence, boundingBox }
            hand: null,       // { keypoints, nails, confidence }
        },
        right: {
            reference: null,
            hand: null
        }
    },
    
    // Final measurements
    measurements: {
        left: null,  // Array of { finger, mm, size, confidence }
        right: null
    },
    
    // Get all state (for debugging)
    getState() {
        return {
            currentScreen: this.currentScreen,
            currentHand: this.currentHand,
            hasLeftPhoto: !!this.photos.left,
            hasRightPhoto: !!this.photos.right,
            leftDetection: !!this.detection.left.reference,
            rightDetection: !!this.detection.right.reference,
            hasMeasurements: !!this.measurements.left
        };
    },
    
    // Reset state
    reset() {
        this.currentScreen = 'landing';
        this.currentHand = 'left';
        this.cameraStream = null;
        this.photos = { left: null, right: null };
        this.detection = {
            left: { reference: null, hand: null },
            right: { reference: null, hand: null }
        };
        this.measurements = { left: null, right: null };
    },
    
    // Store photo
    setPhoto(hand, photoData) {
        this.photos[hand] = photoData;
        console.log(`📸 ${hand} hand photo stored:`, photoData.width, 'x', photoData.height);
    },
    
    // Store detection results
    setDetection(hand, type, data) {
        this.detection[hand][type] = data;
        console.log(`🔍 ${hand} hand ${type} detection:`, data);
    },
    
    // Store measurements
    setMeasurements(hand, measurements) {
        this.measurements[hand] = measurements;
        console.log(`📏 ${hand} hand measurements:`, measurements);
    },
    
    // Get photo for current hand
    getCurrentPhoto() {
        return this.photos[this.currentHand];
    },
    
    // Check if we have both photos
    hasBothPhotos() {
        return this.photos.left && this.photos.right;
    },
    
    // Check if processing is complete
    isProcessingComplete() {
        return this.measurements.left && this.measurements.right;
    }
};

// Make state inspectable in console for debugging
if (typeof window !== 'undefined') {
    window.AppState = AppState;
    console.log('💡 Debug tip: Type "AppState.getState()" in console to inspect state');
}
