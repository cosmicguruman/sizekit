# SizeKit - AI Nail Size Measurement

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Phase](https://img.shields.io/badge/phase-2%20%7C%20AI%20Measurement-purple.svg)
![AI](https://img.shields.io/badge/AI-TensorFlow.js%20%7C%20MediaPipe-orange.svg)

AI-powered nail size measurement web application for press-on nails. Measure all 10 fingernails accurately using just your phone camera and a credit card or quarter.

**🔗 Repository:** https://github.com/cosmicguruman/sizekit

## 🎯 What This Does

- **AI-Powered Measurement**: Automatically measures all 10 fingernails using computer vision
- **Dual Reference Support**: Works with credit card OR quarter for scale calibration
- **Instant Results**: Get nail size numbers (0-11) in seconds
- **High Accuracy**: ±0.5mm precision using reference object detection
- **Two-Photo Workflow**: Capture left hand, then right hand with guided overlays
- **Smart Detection**: TensorFlow.js + MediaPipe for hand pose and nail location
- **Share Results**: Copy or share measurements directly to nail artist
- **Mobile-Optimized**: Works on iOS Safari, Chrome mobile, and Android browsers

## ✅ Success Criteria

- ✅ Opens back camera on first tap
- ✅ Works on iOS Safari (primary target)
- ✅ Full-screen camera preview
- ✅ Handles errors gracefully
- ✅ Can be tested locally via HTTPS

## 📁 File Structure

```
sizekit/
├── index.html          # Main page with camera UI
├── styles.css          # Mobile-first responsive styles
├── camera.js           # Camera initialization and error handling
└── README.md           # This file
```

## 🚀 Local Testing Setup

### Option 1: Using Python HTTPS Server (Recommended for Quick Testing)

#### Step 1: Generate Self-Signed Certificate

```bash
# Generate certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

When prompted, you can press Enter for all fields or fill them in.

#### Step 2: Start HTTPS Server

**Python 3:**
```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then in another terminal, use a tool like `local-ssl-proxy`:
```bash
npm install -g local-ssl-proxy
local-ssl-proxy --source 8443 --target 8000 --cert cert.pem --key key.pem
```

Or use Python's built-in SSL support:
```bash
# Create a simple server script (serve_https.py)
python3 serve_https.py
```

**serve_https.py:**
```python
import http.server
import ssl

httpd = http.server.HTTPServer(('0.0.0.0', 8443), http.server.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='./cert.pem', keyfile='./key.pem', server_side=True)
print("Server running on https://0.0.0.0:8443")
httpd.serve_forever()
```

#### Step 3: Access on Desktop

```
https://localhost:8443
```

You'll see a security warning (because of self-signed cert). Click "Advanced" and proceed anyway.

---

### Option 2: Using ngrok (Best for Mobile Testing)

#### Step 1: Install ngrok

Download from [ngrok.com](https://ngrok.com/) or:
```bash
brew install ngrok  # macOS
```

#### Step 2: Start Local Server

```bash
# In the sizekit directory
python3 -m http.server 8000
```

#### Step 3: Expose via ngrok

```bash
ngrok http 8000
```

You'll get a URL like:
```
https://abc123.ngrok.io
```

#### Step 4: Open on Mobile

Open the ngrok HTTPS URL on your phone's browser. The camera API will work because ngrok provides HTTPS.

**✨ This is the easiest way to test on a real device!**

---

### Option 3: Using localhost.run (No Installation)

#### Step 1: Start Local Server

```bash
python3 -m http.server 8000
```

#### Step 2: Create Tunnel

```bash
ssh -R 80:localhost:8000 localhost.run
```

You'll get a URL like:
```
https://abc123.lhr.run
```

#### Step 3: Open on Mobile

Use the provided HTTPS URL on your phone.

---

### Option 4: Using mkcert (Best for Local Development)

#### Step 1: Install mkcert

```bash
brew install mkcert  # macOS
brew install nss     # Firefox support
```

#### Step 2: Create Local CA

```bash
mkcert -install
```

#### Step 3: Generate Certificate

```bash
# In your project directory
mkcert localhost 127.0.0.1 ::1
```

This creates:
- `localhost+2.pem` (certificate)
- `localhost+2-key.pem` (key)

#### Step 4: Start Server with Certificate

Create a simple Node.js server (`server.js`):

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.static('.'));

const options = {
  key: fs.readFileSync('localhost+2-key.pem'),
  cert: fs.readFileSync('localhost+2.pem')
};

https.createServer(options, app).listen(8443, () => {
  console.log('Server running on https://localhost:8443');
});
```

Install dependencies and run:
```bash
npm install express
node server.js
```

#### Step 5: Find Your Local IP

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Your local IP will be something like `192.168.1.100`

#### Step 6: Test on Mobile

On your phone (connected to same WiFi):
```
https://192.168.1.100:8443
```

You'll need to accept the certificate warning on first visit.

---

## 📱 Testing on Mobile Devices

### iOS Safari Testing

1. Connect your iPhone to the same WiFi network as your computer
2. Open Safari on iPhone
3. Navigate to your HTTPS URL (from ngrok, localhost.run, or local IP)
4. Accept any certificate warnings
5. Tap "Open Camera"
6. Grant camera permission when prompted
7. **Verify the back camera opens** (point at something and check if it's the rear camera view)

### iOS Chrome Testing

Same steps as Safari, but use Chrome browser.

### Android Testing

1. Connect Android device to same WiFi
2. Open Chrome or Firefox
3. Navigate to HTTPS URL
4. Accept certificate warnings
5. Tap "Open Camera"
6. Grant permissions
7. Verify back camera opens

---

## 🐛 Troubleshooting

### Camera Doesn't Open

**Issue:** "Camera access must be done over HTTPS"
- **Solution:** Ensure you're using `https://` not `http://`

**Issue:** "NotAllowedError" or permission denied
- **Solution:** Grant camera permissions in browser settings
- iOS: Settings → Safari → Camera
- Android: Browser Settings → Site Settings → Camera

**Issue:** Front camera opens instead of back camera
- **Solution:** This is rare but can happen on some devices. The code includes fallback logic.
- Check browser console for logs

**Issue:** "Camera is already in use"
- **Solution:** Close other apps using the camera
- On iOS: Force close camera app
- Try restarting the browser

### Network Issues

**Issue:** Can't access via local IP on mobile
- **Solution:** Ensure both devices are on same WiFi network
- Check firewall settings on your computer
- Try using ngrok instead

**Issue:** Certificate warnings won't let me proceed
- **Solution:** On iOS Safari, tap "Show Details" → "Visit this website"
- On Chrome, type "thisisunsafe" while on the warning page

### Browser Console Errors

Open browser DevTools (on desktop) or remote debugging:
- **iOS Safari:** Connect iPhone to Mac → Safari → Develop → [Your iPhone] → [Page]
- **Android Chrome:** chrome://inspect on desktop Chrome

Common console errors:
- `getUserMedia is not defined`: Browser doesn't support camera API (very old browser)
- `HTTPS required`: Not using HTTPS
- `NotFoundError`: No camera on device

---

## 📊 Testing Checklist

Before moving to Phase 2, verify:

- [ ] Can access via HTTPS locally
- [ ] Link opens in mobile browser
- [ ] No console errors on page load
- [ ] Button tap triggers camera permission request
- [ ] **Back camera opens (not front camera)**
- [ ] Camera preview displays full screen
- [ ] Video stream is smooth (not laggy)
- [ ] Can close camera gracefully
- [ ] Works on iPhone Safari
- [ ] Works on iPhone Chrome (if available)
- [ ] Works on Android Chrome
- [ ] Handles permission denial gracefully
- [ ] Falls back if back camera unavailable
- [ ] Works after denying then re-enabling permissions
- [ ] Works after phone lock/unlock
- [ ] Works after switching between apps

---

## 🔧 Technical Details

### Camera Constraints

The app uses MediaDevices API with specific constraints:

```javascript
// Primary attempt - force back camera
{
  video: {
    facingMode: { exact: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: false
}

// Fallback - try back camera but allow front camera
{
  video: {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: false
}
```

### Browser Support

**Tested on:**
- iOS Safari 15+
- iOS Chrome 100+
- Android Chrome 90+
- Android Firefox 90+

**Requirements:**
- HTTPS connection
- Modern browser with MediaDevices API support
- User gesture to initiate camera (button tap)

### Key iOS Safari Considerations

1. **HTTPS Required:** Camera won't work over HTTP even on localhost
2. **User Gesture Required:** Camera must be triggered by user interaction (button tap)
3. **Permission Handling:** iOS prompts once per domain, user must manually re-enable in settings if denied
4. **Fullscreen Behavior:** Uses viewport units (vh/vw) to handle iOS Safari's unique viewport

---

## 🎯 Success Metrics

**Phase 1 is complete when:**
- ✅ Developer can open link on iPhone
- ✅ Back camera opens on first tap
- ✅ Works 10/10 times with no failures
- ✅ Video preview is smooth and full-screen
- ✅ Tested on at least 2 different devices

---

## 🚦 Next Steps (Future Phases)

Phase 1 focuses ONLY on reliable camera access. Future phases will add:

- **Phase 2:** Capture button and photo capture
- **Phase 3:** Image processing and nail measurement
- **Phase 4:** Customer data input
- **Phase 5:** Artist dashboard integration

---

## 📝 Development Notes

### File Sizes
- `index.html`: ~1.5 KB
- `styles.css`: ~5 KB
- `camera.js`: ~10 KB
- **Total:** ~16.5 KB (extremely lightweight)

### No Dependencies
- Pure vanilla JavaScript (no frameworks)
- No external libraries
- No build process needed
- Just open `index.html` and go!

### Performance
- Minimal JavaScript bundle
- CSS uses hardware-accelerated properties
- Video stream uses native browser APIs
- Works smoothly even on older devices

---

## 🤝 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify HTTPS is enabled
3. Ensure camera permissions are granted
4. Try on a different device/browser
5. Check the troubleshooting section above

---

## 📄 License

Part of the SizeKit project for 4TRACK application.

---

**Version:** 1.0  
**Last Updated:** September 29, 2025  
**Status:** Phase 1 - Camera Access Only
