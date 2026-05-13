# QR Access Control System

A fully offline, mobile-friendly QR door access system. Runs on any device with a browser and camera.

---

## Project Structure

```
qr-access-control/
├── index.html      ← Main app (UI + scanning logic)
├── codes.js        ← Valid QR code database (edit this!)
├── jsQR.js         ← QR scanning library (local, no CDN)
├── server.js       ← Local HTTP server
├── package.json
└── README.md
```

---

## Quick Start

### Option A — Node.js server (recommended for phones)

```bash
npm install
npm start
```

Then open **http://YOUR-LOCAL-IP:8080** on your phone.
The server prints the network URL on startup.

### Option B — Open directly in browser

Just double-click `index.html` or drag it into Chrome/Firefox.

> ⚠️ **Camera limitation:** Browsers require **HTTPS or localhost** for camera access.
> If opening via file:// on a phone doesn't work, use Option A with HTTPS (see below).

---

## Enabling HTTPS for Phone Camera (Required for most phones)

Phones block camera access on plain HTTP. Two easy options:

### Option 1 — mkcert (best for permanent installs)

```bash
# Install mkcert (https://github.com/FiloSottile/mkcert)
brew install mkcert      # macOS
choco install mkcert     # Windows
sudo apt install mkcert  # Linux

mkcert -install
mkcert localhost 192.168.x.x   # add your local IP

# Then edit server.js to use https module with the generated cert files
```

### Option 2 — ngrok (quickest for testing)

```bash
npm start                          # start local server first
ngrok http 8080                    # in another terminal
# Open the https://xxxx.ngrok.io URL on your phone
```

### Option 3 — Chrome flags (dev only)

On Android Chrome, go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
Add your server's IP+port and enable it.

---

## Adding / Removing Valid QR Codes

Edit **`codes.js`** — it's just a JavaScript array:

```js
const VALID_CODES = [
  "ACC-001-ALPHA-7749",    // ← your valid codes here
  "https://open.spotify.com/",
  // add more...
  // "OLD-CODE-TO-REMOVE",   ← comment out or delete to revoke
];
```

Save the file and refresh the browser. No restart needed.

---

## Generating QR Codes for Your Valid Codes

Use any free QR generator. The string you encode must **exactly match** an entry in `codes.js`.

**Free tools:**
- https://www.qr-code-generator.com
- https://goqr.me
- `qrencode` CLI: `qrencode -t PNG -o code1.png "ACC-001-ALPHA-7749"`

**Print tip:** Print each QR code on a card or badge. The scanner reads them at ~20cm distance.

---

## How It Works

1. App loads in **LOCKED** state (red UI)
2. Camera scans continuously at ~5 fps
3. Each frame is decoded by jsQR
4. If the decoded string is in `codes.js` → **UNLOCKED** (green, 4 seconds) → auto-relock
5. If not in the list → **ACCESS DENIED** (red flash, 2.5 seconds) → back to scanning

---

## Pre-loaded Sample Codes

| Code ID | Value |
|---------|-------|
| ACC-001 | `ACC-001-ALPHA-7749` |
| ACC-002 | `ACC-002-BRAVO-3812` |
| ACC-003 | `ACC-003-CHARLIE-5521` |
| ACC-004 | `ACC-004-DELTA-9934` |
| ACC-005 | `ACC-005-ECHO-1177` |
| ACC-006 | `ACC-006-FOXTROT-6643` |
| ACC-007 | `ACC-007-GOLF-2258` |
| ACC-008 | `ACC-008-HOTEL-8819` |
| ACC-009 | `ACC-009-INDIA-4401` |
| ACC-010 | `ACC-010-JULIET-7762` |

---

## Browser Compatibility

| Browser | Works? |
|---------|--------|
| Chrome (Android) | ✅ Best |
| Safari (iOS 14.3+) | ✅ |
| Firefox (Android) | ✅ |
| Desktop Chrome/Firefox | ✅ |
| IE / Old Edge | ❌ |

---

## Mounting Tips for Door Use

- Mount phone/tablet in **landscape or portrait** — UI adapts to both
- Set device to **never sleep** (Settings → Display → Screen timeout → Never)
- Enable **guided access / kiosk mode** to prevent accidental navigation
- Use **full-screen mode** (browser → "Add to Home Screen" on iOS/Android)
