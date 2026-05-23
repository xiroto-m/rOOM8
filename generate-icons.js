import fs from "fs/promises";
import path from "path";

async function generateIcons() {
  try {
    const svgPath = path.join(process.cwd(), "public", "favicon.svg");
    try {
      await fs.access(svgPath);
    } catch {
      console.warn("⚠️ [Icon Generator] public/favicon.svg not found. Skipping static generation.");
      return;
    }

    const svgContent = await fs.readFile(svgPath);

    // Dynamic import to prevent syntax/module load errors if sharp fails to install/compile on GitHub/CI
    let sharp;
    try {
      const sharpModule = await import("sharp");
      sharp = sharpModule.default || sharpModule;
    } catch (sharpLoadError) {
      console.warn("⚠️ [Icon Generator] 'sharp' library could not be loaded. (Often happens in minimal GitHub/CI environments without platform C++ binaries). Skipping icon building step; pre-existing icons in public/ will be used intact.", sharpLoadError.message);
      return;
    }

    // Target PNG output file paths
    const publicApplePath = path.join(process.cwd(), "public", "apple-touch-icon.png");
    const publicFaviconPath = path.join(process.cwd(), "public", "favicon.png");

    // Make sure we write to public/ first
    await sharp(svgContent)
      .resize(180, 180)
      .png()
      .toFile(publicApplePath);
    console.log("✅ [Icon Generator] Successfully generated public/apple-touch-icon.png (180x180)");

    await sharp(svgContent)
      .resize(192, 192)
      .png()
      .toFile(publicFaviconPath);
    console.log("✅ [Icon Generator] Successfully generated public/favicon.png (192x192)");

  } catch (error) {
    console.warn("⚠️ [Icon Generator] Error generating icons during build process:", error.message || error);
  }
}

generateIcons();
