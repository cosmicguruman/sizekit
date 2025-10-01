# SizeKit Source Architecture

## 📁 File Structure

```
src/
├── app.js              Main orchestrator - coordinates workflow
├── state.js            State management - single source of truth
├── camera.js           Camera control - start, stop, capture
├── measurements.js     Pure functions - calculate measurements
├── ui.js               UI controller - DOM manipulation
└── config.js           Configuration - all constants

detection.js (root)     AI detection - uses TensorFlow.js (legacy global scope)
```

## 🎯 Module Responsibilities

### **app.js** - Main Orchestrator
**What it does:** Coordinates the entire workflow from start to finish

**Key functions:**
- `init()` - Initialize app and setup event listeners
- `startMeasurementFlow()` - Begin measurement process
- `capturePhoto()` - Handle photo capture for each hand
- `processMeasurements()` - Run detection and measurement pipeline
- `shareResults()` - Share or copy measurements

**When to edit:** Changing workflow, adding new screens, modifying flow logic

**Debug tips:**
```javascript
// Check current workflow state
AppState.getState()

// Check which screen is active
AppState.currentScreen

// See what photos are captured
AppState.photos
```

---

### **state.js** - State Management
**What it does:** Stores all application data in one place

**State structure:**
```javascript
{
    currentScreen: 'landing',     // Which screen is showing
    currentHand: 'left',          // Which hand to capture next
    cameraStream: MediaStream,    // Active camera stream
    photos: {
        left: { blob, dataUrl, width, height },
        right: { ... }
    },
    detection: {
        left: { reference, hand },
        right: { reference, hand }
    },
    measurements: {
        left: [...],
        right: [...]
    }
}
```

**Key functions:**
- `getState()` - Get current state (for debugging)
- `reset()` - Clear all state
- `setPhoto(hand, data)` - Store captured photo
- `setDetection(hand, type, data)` - Store detection result
- `setMeasurements(hand, data)` - Store final measurements

**When to edit:** Adding new state fields, changing data structure

**Debug tips:**
```javascript
// In browser console:
AppState.getState()           // See overview
AppState.photos.left          // Check left hand photo
AppState.measurements         // See final measurements
```

---

### **camera.js** - Camera Controller
**What it does:** Handles camera access and photo capture

**Key functions:**
- `init(videoElement)` - Setup camera with video element
- `start()` - Start camera stream (with fallback)
- `stop()` - Stop camera and release resources
- `capture()` - Take photo from current stream
- `isActive()` - Check if camera is running

**When to edit:** Camera not working, need different resolution, capture quality

**Debug tips:**
```javascript
import { Camera } from './camera.js'

Camera.isActive()             // Check if camera running
AppState.cameraStream         // See active stream
```

**Common issues:**
- Camera won't start → Check HTTPS, permissions
- Wrong camera → Check facingMode in config.js
- Photo quality issues → Adjust camera.photoQuality in config.js

---

### **measurements.js** - Pure Calculation Functions
**What it does:** Convert detection data to nail sizes (NO side effects)

**Key functions:**
- `mmToSizeNumber(mm)` - Convert mm to size 0-11
- `sizeNumberToMm(size)` - Get mm range for size
- `calculateNailSizes(handData, referenceData)` - Main calculation
- `validateMeasurements(measurements)` - Check if results are realistic
- `formatMeasurementsForSharing(measurements)` - Format as text

**When to edit:** Measurements are wrong, calibration needed, size table changes

**How calculations work:**
```javascript
// Input: Detection results
handData = {
    nails: [
        { finger: 'Thumb', width: { pixels: 75 } },
        ...
    ]
}
referenceData = {
    pixelsPerMm: 5.0  // Calculated from credit card/quarter
}

// Process:
1. pixels / pixelsPerMm = mm
   75px / 5 = 15mm

2. mm → size number (from table)
   15mm → Size 1

// Output:
{ finger: 'Thumb', mm: 15.0, size: 1, confidence: 0.85 }
```

**Debug tips:**
```javascript
import { mmToSizeNumber } from './measurements.js'

// Test conversions
mmToSizeNumber(15.5)  // Should return 1
mmToSizeNumber(11.2)  // Should return 5
```

**Common issues:**
- Sizes are off by 1-2 → Check size table in config.js
- Some nails measure 0mm → Detection failed, check handData
- Scale seems wrong → Check pixelsPerMm (should be 3-10 typically)

---

### **ui.js** - UI Controller
**What it does:** All DOM manipulation (show screens, update text, display results)

**Key functions:**
- `init()` - Cache DOM elements
- `showScreen(name)` - Switch between screens
- `updateCaptureInstructions()` - Update camera overlay text
- `showCaptureLoading(show)` - Toggle loading indicator
- `updateProcessingStep(step, status)` - Update progress indicators
- `displayResults(measurements)` - Show final nail sizes
- `showError(message)` - Display error screen

**When to edit:** UI bugs, changing text, adding new screens

**Debug tips:**
```javascript
import { UI } from './ui.js'

UI.showScreen('capture')      // Jump to any screen
UI.screens                    // See all screen elements
UI.elements                   // See all UI elements
```

---

### **config.js** - Configuration
**What it does:** All constants, specs, and calibration values

**Key sections:**
- `referenceObjects` - Credit card & quarter specs
- `nailSizeTable` - mm to size number mapping
- `fingers` - Finger names and landmark indices
- `camera` - Camera constraints and quality
- `measurement` - Confidence thresholds, validation ranges
- `messages` - All UI text and error messages
- `debug` - Debug settings

**When to edit:** Calibrating measurements, changing size ranges, updating text

**Most common edits:**
```javascript
// Calibrate size table
nailSizeTable: [
    { size: 1, minMm: 15.0, maxMm: 16.0 },  // Adjust these!
    ...
]

// Adjust confidence thresholds
minConfidence: {
    reference: 0.6,  // Lower = more permissive
    hand: 0.5,
    overall: 0.7
}

// Change nail width estimation
nailWidthFactor: 0.45  // Adjust if nails measuring too big/small
```

---

## 🔄 Data Flow

```
User Action
    ↓
app.js (orchestrator)
    ↓
state.js (update state)
    ↓
camera.js OR detection.js
    ↓
measurements.js (calculate)
    ↓
state.js (store results)
    ↓
ui.js (display)
```

## 🐛 Debugging Guide

### **"Camera won't start"**
1. Check `camera.js` → `start()` function
2. Check config.js → `camera.primary` constraints
3. Check browser console for specific error

### **"Reference object not detected"**
1. Check `detection.js` → `detectReferenceObject()`
2. Lower confidence threshold in config.js
3. Check photo quality (lighting, focus)

### **"Hand not detected"**
1. Check `detection.js` → `detectHandAndNails()`
2. Verify MediaPipe model loaded
3. Check hand is visible and well-lit

### **"Measurements seem wrong"**
1. Check `measurements.js` → `calculateNailSizes()`
2. Log pixelsPerMm value (should be 3-10)
3. Adjust `nailWidthFactor` in config.js
4. Check size table ranges in config.js

### **"UI not updating"**
1. Check `ui.js` → relevant function
2. Verify element IDs match HTML
3. Check if state is being updated

## 💡 Quick Tips

**See current state:**
```javascript
AppState.getState()
```

**Force a screen:**
```javascript
UI.showScreen('results')
```

**Test measurement conversion:**
```javascript
import { mmToSizeNumber } from './measurements.js'
mmToSizeNumber(12.5)  // Test a value
```

**Check what's in a photo:**
```javascript
AppState.photos.left.width  // Photo dimensions
```

---

## 🎯 Common Tasks

### **Add a new screen:**
1. Add HTML in index.html
2. Add screen to `UI.screens` in ui.js
3. Add transition in app.js workflow

### **Change size ranges:**
1. Edit `nailSizeTable` in config.js
2. No other changes needed!

### **Adjust measurement accuracy:**
1. Edit `nailWidthFactor` in config.js (affects width estimation)
2. Edit confidence thresholds
3. Edit validation ranges

### **Add new error message:**
1. Add to `Config.messages.errors`
2. Use in app.js: `UI.showError(Config.messages.errors.yourError)`

---

**This architecture makes it EASY to:**
- 🎯 Find exactly where something happens
- 🐛 Debug issues quickly
- 🔧 Make changes safely
- 📈 Add new features cleanly
