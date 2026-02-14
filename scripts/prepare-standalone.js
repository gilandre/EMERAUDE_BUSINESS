#!/usr/bin/env node
/**
 * Copie les dossiers public et .next/static vers .next/standalone avant le démarrage.
 * Requis pour le mode standalone de Next.js.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");

if (!fs.existsSync(standaloneDir)) {
  console.error("✗ .next/standalone not found. Run npm run build first.");
  process.exit(1);
}

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✓ Copied public folder");
}

if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✓ Copied .next/static folder");
}
