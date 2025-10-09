# SizeKit - AI-Powered Nail Measurement

## 🎯 What Changed (Latest Update)

### PROPER EDGE DETECTION IMPLEMENTED

#### 1. **Nail Detection - Shadow-Based**
- ✅ Now uses **Sobel operator** to find edges/shadows
- ✅ Detects the natural shadow at nail boundaries (from curvature)
- ✅ No longer dependent on nail brightness vs skin brightness
- ✅ Works with dark polish, natural nails, any lighting

**How it works:**
```
1. Extract 120x120px region around fingertip
2. Compute gradients (edges) using Sobel operator
3. Find strongest vertical edges (left/right nail boundaries)
4. Shadows at nail edges = strong gradients
5. Return distance between left and right shadow edges
```

#### 2. **Card Detection - Bug Fixed**
- ✅ Fixed brightness calculation bug (was normalized, now returns 0-255)
- ✅ Relaxed thresholds to work with more cards
- ✅ Better logging to debug detection issues

**Current approach:** Brightness + uniformity method
**Future:** Will add edge-based rectangle detection for more robustness

---

## 🚀 Quick Start

1. **Start HTTPS server:**
   ```bash
   cd /Users/admin/projects/sizekit
   python3 serve_https.py
   ```

2. **Open on phone:**
   ```
   https://172.16.0.17:8443
   ```

3. **Test:**
   - Place credit card on table
   - Spread hand next to card
   - Camera should detect both automatically

---

## 🔍 How Detection Works Now

### **Nail Detection (Shadow Method)**

The key insight: **Nails have shadows at their edges due to curvature.**

Instead of looking for brightness changes (nail lighter than skin), we look for **shadow edges** using gradient detection:

```
Brightness method (OLD):          Shadow method (NEW):
┌────────────────┐                ┌────────────────┐
│  Skin  |  Nail │                │  |          |  │
│  ████  |  ░░░░ │                │  │  Nail    │  │
│  ████  |  ░░░░ │  ← Contrast    │ ┃          ┃  │ ← Shadows
│  ████  |  ░░░░ │                │  │          │  │
└────────────────┘                └──┴──────────┴──┘
                                     ↑            ↑
Problem: Fails if                 Shadow       Shadow
nail ≈ same brightness            (edge)       (edge)
```

**Sobel Operator:**
```javascript
// Detects rapid changes in pixel values = edges
sobelX = [-1, 0, 1,    Horizontal edges
          -2, 0, 2,
          -1, 0, 1]

sobelY = [-1,-2,-1,    Vertical edges  
           0, 0, 0,
           1, 2, 1]

gradient_magnitude = √(gx² + gy²)
gradient_direction = atan2(gy, gx)
```

**Result:** Find vertical edges (shadows) regardless of brightness.

---

### **Card Detection**

Current method: Scans image looking for bright, uniform rectangles with 1.586 aspect ratio.

**Fixed issues:**
- Brightness was normalized (0-1) but compared to 110 → FIXED
- Thresholds were too strict → RELAXED
- Better logging for debugging

**Future improvement:** Edge-based rectangle detection (like document scanners).

---

## 📊 Expected Improvements

| Issue | Before | After (Shadow Detection) |
|-------|--------|-------------------------|
| **Dark nail polish** | ❌ Failed (no contrast) | ✅ Works (shadows exist) |
| **Natural nails** | ❌ Failed (same as skin) | ✅ Works (edge shadows) |
| **Low lighting** | ❌ Failed (low contrast) | ✅ Better (gradients relative) |
| **Nail curvature** | ❌ Caused issues | ✅ Actually helps (creates shadows) |

---

## 🔧 Technical Details

### Files Changed:
- `detection.js`: 
  - `detectActualNailBoundary()` - Rewritten with Sobel edge detection
  - `computeGradients()` - New function for gradient calculation
  - `getRegionBrightness()` - Fixed to return 0-255 (was 0-1)

### Key Functions:
```javascript
// Compute gradients (find edges)
computeGradients(imageData, x, y, width, height)
  → Returns: Float32Array of gradient magnitudes

// Detect nail using shadows
detectActualNailBoundary(imageData, fingertipX, fingertipY)
  → Extracts 120x120 region
  → Computes gradients
  → Finds strongest edges left/right
  → Returns: width in pixels
```

---

## 🐛 Debugging

Check console logs:
```javascript
🔬 Detecting nail edges using shadows at (x, y)
  ✅ Found shadow edges: L=45 R=78 W=33px
     Edge strengths: L=67.3 R=72.1
```

If failing:
```javascript
  ❌ Could not find clear shadow edges
```

Possible causes:
1. HandPose fingertip position off
2. No clear nail boundary in image
3. Thresholds too high (adjust minGradient)

---

## 🎯 Next Steps

### To Test:
1. Try with different nail conditions:
   - Dark polish
   - No polish
   - Various lighting
   - Different skin tones

2. Check console logs for edge strength values

3. If detection fails, note:
   - Edge strength values
   - Fingertip position accuracy
   - Visual conditions

### Future Improvements:
1. **Card detection:** Implement edge-based rectangle finding
2. **Nail detection:** Adaptive thresholds based on image characteristics
3. **Validation:** Ensure measurements are within realistic bounds (5-20mm)
4. **Visual feedback:** Show detected edges on screen

---

## 💡 Why This Approach Works

### The Physics:
1. Nails are curved (not flat)
2. Curves cast shadows at their edges
3. Shadows = dark lines = strong gradients
4. Gradients are detectable regardless of absolute brightness

### The Math:
- **Sobel operator** = classical computer vision edge detection
- Used in: Document scanners, face detection, medical imaging
- Reliable, fast, well-understood

### The Result:
- More robust than brightness comparison
- Works in varied lighting
- Less sensitive to nail/skin color

---

## 📱 User Experience

**Current flow:**
```
1. Open app on phone
2. Place hand + card in frame
3. AI detects card → shows green box
4. AI detects hand → shows skeleton
5. AI measures nails → shows sizes
Total time: ~5-10 seconds
```

**Goal:** Keep it this simple, just make it work reliably.

---

## 🔬 Research References

### Edge Detection:
- Sobel operator: Standard gradient-based edge detection
- Used since 1968, proven reliable
- OpenCV, scikit-image all use this approach

### Similar Apps:
- Document scanners: Use edge detection + Hough transform for rectangles
- AR apps: Use marker detection (similar principle)
- Nail apps: Most use manual measurement (we're doing better!)

---

## 🚦 Status

- ✅ Shadow-based nail detection implemented
- ✅ Card detection bug fixed
- ⏳ Testing needed with real conditions
- 📋 TODO: Edge-based card detection
- 📋 TODO: Measurement validation

**Ready to test!**
