# 💅 SizeKit - AI-Powered Nail Measurement

Measure your nails accurately using your phone camera and a credit card for scale reference.

---

## 🚀 Quick Start

### 1. Start the HTTPS server:
```bash
python3 serve_https.py
```

### 2. Get your computer's IP address:
```bash
# Mac/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig
```

### 3. Open on your iPhone:
```
https://YOUR_IP:8443
```

Example: `https://172.20.10.3:8443`

**Note:** You'll see a security warning (self-signed certificate). Click "Advanced" → "Proceed anyway"

---

## 📱 How to Use

1. **Open the app** - Wait 30-60 seconds for AI models to load
2. **Position setup:**
   - Place a credit card in the camera view
   - Spread your fingers next to the card
   - Ensure good lighting
   - Keep your hand flat
3. **Capture** - Tap the large white button
4. **View results** - See measurements in millimeters and size numbers

---

## 🏗️ Architecture

### Core Files:
```
sizekit/
├── index.html          # Main app (camera UI + results)
├── detection.js        # AI detection library
├── serve_https.py      # HTTPS dev server
├── cert.pem           # SSL certificate
├── key.pem            # SSL private key
└── README.md          # This file
```

### Tech Stack:
- **Frontend:** Plain HTML/CSS/JavaScript
- **AI:** TensorFlow.js + HandPose (MediaPipe)
- **Detection:** Custom nail segmentation algorithm
- **Server:** Python HTTPS server (dev only)

---

## 🔬 How It Works

### 1. Credit Card Detection
- Scans image for bright, rectangular regions
- Checks aspect ratio (85.6mm × 53.98mm = 1.586)
- Calculates scale: `pixelsPerMm = cardWidth / 85.6`

### 2. Hand Detection
- TensorFlow HandPose finds 21 hand landmarks
- Identifies fingertips [thumb, index, middle, ring, pinky]

### 3. Nail Measurement
For each fingertip:
1. Sample skin tone at finger base
2. Find pixels brighter than skin (nails are ~15% brighter)
3. Filter by color uniformity (nails are less saturated)
4. Measure widest horizontal span
5. Convert: `millimeters = pixels ÷ pixelsPerMm`

### 4. Size Conversion
- Maps millimeters to standard nail size numbers (0-9)
- Uses configurable size table

---

## 📊 API Reference

The `detection.js` library exports:

```javascript
window.SizeKitDetection = {
    // Load AI models
    loadHandposeModel(),
    
    // Detect credit card for scale
    detectReferenceObject({ dataUrl }),
    
    // Detect hand and nail boundaries
    detectHandAndNails({ dataUrl }, referenceData),
    
    // Convert pixels to millimeters
    measureNails(handData, referenceData),
    
    // Convert mm to size numbers
    mmToSizeNumber(mm),
    sizeNumberToMm(sizeNumber)
}
```

---

## 🛠️ Development

### Generate SSL Certificate (if needed):
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Test Locally:
```bash
# Start server
python3 serve_https.py

# Open in browser
open https://localhost:8443
```

---

## 🎯 Accuracy Tips

For best measurement accuracy:

1. **Lighting:** Use bright, even lighting (no harsh shadows)
2. **Card position:** Keep credit card flat and parallel to camera
3. **Hand position:** Spread fingers, keep hand flat
4. **Camera angle:** Hold phone directly above (perpendicular to hand)
5. **Stability:** Keep camera steady while capturing

---

## 🐛 Troubleshooting

### Camera won't open
- Make sure you're using HTTPS (not HTTP)
- Allow camera permissions when prompted
- Check Settings → Safari → Camera = "Ask"

### AI models won't load
- Wait 30-60 seconds (first load is slow)
- Check internet connection
- Try refreshing the page

### Measurements are inaccurate
- Ensure credit card is detected (look for green box)
- Check scale value (should be 4-10 px/mm)
- Improve lighting
- Position card flat and visible

### "No hand detected"
- Ensure hand is in frame
- Use better lighting
- Spread fingers clearly
- Keep hand steady

---

## 📈 Known Limitations

1. **Curvature:** Measures 2D projection, doesn't account for nail curvature
2. **Lighting sensitivity:** Poor lighting affects detection accuracy
3. **Nail polish:** Dark polish can interfere with detection
4. **Card detection:** Can sometimes detect wrong rectangles (walls, paper)
5. **Mobile performance:** AI processing is slower on phones

---

## 🚀 Deployment

### Option A: Static Hosting
Deploy to Vercel, Netlify, or GitHub Pages:
```bash
# Just upload index.html and detection.js
# HTTPS is included for free
```

### Option B: Native App
Wrap with Capacitor or Cordova for iOS/Android app stores

---

## 📝 License

See LICENSE file for details.

---

## 🔗 Resources

- [TensorFlow.js](https://www.tensorflow.org/js)
- [HandPose Model](https://github.com/tensorflow/tfjs-models/tree/master/handpose)
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands)

---

**Made with ❤️ for nail artists and enthusiasts**
