# 📱 SizeKit - iPhone Testing Setup Guide

## Quick Start (Using Existing HTTPS Server)

### Prerequisites
- Python 3 installed on your computer
- iPhone connected to same WiFi network as computer
- Computer and iPhone **must be on the MAIN WiFi network** (not Guest network)

### Step 1: Start HTTPS Server

```bash
cd /Users/admin/projects/sizekit
python3 serve_https.py
```

The server will start on port **8443** with self-signed SSL certificate.

### Step 2: Get Your Computer's IP Address

**On Mac:**
```bash
ipconfig getifaddr en0
```

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address"

**On Linux:**
```bash
hostname -I
```

Example IP: `172.20.10.3`

### Step 3: Open on iPhone

1. Open Safari on your iPhone
2. Navigate to: `https://YOUR_IP:8443/test-measure.html`
   - Example: `https://172.20.10.3:8443/test-measure.html`
3. You'll see a security warning (self-signed certificate)
4. Tap **"Show Details"** → **"Visit this website"** → **"Visit Website"**
5. Grant camera permissions when prompted

---

## Available Test Pages

| URL | Purpose |
|-----|---------|
| `https://YOUR_IP:8443/test-measure.html` | **🎯 Main Testing App** - Single capture with manual adjustment |
| `https://YOUR_IP:8443/debug-measurements.html` | **🔬 Diagnostic Tool** - Step-by-step measurement breakdown |
| `https://YOUR_IP:8443/debug.html` | Real-time continuous detection |
| `https://YOUR_IP:8443/auto-measure.html` | Automatic 3-step flow |

---

## Using the Test App

### test-measure.html (Main Research Tool)

1. **Position Setup:**
   - Place credit card in frame
   - Spread all fingers wide
   - Ensure good lighting
   - Keep hand flat

2. **Capture:**
   - Tap the large white capture button
   - Wait for AI processing

3. **Review Results:**
   - See all 10 nail measurements in millimeters
   - See converted size numbers (0-9)
   - Check scale calibration (should be 4-10 px/mm)

4. **Manual Adjustment:**
   - Tap "✏️ Manual Adjust" button
   - Click left edge of nail
   - Click right edge of nail
   - Compare manual vs AI measurement

5. **Retake:**
   - Tap "🔄 Retake Photo" to try again

---

## Troubleshooting

### ❌ "Can't reach this page" or "Unable to connect"

**Problem:** iPhone can't reach computer

**Solutions:**
1. Check if both devices are on **same WiFi network**
2. **Disable Guest WiFi** - use main network
3. Check firewall isn't blocking port 8443
4. Try using iPhone hotspot:
   ```
   1. Enable iPhone Personal Hotspot
   2. Connect computer to iPhone's hotspot
   3. Get new IP with: ipconfig getifaddr en0
   4. Use new IP in browser
   ```

### ❌ Camera not working

**Problem:** Camera permission denied or not opening

**Solutions:**
1. Refresh page and tap "Allow" when prompted
2. Check Settings → Safari → Camera = Ask
3. Make sure you're using **HTTPS** (not HTTP)
4. Try in private browsing mode

### ❌ "All measurements are way off"

**Problem:** Inaccurate measurements

**Debug Steps:**
1. Open `debug-measurements.html`
2. Check **Scale (px/mm)** - should be 4-10
   - If < 3 or > 15: Card detection is wrong
3. Check **Nail pixels found** - should be 100-500
   - If < 20: Nail detection failed
4. Ensure:
   - Good lighting (no harsh shadows)
   - Card is clearly visible and flat
   - Hand is in focus
   - Camera is steady

### ❌ SSL Certificate Warning

**This is normal!** The server uses a self-signed certificate.

**To accept:**
1. Tap "Show Details"
2. Tap "Visit this website"
3. Confirm "Visit Website"

---

## Technical Details

### Architecture
- **Frontend:** Plain HTML/CSS/JavaScript
- **AI Models:** TensorFlow.js + HandPose (MediaPipe)
- **Detection:** `detection.js` (shared across all pages)
- **Server:** Python HTTPS server with self-signed cert

### How It Works

1. **Credit Card Detection:**
   - Scans for bright rectangular regions
   - Checks aspect ratio (85.6mm × 53.98mm = 1.586)
   - Calculates pixels-per-millimeter scale

2. **Hand Detection:**
   - TensorFlow.js HandPose model
   - Detects 21 landmarks per hand
   - Tracks fingertips and joints

3. **Nail Measurement:**
   - Samples skin tone at finger base
   - Finds bright pixels (nails are lighter than skin)
   - Detects nail boundaries
   - Measures widest span
   - Converts pixels → mm using credit card scale

4. **Size Conversion:**
   - Uses standard nail sizing table
   - Maps millimeters to size numbers 0-9

### File Structure
```
sizekit/
├── test-measure.html           # Main research tool
├── debug-measurements.html     # Diagnostic tool
├── debug.html                  # Real-time testing
├── detection.js                # Core AI detection logic
├── serve_https.py              # HTTPS server
├── server.crt                  # SSL certificate
├── server.key                  # SSL private key
└── SETUP.md                    # This file
```

---

## Alternative: Using ngrok (Optional)

If local network isn't working, use ngrok for public HTTPS:

```bash
# Install ngrok
brew install ngrok   # Mac
# Or download from https://ngrok.com

# Start Python server on port 8000 (HTTP is fine, ngrok adds HTTPS)
cd /Users/admin/projects/sizekit
python3 -m http.server 8000

# In another terminal, start ngrok
ngrok http 8000
```

Ngrok will give you a public HTTPS URL like: `https://abc123.ngrok.io`

Open that URL on your iPhone to test!

---

## Research Notes

### Testing Accuracy

1. **Measure your actual nails with calipers/ruler**
2. **Record ground truth measurements**
3. **Compare with app measurements**
4. **Use manual adjustment to validate detection**

### Key Metrics to Track
- Scale calibration (px/mm)
- Nail pixels detected per finger
- AI measurement vs manual measurement
- Size number accuracy

### Common Issues Found
- Low light causes underdetection
- Card at angle throws off scale
- Dark nail polish reduces contrast
- Hand movement creates blur

---

## Support

Current server IP (on iPhone hotspot): `172.20.10.3:8443`

Server logs show in terminal - watch for errors or 404s.

Press `Ctrl+C` to stop server.

---

**🎯 Primary test URL: `https://172.20.10.3:8443/test-measure.html`**

