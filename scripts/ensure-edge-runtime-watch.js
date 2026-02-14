/**
 * Surveille .next/server et copie webpack-runtime.js -> edge-runtime-webpack.js
 * quand le fichier cible manque (corrige ENOENT en dev avec dev:all).
 */
const fs = require("fs");
const path = require("path");

const NEXT_DIR = path.join(__dirname, "..", ".next", "server");
const RUNTIME = path.join(NEXT_DIR, "webpack-runtime.js");
const EDGE_RUNTIME = path.join(NEXT_DIR, "edge-runtime-webpack.js");

const INTERVAL_MS = 1500;
const MAX_RUNS = 120; // ~6 min max

let runs = 0;

function tryCopy() {
  try {
    if (!fs.existsSync(NEXT_DIR)) return;
    if (!fs.existsSync(RUNTIME)) return;
    if (fs.existsSync(EDGE_RUNTIME)) return;
    fs.copyFileSync(RUNTIME, EDGE_RUNTIME);
    console.log("[ensure-edge-runtime] edge-runtime-webpack.js créé (copie de webpack-runtime.js)");
  } catch (_) {}
}

const id = setInterval(() => {
  tryCopy();
  runs++;
  if (runs >= MAX_RUNS) clearInterval(id);
}, INTERVAL_MS);
