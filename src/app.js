/**
 * SizeKit Main App Orchestrator
 * Coordinates the entire workflow
 */

import { Config } from './config.js';
import { AppState } from './state.js';
import { Camera } from './camera.js';
import { UI } from './ui.js';
import { calculateNailSizes, validateMeasurements, formatMeasurementsForSharing } from './measurements.js';

// Detection module will be loaded from global scope (uses TensorFlow.js)
// Access via window.SizeKitDetection

export const App = {
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 SizeKit Starting...');
        
        // Initialize modules
        UI.init();
        Camera.init(document.getElementById('camera-preview-capture'));
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ SizeKit Ready!');
        console.log('💡 Debug: AppState.getState() to inspect state');
    },
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Landing screen
        document.getElementById('start-measurement-btn').addEventListener('click', () => {
            this.startMeasurementFlow();
        });
        
        // Instructions screen
        document.getElementById('begin-btn').addEventListener('click', async () => {
            await this.beginPhotoCapture();
        });
        
        document.getElementById('back-to-home-btn').addEventListener('click', () => {
            UI.showScreen('landing');
        });
        
        // Capture screen
        document.getElementById('capture-photo-btn').addEventListener('click', () => {
            this.capturePhoto();
        });
        
        document.getElementById('cancel-capture-btn').addEventListener('click', () => {
            Camera.stop();
            UI.showScreen('instructions');
        });
        
        // Results screen
        document.getElementById('share-results-btn').addEventListener('click', () => {
            this.shareResults();
        });
        
        document.getElementById('retake-btn').addEventListener('click', async () => {
            this.retakePhotos();
        });
        
        // Error screen
        document.getElementById('retry-btn').addEventListener('click', () => {
            AppState.reset();
            UI.showScreen('landing');
        });
        
        document.getElementById('back-btn').addEventListener('click', () => {
            AppState.reset();
            UI.showScreen('landing');
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            Camera.stop();
        });
        
        console.log('✅ Event listeners registered');
    },
    
    /**
     * Start the measurement workflow
     */
    startMeasurementFlow() {
        console.log('📋 Starting measurement flow');
        UI.showScreen('instructions');
    },
    
    /**
     * Begin photo capture process
     */
    async beginPhotoCapture() {
        console.log('📸 Beginning photo capture');
        
        // Preload AI models
        const beginBtn = document.getElementById('begin-btn');
        try {
            beginBtn.disabled = true;
            beginBtn.textContent = 'Loading AI...';
            
            await window.SizeKitDetection.loadHandposeModel();
            console.log('✅ AI models loaded');
            
        } catch (error) {
            console.error('Failed to load AI models:', error);
        } finally {
            beginBtn.disabled = false;
            beginBtn.textContent = "I'm Ready";
        }
        
        // Reset to left hand
        AppState.currentHand = 'left';
        UI.updateCaptureInstructions();
        
        // Start camera
        UI.showScreen('capture');
        await Camera.start();
    },
    
    /**
     * Capture photo for current hand
     */
    async capturePhoto() {
        const hand = AppState.currentHand;
        console.log(`📸 Capturing ${hand} hand...`);
        
        UI.showCaptureLoading(true);
        
        try {
            // Capture the photo
            const photoData = await Camera.capture();
            
            // Store in state
            AppState.setPhoto(hand, photoData);
            
            // Brief pause for UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            UI.showCaptureLoading(false);
            
            // Check if we need to capture other hand
            if (hand === 'left') {
                // Switch to right hand
                AppState.currentHand = 'right';
                UI.updateCaptureInstructions();
                console.log('➡️ Ready for right hand');
            } else {
                // Both hands captured, process them
                console.log('✅ Both hands captured, processing...');
                Camera.stop();
                await this.processMeasurements();
            }
            
        } catch (error) {
            console.error('❌ Capture failed:', error);
            UI.showCaptureLoading(false);
            UI.showError('Failed to capture photo. Please try again.');
        }
    },
    
    /**
     * Process both photos and generate measurements
     */
    async processMeasurements() {
        UI.showScreen('processing');
        
        try {
            // === STEP 1: Detect Reference Objects ===
            UI.updateProcessingStep('reference', 'active');
            UI.updateProcessingStatus(Config.messages.processing.reference);
            
            // Detect left hand reference
            const leftReference = await window.SizeKitDetection.detectReferenceObject(
                AppState.photos.left
            );
            AppState.setDetection('left', 'reference', leftReference);
            
            // Detect right hand reference
            const rightReference = await window.SizeKitDetection.detectReferenceObject(
                AppState.photos.right
            );
            AppState.setDetection('right', 'reference', rightReference);
            
            UI.updateProcessingStep('reference', 'complete');
            
            // === STEP 2: Detect Hands and Nails ===
            UI.updateProcessingStep('hand', 'active');
            UI.updateProcessingStatus(Config.messages.processing.hand);
            
            // Detect left hand
            const leftHand = await window.SizeKitDetection.detectHandAndNails(
                AppState.photos.left,
                leftReference
            );
            AppState.setDetection('left', 'hand', leftHand);
            
            // Detect right hand
            const rightHand = await window.SizeKitDetection.detectHandAndNails(
                AppState.photos.right,
                rightReference
            );
            AppState.setDetection('right', 'hand', rightHand);
            
            UI.updateProcessingStep('hand', 'complete');
            
            // === STEP 3: Calculate Measurements ===
            UI.updateProcessingStep('nails', 'active');
            UI.updateProcessingStatus(Config.messages.processing.measurement);
            
            // Calculate left hand measurements
            const leftMeasurements = calculateNailSizes(leftHand, leftReference);
            AppState.setMeasurements('left', leftMeasurements);
            
            // Calculate right hand measurements
            const rightMeasurements = calculateNailSizes(rightHand, rightReference);
            AppState.setMeasurements('right', rightMeasurements);
            
            UI.updateProcessingStep('nails', 'complete');
            
            // === Validate and Display Results ===
            const leftValidation = validateMeasurements(leftMeasurements);
            const rightValidation = validateMeasurements(rightMeasurements);
            
            if (!leftValidation.valid || !rightValidation.valid) {
                console.warn('⚠️ Validation warnings:');
                leftValidation.issues.forEach(issue => console.warn(`  Left: ${issue}`));
                rightValidation.issues.forEach(issue => console.warn(`  Right: ${issue}`));
            }
            
            // Display results
            UI.displayResults({
                left: leftMeasurements,
                right: rightMeasurements
            });
            
            console.log('✅ Processing complete!');
            
        } catch (error) {
            console.error('❌ Processing failed:', error);
            UI.showError(error.message || Config.messages.errors.measurementFailed);
        }
    },
    
    /**
     * Share measurement results
     */
    async shareResults() {
        const text = formatMeasurementsForSharing(AppState.measurements);
        
        // Try Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Nail Sizes',
                    text: text
                });
                console.log('✅ Results shared');
                return;
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // User cancelled
                }
                console.warn('Share API failed, falling back to clipboard');
            }
        }
        
        // Fallback: copy to clipboard
        this.copyToClipboard(text);
    },
    
    /**
     * Copy text to clipboard
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Results copied to clipboard!');
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    },
    
    /**
     * Fallback clipboard copy for older browsers
     */
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Results copied to clipboard!');
    },
    
    /**
     * Retake photos
     */
    async retakePhotos() {
        console.log('🔄 Retaking photos...');
        AppState.currentHand = 'left';
        AppState.photos = { left: null, right: null };
        AppState.detection = {
            left: { reference: null, hand: null },
            right: { reference: null, hand: null }
        };
        AppState.measurements = { left: null, right: null };
        
        UI.updateCaptureInstructions();
        UI.showScreen('capture');
        await Camera.start();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
