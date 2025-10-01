/**
 * SizeKit Camera Controller
 * Handles camera access, streaming, and photo capture
 */

import { Config } from './config.js';
import { AppState } from './state.js';

export const Camera = {
    videoElement: null,
    
    /**
     * Initialize camera module with video element
     * @param {HTMLVideoElement} videoEl - Video element for preview
     */
    init(videoEl) {
        this.videoElement = videoEl;
        console.log('📷 Camera module initialized');
    },
    
    /**
     * Start camera stream
     * @returns {Promise<MediaStream>}
     */
    async start() {
        try {
            console.log('📷 Starting camera...');
            
            // Try primary constraints (exact back camera)
            const stream = await navigator.mediaDevices.getUserMedia(Config.camera.primary);
            
            AppState.cameraStream = stream;
            this.videoElement.srcObject = stream;
            
            console.log('✅ Camera started successfully');
            return stream;
            
        } catch (primaryError) {
            console.warn('⚠️ Primary camera constraint failed, trying fallback...', primaryError.name);
            
            // Try fallback constraints
            try {
                const stream = await navigator.mediaDevices.getUserMedia(Config.camera.fallback);
                
                AppState.cameraStream = stream;
                this.videoElement.srcObject = stream;
                
                console.log('✅ Camera started with fallback constraints');
                return stream;
                
            } catch (fallbackError) {
                console.error('❌ Camera access failed:', fallbackError);
                throw new Error(Config.messages.errors.noCamera);
            }
        }
    },
    
    /**
     * Stop camera stream
     */
    stop() {
        if (AppState.cameraStream) {
            console.log('📷 Stopping camera...');
            
            AppState.cameraStream.getTracks().forEach(track => {
                track.stop();
                console.log(`  Stopped ${track.kind} track`);
            });
            
            AppState.cameraStream = null;
            this.videoElement.srcObject = null;
            
            console.log('✅ Camera stopped');
        }
    },
    
    /**
     * Capture photo from current video stream
     * @returns {Promise<Object>} Photo data: { blob, dataUrl, width, height }
     */
    async capture() {
        if (!this.videoElement || !AppState.cameraStream) {
            throw new Error('Camera not active');
        }
        
        console.log('📸 Capturing photo...');
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        // Draw current frame
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob and data URL
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, Config.camera.photoFormat, Config.camera.photoQuality);
        });
        
        const dataUrl = canvas.toDataURL(Config.camera.photoFormat, Config.camera.photoQuality);
        
        const photoData = {
            blob,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
            timestamp: Date.now()
        };
        
        console.log(`✅ Photo captured: ${photoData.width}x${photoData.height}`);
        
        return photoData;
    },
    
    /**
     * Check if camera is currently active
     * @returns {boolean}
     */
    isActive() {
        return !!AppState.cameraStream;
    }
};
