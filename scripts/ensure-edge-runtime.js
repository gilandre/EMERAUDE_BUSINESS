/**
 * Corrige l'erreur ENOENT edge-runtime-webpack.js en dev.
 * Next.js peut ne pas créer ce fichier à temps quand deux processus (api + web) partagent .next.
 * Ce script copie webpack-runtime.js vers edge-runtime-webpack.js dès que possible.
 */
const fs = require("fs");
const path = require("path");

const NEXT_DIR = path.join(__dirname, "..", ".next", "server");
const RUNTIME = path.join(NEXT_DIR, "webpack-runtime.js");
const EDGE_RUNTIME = path.join(NEXT_DIR, "edge-runtime-webpack.js");

function tryCopy() {
  try {
    if (!fs.existsSync(RUNTIME)) return false;
    if (fs.existsSync(EDGE_RUNTIME)) return true;
    fs.copyFileSync(RUNTIME, EDGE_RUNTIME);
    console.log("[ensure-edge-runtime] Copié webpack-runtime.js -> edge-runtime-webpack.js");
    return true;
  } catch (e) {
    return false;
  }
}

// Une exécution unique
if (tryCopy()) process.exit(0);
process.exit(1);
