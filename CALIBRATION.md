# 📏 SizeKit Calibration Guide

## Goal: Get Accurate Measurements

This guide helps you calibrate the app to measure nails accurately.

---

## Step 1: Measure Your Own Nails

### **What You Need:**
- Ruler or tape measure (mm scale)
- Your hands
- Good lighting

### **How to Measure:**

1. **Place ruler across nail horizontally**
2. **Measure widest point of nail** (side to side, not length)
3. **Record in millimeters**

```
Example measurements:
Thumb:   15.5mm
Index:   11.0mm  
Middle:  12.5mm
Ring:    10.0mm
Pinky:    8.0mm
```

### **Tips:**
- Measure at the widest part of the nail plate
- Don't include the skin, just the nail itself
- Use mm (not cm or inches)
- Measure both hands

---

## Step 2: Test the App

1. **Open the app** on your phone
2. **Place hand with credit card**
3. **Take photos of both hands**
4. **Check browser console** (if connected to computer)
5. **Compare app measurements to your real measurements**

---

## Step 3: Read the Debug Logs

**In browser console, you'll see:**

```
🔍 Found 3 potential rectangles
  Rectangle: 428x270px, aspect: 1.59 (target: 1.59)
✅ Credit card detected!
   Card width: 428px
   Expected: 85.6mm
   Scale: 5.00 pixels/mm

📏 Measuring nails with scale: 5.00 pixels/mm
  Thumb: 75.0px ÷ 5.00 = 15.0mm → Size 1
  Index: 55.0px ÷ 5.00 = 11.0mm → Size 5
  ...
```

### **Check These Values:**

1. **Scale (pixels/mm):**
   - Should be 3-10 typically
   - If way off: Credit card detection failed

2. **Nail width in pixels:**
   - Should be 20-100px typically
   - If too big: Finger detection is measuring wrong segment

3. **Final mm measurements:**
   - Compare to your ruler measurements
   - Should be 7-18mm range
   - If way off: Either scale or pixel measurement is wrong

---

## Step 4: Diagnose the Issue

### **If measurements are 2-3x too big:**
```
Symptom: App shows 30mm, real is 12mm
Cause: Scale is wrong OR pixel measurement is wrong
Fix: Check console logs for scale value
```

**Check:**
- Is credit card detected? (look for ✅ message)
- What's the scale value? (should be 3-10)
- What are pixel measurements? (should be 20-100px)

### **If measurements are slightly off (±2-3mm):**
```
Symptom: App shows 13mm, real is 11mm
Cause: Nail width estimation factor
Fix: Adjust nailWidthFactor in src/config.js
```

**Adjust:**
```javascript
// In src/config.js:
nailWidthFactor: 0.45  // Try 0.40 (smaller) or 0.50 (larger)
```

### **If size conversions are wrong:**
```
Symptom: 12mm showing as Size 2 instead of Size 4
Cause: Size table ranges are off
Fix: Adjust nailSizeTable in src/config.js
```

---

## Step 5: Calibrate

### **Calibration Process:**

1. **Find the error pattern:**
   - All nails 20% too big? → Adjust nailWidthFactor down
   - Scale is wrong? → Credit card detection issue
   - Sizes off by 1? → Adjust size table

2. **Make ONE change at a time**

3. **Test again**

4. **Repeat until accurate**

---

## Common Issues & Fixes

### **Issue: Credit card not detected**
```
Symptom: Error "No reference object detected"
Console: ⚠️ No credit card found in rectangles
```

**Fixes:**
- Better lighting
- Card fully visible in photo
- Card flat on surface
- Try different card (some are non-standard size)

---

### **Issue: Measurements way too big (30mm+)**
```
Symptom: All nails showing Size 0, 25-35mm
Console: Scale shows very low number (< 2)
```

**Likely cause:** Credit card width detected wrong

**Debug:**
- Check console for "Card width: XXXpx"
- Real credit card = 85.6mm
- If detected as 200px → scale = 2.3 pixels/mm
- But hand might be 1500px wide → causes huge measurements

**Fix:** Improve rectangle detection or use quarter instead

---

### **Issue: Hand not detected**
```
Symptom: Error "No hand detected"
```

**Fixes:**
- Better lighting
- Hand fully in frame
- Fingers spread slightly
- Try different background (contrast)

---

## Quick Calibration Cheat Sheet

| Your Measurement | App Shows | Problem | Fix |
|-----------------|-----------|---------|-----|
| 12mm | 30mm | Too big 2.5x | Scale wrong, check card detection |
| 12mm | 15mm | Too big 25% | Lower nailWidthFactor to 0.40 |
| 12mm | 9mm | Too small 25% | Raise nailWidthFactor to 0.50 |
| 12mm (Size 4) | 12mm (Size 2) | Wrong size | Adjust size table ranges |

---

## Target Accuracy

**Good enough:**
- ±1mm accuracy
- Size number ±1 (Size 4 instead of Size 5 is OK)

**Ideal:**
- ±0.5mm accuracy  
- Exact size number match

**Reality:**
- Computer vision has limits
- Lighting affects results
- Hand position matters
- 80-90% accuracy is realistic goal

---

## Next Steps After Calibration

Once measurements are close:

1. **Test on multiple people** (different hand sizes)
2. **Test in different lighting**
3. **Test with different phones**
4. **Collect data** on accuracy
5. **Iterate** on algorithm

---

## Debug Mode

**Enable verbose logging in `src/config.js`:**

```javascript
debug: {
    enabled: true,
    logDetection: true,
    logMeasurements: true,
    showConfidenceScores: true
}
```

This will show EVERYTHING in the console.
