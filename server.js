/**
 * QR Access Control — Local Server
 * ==================================
 * Serves the app over HTTP on your local network.
 * For camera access on phones, use the HTTPS option (see README).
 *
 * Usage:  node server.js
 *         node server.js --port 3000
 */

const express = require("express");
const path    = require("path");
const os      = require("os");

const app  = express();
const PORT = parseInt(process.argv.find(a => a.startsWith("--port="))?.split("=")[1] || "8080");

// Serve everything in the project folder as static files
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for any unknown route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Get local IP for phone access
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       QR Access Control — Server Ready       ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Local:   http://localhost:${PORT}              ║`);
  console.log(`║  Network: http://${ip}:${PORT}           ║`);
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║  ⚠️  For camera on phones, see HTTPS note    ║");
  console.log("║     in README.md (mkcert or ngrok)           ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
});
