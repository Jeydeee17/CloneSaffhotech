/**
 * QR Access Control — Valid Codes Database
 * ==========================================
 * Add or remove valid QR codes from the VALID_CODES array below.
 * Each entry is the exact string encoded in the QR code.
 *
 * To generate QR codes for these values, use any free QR generator:
 *   https://www.qr-code-generator.com  (or any offline tool)
 */
/**
 * QR Access Control — Valid Codes Database
 */

const VALID_CODES = [
  "https://en.wikipedia.org/wiki/Main_Page", // Exactly what was in the browser
  "https://youtu.be/dQw4w9WgXcQ",           // YouTube short link
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://en.wikipedia.org/wiki/Special:Random",
  "https://dialed.gg/", // Standard YouTube link
];

if (typeof module !== "undefined") module.exports = VALID_CODES;