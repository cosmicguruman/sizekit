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

// Store reference and hand data for both hands
let leftHandReferenceData = null;
let rightHandReferenceData = null;
let leftHandData = null;
let rightHandData = null;

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
        // Step 1: Detect reference objects in both photos
        updateProcessingStep('reference', 'active');
        elements.processingStatus.textContent = 'Detecting reference objects...';
        
        // Detect reference in left hand photo
        leftHandReferenceData = await SizeKitDetection.detectReferenceObject(measurementState.leftHandPhoto);
        console.log('✓ Left hand reference detected:', leftHandReferenceData);
        
        // Detect reference in right hand photo
        rightHandReferenceData = await SizeKitDetection.detectReferenceObject(measurementState.rightHandPhoto);
        console.log('✓ Right hand reference detected:', rightHandReferenceData);
        
        updateProcessingStep('reference', 'complete');
        
        // Step 2: Detect hands and nails
        updateProcessingStep('hand', 'active');
        elements.processingStatus.textContent = 'Detecting hands and nails...';
        
        // Detect left hand
        leftHandData = await SizeKitDetection.detectHandAndNails(measurementState.leftHandPhoto, leftHandReferenceData);
        console.log('✓ Left hand detected:', leftHandData);
        
        // Detect right hand
        rightHandData = await SizeKitDetection.detectHandAndNails(measurementState.rightHandPhoto, rightHandReferenceData);
        console.log('✓ Right hand detected:', rightHandData);
        
        updateProcessingStep('hand', 'complete');
        
        // Step 3: Measure nails
        updateProcessingStep('nails', 'active');
        elements.processingStatus.textContent = 'Measuring nail sizes...';
        
        // Measure left hand
        const leftMeasurements = SizeKitDetection.measureNails(leftHandData, leftHandReferenceData);
        console.log('✓ Left hand measurements:', leftMeasurements);
        
        // Measure right hand
        const rightMeasurements = SizeKitDetection.measureNails(rightHandData, rightHandReferenceData);
        console.log('✓ Right hand measurements:', rightMeasurements);
        
        const measurements = {
            left: leftMeasurements,
            right: rightMeasurements
        };
        
        updateProcessingStep('nails', 'complete');
        
        // Store and display results
        measurementState.measurements = measurements;
        displayResults(measurements);
        
    } catch (error) {
        console.error('Processing error:', error);
        showError(error.message || 'Failed to process measurements. Please ensure your hand and reference object are clearly visible and try again.');
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
    
    // Reset detection data
    leftHandReferenceData = null;
    rightHandReferenceData = null;
    leftHandData = null;
    rightHandData = null;
    
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
    
    // Preload AI models
    try {
        elements.beginBtn.disabled = true;
        elements.beginBtn.textContent = 'Loading AI...';
        await SizeKitDetection.loadHandposeModel();
        console.log('✓ AI models loaded');
    } catch (error) {
        console.error('Failed to load AI models:', error);
    } finally {
        elements.beginBtn.disabled = false;
        elements.beginBtn.textContent = "I'm Ready";
    }
    
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
    leftHandReferenceData = null;
    rightHandReferenceData = null;
    leftHandData = null;
    rightHandData = null;
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