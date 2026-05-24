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
    const public32Path = path.join(process.cwd(), "public", "favicon-32x32.png");
    const public16Path = path.join(process.cwd(), "public", "favicon-16x16.png");
    const publicIcoPath = path.join(process.cwd(), "public", "favicon.ico");
    const publicAndroid192Path = path.join(process.cwd(), "public", "android-chrome-192x192.png");
    const publicAndroid512Path = path.join(process.cwd(), "public", "android-chrome-512x512.png");

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

    await sharp(svgContent)
      .resize(32, 32)
      .png()
      .toFile(public32Path);
    console.log("✅ [Icon Generator] Successfully generated public/favicon-32x32.png (32x32)");

    await sharp(svgContent)
      .resize(16, 16)
      .png()
      .toFile(public16Path);
    console.log("✅ [Icon Generator] Successfully generated public/favicon-16x16.png (16x16)");

    // Convert or copy a 32x32 PNG as .ico (Modern browsers perfectly recognize PNG files named with .ico extension)
    await sharp(svgContent)
      .resize(32, 32)
      .png()
      .toFile(publicIcoPath);
    console.log("✅ [Icon Generator] Successfully generated public/favicon.ico (32x32 fallback)");

    await sharp(svgContent)
      .resize(192, 192)
      .png()
      .toFile(publicAndroid192Path);
    console.log("✅ [Icon Generator] Successfully generated public/android-chrome-192x192.png (192x192)");

    await sharp(svgContent)
      .resize(512, 512)
      .png()
      .toFile(publicAndroid512Path);
    console.log("✅ [Icon Generator] Successfully generated public/android-chrome-512x512.png (512x512)");

  } catch (error) {
    console.warn("⚠️ [Icon Generator] Error generating icons during build process:", error.message || error);
  }
}

generateIcons();
