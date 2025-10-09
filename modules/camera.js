/**
 * Camera Module
 * Handles camera initialization and management
 */

class Camera {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Initialize camera with video element
     * @param {HTMLVideoElement} videoElement - The video element to use
     * @param {HTMLCanvasElement} canvasElement - Optional canvas for drawing
     * @returns {Promise} Resolves when camera is ready
     */
    async initialize(videoElement, canvasElement = null) {
        this.video = videoElement;
        
        try {
            console.log('Starting camera initialization...');

            // Basic setup
            this.video.setAttribute('autoplay', '');
            this.video.setAttribute('muted', '');
            this.video.setAttribute('playsinline', '');

            // Try different camera configurations
            const constraints = [
                // Try 1: Basic environment camera
                {
                    video: { facingMode: 'environment' }
                },
                // Try 2: Specific resolution
                {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                // Try 3: Fallback to any camera
                {
                    video: true
                }
            ];

            let stream = null;
            let error = null;

            // Try each constraint until one works
            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    console.log('Camera access granted with constraint:', constraint);
                    break;
                } catch (e) {
                    error = e;
                    console.log('Failed with constraint:', constraint, e);
                    continue;
                }
            }

            if (!stream) {
                throw error || new Error('Could not initialize camera with any configuration');
            }

            this.stream = stream;
            this.video.srcObject = stream;

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Video element setup timeout'));
                }, 3000);

                const handleError = (e) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Video setup error: ${e.message}`));
                };

                this.video.onerror = handleError;

                this.video.onloadedmetadata = async () => {
                    try {
                        clearTimeout(timeoutId);
                        await this.video.play();
                        
                        if (canvasElement) {
                            this.canvas = canvasElement;
                            this.ctx = canvasElement.getContext('2d');
                            this.canvas.width = this.video.videoWidth;
                            this.canvas.height = this.video.videoHeight;
                        }
                        
                        // Double check video is actually playing
                        if (this.video.readyState >= 2) {
                            console.log('Video setup complete:', {
                                width: this.video.videoWidth,
                                height: this.video.videoHeight,
                                readyState: this.video.readyState
                            });
                            resolve();
                        } else {
                            reject(new Error('Video not ready after setup'));
                        }
                    } catch (e) {
                        handleError(e);
                    }
                };
            });

            return true;

        } catch (error) {
            console.error('Camera initialization error:', error);
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }

    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    /**
     * Capture current frame
     * @returns {string} Data URL of captured frame
     */
    captureFrame() {
        if (!this.video) {
            throw new Error('Camera not initialized');
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.95);
    }
}

// Export as global for now
window.Camera = Camera;
