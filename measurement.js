/**
 * SizeKit Phase 2: Nail Measurement System
 * Handles photo capture, reference object detection, and nail size calculation
 */

// ============================================
// STATE MANAGEMENT
// ============================================
let measurementState = {
    currentHand: 'left', // 'left' or 'right'
    leftHandPhoto: null,
    rightHandPhoto: null,
    cameraStream: null,
    measurements: {
        left: null,
        right: null
    }
};

// ============================================
// DOM ELEMENTS
// ============================================
const screens = {
    landing: document.getElementById('landing-screen'),
    instructions: document.getElementById('instructions-screen'),
    capture: document.getElementById('capture-screen'),
    processing: document.getElementById('processing-screen'),
    results: document.getElementById('results-screen'),
    error: document.getElementById('error-screen')
};

const elements = {
    startBtn: document.getElementById('start-measurement-btn'),
    beginBtn: document.getElementById('begin-btn'),
    backToHomeBtn: document.getElementById('back-to-home-btn'),
    captureBtn: document.getElementById('capture-photo-btn'),
    cancelCaptureBtn: document.getElementById('cancel-capture-btn'),
    retakeBtn: document.getElementById('retake-btn'),
    shareResultsBtn: document.getElementById('share-results-btn'),
    
    cameraPreview: document.getElementById('camera-preview-capture'),
    captureInstruction: document.getElementById('capture-instruction'),
    captureHint: document.getElementById('capture-hint'),
    captureLoading: document.getElementById('capture-loading'),
    
    processingStatus: document.getElementById('processing-status'),
    stepReference: document.getElementById('step-reference'),
    stepHand: document.getElementById('step-hand'),
    stepNails: document.getElementById('step-nails'),
    
    leftHandSizes: document.getElementById('left-hand-sizes'),
    rightHandSizes: document.getElementById('right-hand-sizes'),
    
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    backBtn: document.getElementById('back-btn')
};

// ============================================
// SCREEN NAVIGATION
// ============================================
function showScreen(screen) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showScreen(screens.error);
}

// ============================================
// CAMERA MANAGEMENT
// ============================================
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: { exact: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        measurementState.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = measurementState.cameraStream;
        
        console.log('✓ Camera started for measurement');
        
    } catch (error) {
        console.error('Camera error:', error);
        
        // Try fallback
        try {
            const fallbackConstraints = {
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            
            measurementState.cameraStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            elements.cameraPreview.srcObject = measurementState.cameraStream;
            
        } catch (fallbackError) {
            showError('Could not access camera. Please ensure camera permissions are enabled and try again.');
        }
    }
}

function stopCamera() {
    if (measurementState.cameraStream) {
        measurementState.cameraStream.getTracks().forEach(track => track.stop());
        measurementState.cameraStream = null;
        elements.cameraPreview.srcObject = null;
        console.log('Camera stopped');
    }
}

// ============================================
// PHOTO CAPTURE
// ============================================
function capturePhoto() {
    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    const video = elements.cameraPreview;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve({
                blob: blob,
                dataUrl: canvas.toDataURL('image/jpeg', 0.95),
                width: canvas.width,
                height: canvas.height
            });
        }, 'image/jpeg', 0.95);
    });
}

async function handleCapture() {
    console.log(`Capturing ${measurementState.currentHand} hand...`);
    
    // Show loading
    elements.captureLoading.classList.remove('hidden');
    elements.captureBtn.disabled = true;
    
    try {
        // Capture the photo
        const photo = await capturePhoto();
        
        // Store the photo
        if (measurementState.currentHand === 'left') {
            measurementState.leftHandPhoto = photo;
        } else {
            measurementState.rightHandPhoto = photo;
        }
        
        console.log(`✓ ${measurementState.currentHand} hand photo captured`);
        
        // Quick validation (placeholder for now)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Hide loading
        elements.captureLoading.classList.add('hidden');
        elements.captureBtn.disabled = false;
        
        // Move to next step
        if (measurementState.currentHand === 'left') {
            // Captured left, now do right
            measurementState.currentHand = 'right';
            updateCaptureInstructions();
        } else {
            // Both hands captured, process them
            stopCamera();
            await processMeasurements();
        }
        
    } catch (error) {
        console.error('Capture error:', error);
        elements.captureLoading.classList.add('hidden');
        elements.captureBtn.disabled = false;
        showError('Failed to capture photo. Please try again.');
    }
}

function updateCaptureInstructions() {
    if (measurementState.currentHand === 'left') {
        elements.captureInstruction.textContent = 'Place LEFT hand with reference object';
        elements.captureHint.textContent = 'Credit card or quarter next to hand';
    } else {
        elements.captureInstruction.textContent = 'Place RIGHT hand with reference object';
        elements.captureHint.textContent = 'Credit card or quarter next to hand';
    }
}

// ============================================
// MEASUREMENT PROCESSING
// ============================================
async function processMeasurements() {
    showScreen(screens.processing);
    
    try {
        // Step 1: Detect reference object
        updateProcessingStep('reference', 'active');
        elements.processingStatus.textContent = 'Detecting reference object...';
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // TODO: Actual reference detection
        const referenceDetected = await detectReferenceObject(measurementState.leftHandPhoto);
        
        updateProcessingStep('reference', 'complete');
        
        // Step 2: Detect hand
        updateProcessingStep('hand', 'active');
        elements.processingStatus.textContent = 'Detecting hands and nails...';
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // TODO: Actual hand detection
        const handsDetected = await detectHands();
        
        updateProcessingStep('hand', 'complete');
        
        // Step 3: Measure nails
        updateProcessingStep('nails', 'active');
        elements.processingStatus.textContent = 'Measuring nail sizes...';
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // TODO: Actual measurement
        const measurements = await measureNails();
        
        updateProcessingStep('nails', 'complete');
        
        // Store and display results
        measurementState.measurements = measurements;
        displayResults(measurements);
        
    } catch (error) {
        console.error('Processing error:', error);
        showError('Failed to process measurements. Please ensure your hand and reference object are clearly visible and try again.');
    }
}

function updateProcessingStep(step, status) {
    const stepElement = elements[`step${step.charAt(0).toUpperCase() + step.slice(1)}`];
    
    stepElement.classList.remove('active');
    if (status === 'active') {
        stepElement.classList.add('active');
    } else if (status === 'complete') {
        stepElement.classList.add('complete');
    }
}

// ============================================
// AI DETECTION FUNCTIONS (Placeholders)
// ============================================
async function detectReferenceObject(photo) {
    // TODO: Implement reference object detection
    // - Detect credit card (85.6mm x 53.98mm)
    // - Detect quarter (24.26mm diameter)
    // - Calculate pixel-to-mm ratio
    
    console.log('TODO: Detect reference object');
    return {
        type: 'credit_card', // or 'quarter'
        pixelsPerMm: 5.0, // placeholder
        confidence: 0.95
    };
}

async function detectHands() {
    // TODO: Implement hand detection
    // - Use MediaPipe Hands or TensorFlow.js
    // - Detect all 5 fingers per hand
    // - Identify nail locations
    
    console.log('TODO: Detect hands');
    return {
        left: { detected: true, nails: 5 },
        right: { detected: true, nails: 5 }
    };
}

async function measureNails() {
    // TODO: Implement nail measurement
    // - Measure nail width at widest point
    // - Convert pixels to mm using reference scale
    // - Convert mm to size numbers (0-9)
    
    console.log('TODO: Measure nails');
    
    // Placeholder data for testing UI
    return {
        left: [
            { finger: 'Thumb', mm: 15.5, size: 1 },
            { finger: 'Index', mm: 11.2, size: 5 },
            { finger: 'Middle', mm: 12.1, size: 4 },
            { finger: 'Ring', mm: 10.3, size: 6 },
            { finger: 'Pinky', mm: 8.1, size: 9 }
        ],
        right: [
            { finger: 'Thumb', mm: 15.3, size: 1 },
            { finger: 'Index', mm: 11.4, size: 5 },
            { finger: 'Middle', mm: 12.0, size: 4 },
            { finger: 'Ring', mm: 10.5, size: 6 },
            { finger: 'Pinky', mm: 8.3, size: 9 }
        ]
    };
}

// ============================================
// RESULTS DISPLAY
// ============================================
function displayResults(measurements) {
    // Display left hand
    elements.leftHandSizes.innerHTML = '';
    measurements.left.forEach(nail => {
        const nailDiv = document.createElement('div');
        nailDiv.className = 'nail-result';
        nailDiv.innerHTML = `
            <span class="nail-name">${nail.finger}</span>
            <span>
                <span class="nail-size">Size ${nail.size}</span>
                <span class="nail-mm">(${nail.mm}mm)</span>
            </span>
        `;
        elements.leftHandSizes.appendChild(nailDiv);
    });
    
    // Display right hand
    elements.rightHandSizes.innerHTML = '';
    measurements.right.forEach(nail => {
        const nailDiv = document.createElement('div');
        nailDiv.className = 'nail-result';
        nailDiv.innerHTML = `
            <span class="nail-name">${nail.finger}</span>
            <span>
                <span class="nail-size">Size ${nail.size}</span>
                <span class="nail-mm">(${nail.mm}mm)</span>
            </span>
        `;
        elements.rightHandSizes.appendChild(nailDiv);
    });
    
    showScreen(screens.results);
}

// ============================================
// SHARE FUNCTIONALITY
// ============================================
async function shareResults() {
    const measurements = measurementState.measurements;
    
    // Format results as text
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
    
    // Try Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Nail Sizes',
                text: text
            });
            console.log('✓ Results shared');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share error:', error);
                copyToClipboard(text);
            }
        }
    } else {
        // Fallback: copy to clipboard
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Results copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Results copied to clipboard!');
}

// ============================================
// RESET FUNCTIONALITY
// ============================================
function resetMeasurement() {
    measurementState = {
        currentHand: 'left',
        leftHandPhoto: null,
        rightHandPhoto: null,
        cameraStream: null,
        measurements: {
            left: null,
            right: null
        }
    };
    
    updateCaptureInstructions();
    stopCamera();
    showScreen(screens.landing);
}

// ============================================
// EVENT LISTENERS
// ============================================
elements.startBtn.addEventListener('click', () => {
    console.log('Starting measurement flow');
    showScreen(screens.instructions);
});

elements.backToHomeBtn.addEventListener('click', () => {
    showScreen(screens.landing);
});

elements.beginBtn.addEventListener('click', async () => {
    console.log('Beginning photo capture');
    measurementState.currentHand = 'left';
    updateCaptureInstructions();
    showScreen(screens.capture);
    await startCamera();
});

elements.captureBtn.addEventListener('click', handleCapture);

elements.cancelCaptureBtn.addEventListener('click', () => {
    stopCamera();
    showScreen(screens.instructions);
});

elements.retakeBtn.addEventListener('click', async () => {
    measurementState.currentHand = 'left';
    measurementState.leftHandPhoto = null;
    measurementState.rightHandPhoto = null;
    updateCaptureInstructions();
    showScreen(screens.capture);
    await startCamera();
});

elements.shareResultsBtn.addEventListener('click', shareResults);

elements.retryBtn.addEventListener('click', () => {
    resetMeasurement();
});

elements.backBtn.addEventListener('click', () => {
    resetMeasurement();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// ============================================
// INITIALIZATION
// ============================================
console.log('SizeKit Measurement Module Loaded');
console.log('Ready to measure nails!');
