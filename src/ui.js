/**
 * SizeKit UI Controller
 * All DOM manipulation and screen transitions
 */

import { Config } from './config.js';
import { AppState } from './state.js';

export const UI = {
    // Screen elements
    screens: {},
    
    // UI elements
    elements: {},
    
    /**
     * Initialize UI module
     */
    init() {
        // Cache screen elements
        this.screens = {
            landing: document.getElementById('landing-screen'),
            instructions: document.getElementById('instructions-screen'),
            capture: document.getElementById('capture-screen'),
            processing: document.getElementById('processing-screen'),
            results: document.getElementById('results-screen'),
            error: document.getElementById('error-screen')
        };
        
        // Cache interactive elements
        this.elements = {
            // Capture screen
            captureInstruction: document.getElementById('capture-instruction'),
            captureHint: document.getElementById('capture-hint'),
            captureLoading: document.getElementById('capture-loading'),
            captureBtn: document.getElementById('capture-photo-btn'),
            
            // Processing screen
            processingStatus: document.getElementById('processing-status'),
            stepReference: document.getElementById('step-reference'),
            stepHand: document.getElementById('step-hand'),
            stepNails: document.getElementById('step-nails'),
            
            // Results screen
            leftHandSizes: document.getElementById('left-hand-sizes'),
            rightHandSizes: document.getElementById('right-hand-sizes'),
            
            // Error screen
            errorMessage: document.getElementById('error-message')
        };
        
        console.log('🎨 UI module initialized');
    },
    
    /**
     * Show a specific screen
     * @param {string} screenName - Name of screen to show
     */
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show requested screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            AppState.currentScreen = screenName;
            console.log(`🎨 Showing screen: ${screenName}`);
        } else {
            console.error(`❌ Screen not found: ${screenName}`);
        }
    },
    
    /**
     * Update capture screen instructions based on current hand
     */
    updateCaptureInstructions() {
        const hand = AppState.currentHand;
        const messages = Config.messages.capture[hand];
        
        this.elements.captureInstruction.textContent = messages.title;
        this.elements.captureHint.textContent = messages.hint;
        
        console.log(`🎨 Updated capture instructions for ${hand} hand`);
    },
    
    /**
     * Show/hide capture loading indicator
     * @param {boolean} show - Whether to show loading
     */
    showCaptureLoading(show) {
        if (show) {
            this.elements.captureLoading.classList.remove('hidden');
            this.elements.captureBtn.disabled = true;
        } else {
            this.elements.captureLoading.classList.add('hidden');
            this.elements.captureBtn.disabled = false;
        }
    },
    
    /**
     * Update processing step status
     * @param {string} step - Step name: 'reference', 'hand', or 'nails'
     * @param {string} status - Status: 'pending', 'active', or 'complete'
     */
    updateProcessingStep(step, status) {
        const elementKey = `step${step.charAt(0).toUpperCase() + step.slice(1)}`;
        const stepElement = this.elements[elementKey];
        
        if (!stepElement) {
            console.error(`❌ Step element not found: ${elementKey}`);
            return;
        }
        
        stepElement.classList.remove('active', 'complete');
        
        if (status === 'active') {
            stepElement.classList.add('active');
        } else if (status === 'complete') {
            stepElement.classList.add('complete');
        }
        
        console.log(`🎨 Processing step updated: ${step} → ${status}`);
    },
    
    /**
     * Update processing status message
     * @param {string} message - Status message to display
     */
    updateProcessingStatus(message) {
        this.elements.processingStatus.textContent = message;
    },
    
    /**
     * Display measurement results
     * @param {Object} measurements - { left: [], right: [] }
     */
    displayResults(measurements) {
        // Display left hand
        this.elements.leftHandSizes.innerHTML = '';
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
            this.elements.leftHandSizes.appendChild(nailDiv);
        });
        
        // Display right hand
        this.elements.rightHandSizes.innerHTML = '';
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
            this.elements.rightHandSizes.appendChild(nailDiv);
        });
        
        console.log('🎨 Results displayed');
        this.showScreen('results');
    },
    
    /**
     * Show error screen with message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.showScreen('error');
        console.error('❌ Error shown:', message);
    }
};
