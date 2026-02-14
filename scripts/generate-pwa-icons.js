const fs = require("fs");
const path = require("path");

async function generateIcons() {
  try {
    const sharp = require("sharp");
    const publicDir = path.join(__dirname, "..", "public");
    const iconsDir = path.join(publicDir, "icons");

    for (const size of [192, 512]) {
      const svgPath = path.join(iconsDir, `icon-${size}.svg`);
      const pngPath = path.join(publicDir, `icon-${size}x${size}.png`);

      if (fs.existsSync(svgPath)) {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        console.log(`Created ${pngPath}`);
      }
    }

    return true;
  } catch (err) {
    console.warn("Could not generate PNG icons (sharp):", err.message);
    return false;
  }
}

generateIcons();
