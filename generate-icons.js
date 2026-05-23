import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

async function generateIcons() {
  try {
    const svgPath = path.join(process.cwd(), "public", "favicon.svg");
    const svgContent = await fs.readFile(svgPath);

    // Target PNG output file paths
    const publicApplePath = path.join(process.cwd(), "public", "apple-touch-icon.png");
    const publicFaviconPath = path.join(process.cwd(), "public", "favicon.png");

    // Make sure we write to public/ first
    await sharp(svgContent)
      .resize(180, 180)
      .png()
      .toFile(publicApplePath);
    console.log("Successfully generated public/apple-touch-icon.png (180x180)");

    await sharp(svgContent)
      .resize(192, 192)
      .png()
      .toFile(publicFaviconPath);
    console.log("Successfully generated public/favicon.png (192x192)");

    // If dist/ exists or is created afterwards during vite build, 
    // Vite will automatically copy public/ contents to dist/.
  } catch (error) {
    console.error("Error generating icons during build process:", error);
  }
}

generateIcons();
