/**
 * SizeKit Phase 1: Back Camera Access
 * Handles camera initialization, stream management, and error handling
 */

// ============================================
// STATE MANAGEMENT
// ============================================
let currentStream = null;
let cameraActive = false;

// ============================================
// DOM ELEMENTS
// ============================================
const landingScreen = document.getElementById('landing-screen');
const cameraScreen = document.getElementById('camera-screen');
const errorScreen = document.getElementById('error-screen');
const openCameraBtn = document.getElementById('open-camera-btn');
const closeCameraBtn = document.getElementById('close-camera-btn');
const retryBtn = document.getElementById('retry-btn');
const backBtn = document.getElementById('back-btn');
const cameraPreview = document.getElementById('camera-preview');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');

// ============================================
// CAMERA CONSTRAINTS
// ============================================
const primaryConstraints = {
    video: {
        facingMode: { exact: "environment" }, // Force back camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
    },
    audio: false
};

const fallbackConstraints = {
    video: {
        facingMode: "environment", // Try back camera, allow fallback
        width: { ideal: 1920 },
        height: { ideal: 1080 }
    },
    audio: false
};

// ============================================
// SCREEN NAVIGATION
// ============================================
function showScreen(screen) {
    landingScreen.classList.remove('active');
    cameraScreen.classList.remove('active');
    errorScreen.classList.remove('active');
    screen.classList.add('active');
}

function showError(message) {
    errorMessage.textContent = message;
    showScreen(errorScreen);
}

// ============================================
// CAMERA FUNCTIONS
// ============================================

/**
 * Initialize camera with back-facing camera
 * Uses primary constraints with fallback if exact facingMode fails
 */
async function initializeCamera() {
    // Check if browser supports camera API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Your browser does not support camera access. Please use a modern browser like Chrome, Safari, or Firefox.');
        return;
    }

    // Show camera screen with loading indicator
    showScreen(cameraScreen);
    loadingIndicator.classList.remove('hidden');

    try {
        // Try to get back camera with exact constraint
        console.log('Attempting to access back camera with exact constraint...');
        currentStream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        console.log('✓ Back camera accessed successfully!');
        
        attachStreamToVideo(currentStream);
        
    } catch (primaryError) {
        console.log('Primary constraint failed, trying fallback...', primaryError.name);
        
        // If exact constraint fails, try fallback
        try {
            currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            console.log('✓ Camera accessed with fallback constraint');
            
            attachStreamToVideo(currentStream);
            
        } catch (fallbackError) {
            console.error('Both camera attempts failed:', fallbackError);
            handleCameraError(fallbackError);
        }
    }
}

/**
 * Attach the media stream to the video element
 */
function attachStreamToVideo(stream) {
    cameraPreview.srcObject = stream;
    cameraActive = true;
    
    // Hide loading indicator once video starts playing
    cameraPreview.addEventListener('loadedmetadata', () => {
        loadingIndicator.classList.add('hidden');
        console.log('Video stream loaded and playing');
    }, { once: true });

    // Handle video play errors
    cameraPreview.play().catch(err => {
        console.error('Error playing video:', err);
        showError('Failed to display camera feed. Please try again.');
        stopCamera();
    });
}

/**
 * Handle camera errors with user-friendly messages
 */
function handleCameraError(error) {
    stopCamera();
    
    let userMessage = '';
    
    switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            userMessage = 'Camera access was denied. To use this feature, please:\n\n' +
                         '1. Go to your browser settings\n' +
                         '2. Find site permissions for this website\n' +
                         '3. Allow camera access\n' +
                         '4. Refresh and try again';
            break;
            
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            userMessage = 'No camera found on your device. Please ensure:\n\n' +
                         '1. Your device has a camera\n' +
                         '2. No other app is using the camera\n' +
                         '3. Camera access is enabled in system settings';
            break;
            
        case 'NotReadableError':
        case 'TrackStartError':
            userMessage = 'Camera is already in use by another application. Please:\n\n' +
                         '1. Close other apps using the camera\n' +
                         '2. Try again';
            break;
            
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            userMessage = 'Your device does not support the required camera settings. This may happen on:\n\n' +
                         '1. Older devices\n' +
                         '2. Devices without a back camera\n' +
                         '\nPlease try on a different device.';
            break;
            
        case 'TypeError':
            userMessage = 'Camera access must be done over HTTPS. Please ensure:\n\n' +
                         '1. You are accessing this page via HTTPS (https://)\n' +
                         '2. Not using http:// or file://';
            break;
            
        case 'SecurityError':
            userMessage = 'Camera access blocked for security reasons. Please ensure:\n\n' +
                         '1. You are accessing via HTTPS\n' +
                         '2. The page has proper permissions\n' +
                         '3. Try refreshing the page';
            break;
            
        default:
            userMessage = `Camera access failed: ${error.message}\n\n` +
                         'Please ensure:\n' +
                         '1. You are using HTTPS\n' +
                         '2. Camera permissions are enabled\n' +
                         '3. No other app is using the camera';
    }
    
    showError(userMessage);
}

/**
 * Stop camera stream and cleanup
 */
function stopCamera() {
    if (currentStream) {
        console.log('Stopping camera stream...');
        currentStream.getTracks().forEach(track => {
            track.stop();
            console.log('Track stopped:', track.kind);
        });
        currentStream = null;
    }
    
    if (cameraPreview.srcObject) {
        cameraPreview.srcObject = null;
    }
    
    cameraActive = false;
    loadingIndicator.classList.add('hidden');
}

/**
 * Close camera and return to landing screen
 */
function closeCamera() {
    stopCamera();
    showScreen(landingScreen);
}

// ============================================
// EVENT LISTENERS
// ============================================

// Open camera button
openCameraBtn.addEventListener('click', () => {
    console.log('User requested camera access');
    initializeCamera();
});

// Close camera button
closeCameraBtn.addEventListener('click', () => {
    console.log('User closed camera');
    closeCamera();
});

// Retry button (from error screen)
retryBtn.addEventListener('click', () => {
    console.log('User retrying camera access');
    initializeCamera();
});

// Back button (from error screen)
backBtn.addEventListener('click', () => {
    console.log('User going back to landing');
    showScreen(landingScreen);
});

// Handle page visibility changes (cleanup when user leaves page)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && cameraActive) {
        console.log('Page hidden, stopping camera');
        stopCamera();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (cameraActive) {
        stopCamera();
    }
});

// Handle orientation changes (common on mobile)
window.addEventListener('orientationchange', () => {
    console.log('Orientation changed');
    // Camera stream typically continues working, but log for debugging
});

// ============================================
// INITIALIZATION
// ============================================
console.log('SizeKit Camera Module Loaded');
console.log('Device:', navigator.userAgent);
console.log('HTTPS:', window.location.protocol === 'https:');

// Debug: Log available devices (helps with troubleshooting)
if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const cameras = devices.filter(device => device.kind === 'videoinput');
            console.log(`Found ${cameras.length} camera(s)`);
            cameras.forEach((camera, index) => {
                console.log(`Camera ${index + 1}:`, camera.label || 'Unknown camera');
            });
        })
        .catch(err => {
            console.log('Could not enumerate devices:', err);
        });
}
