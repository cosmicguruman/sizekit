# 🚀 Quick Start Guide

Get the camera working on your phone in **under 5 minutes**.

## Fastest Method: Using ngrok

### Step 1: Start Local Server
```bash
cd /Users/admin/projects/sizekit
python3 -m http.server 8000
```

### Step 2: Install ngrok (if needed)
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/
```

### Step 3: Expose via ngrok
```bash
# In a new terminal
ngrok http 8000
```

### Step 4: Open on Phone
1. Copy the **HTTPS** URL from ngrok (e.g., `https://abc123.ngrok.io`)
2. Open it on your phone
3. Tap "Open Camera"
4. Grant permission
5. **Verify back camera opens!**

---

## Alternative: Python HTTPS Server (No External Tools)

### Step 1: Generate Certificate (one-time)
```bash
cd /Users/admin/projects/sizekit
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```
(Press Enter for all prompts)

### Step 2: Start HTTPS Server
```bash
python3 serve_https.py
```

### Step 3: Find Your Local IP
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Look for something like `192.168.1.100`

### Step 4: Open on Phone
1. Connect phone to **same WiFi**
2. Open `https://YOUR_LOCAL_IP:8443`
3. Accept security warning ("Advanced" → "Proceed")
4. Tap "Open Camera"
5. Grant permission
6. **Verify back camera opens!**

---

## Using Node.js (Optional)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Generate Certificate (if not done)
```bash
# Option A: Using mkcert (recommended)
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Option B: Using OpenSSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Step 3: Start Server
```bash
npm start
```

### Step 4: Test
- Desktop: `https://localhost:8443`
- Mobile: `https://YOUR_LOCAL_IP:8443`

---

## ✅ Verification

**The camera is working correctly if:**
- Tapping "Open Camera" opens camera instantly
- **Back camera** is active (point at something to verify)
- Full-screen video preview is shown
- No errors in browser console

---

## 🐛 Quick Troubleshooting

**Problem:** "Must be HTTPS"
- **Fix:** Use ngrok or the HTTPS server methods above

**Problem:** Permission denied
- **Fix:** Settings → Safari/Chrome → Allow camera for this site

**Problem:** Can't access on phone
- **Fix:** Ensure phone and computer are on same WiFi

**Problem:** Front camera opens instead
- **Fix:** Check browser console - might be device limitation

---

## 📱 Recommended Testing Order

1. ✅ **ngrok** - Easiest, works immediately
2. ✅ Python HTTPS server - No external dependencies after setup
3. ✅ Node.js server - If you prefer Node ecosystem

---

**That's it!** Once camera works, you're ready for Phase 2.

For detailed troubleshooting, see [README.md](README.md).
