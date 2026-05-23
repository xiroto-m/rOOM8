import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

let stripe: Stripe | null = null;
function getStripeInstance() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY || 
                process.env.VITE_STRIPE_SECRET_KEY ||
                process.env.STRIPE_SECRET_KE;
    if (!key) {
      console.warn("Stripe Secret Key is missing in environment variables.");
    } else {
      console.log("Stripe Client initialized with secret key starting with:", key.substring(0, 7));
    }
    stripe = new Stripe(key || "", {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripe;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Config Endpoint to expose public keys safely
  app.get("/api/config", (req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || 
                          process.env.VITE_STRIPE_PUBLISH ||
                          process.env.VITE_STRIPE_PUBLISHABLE ||
                          process.env.STRIPE_PUBLISHABLE_KEY;
    
    res.json({
      stripePublishableKey: publishableKey || null
    });
  });

  // Stripe Checkout Session Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    const { priceId, productId } = req.body;
    const cleanPriceId = typeof priceId === 'string' ? priceId.replace(/\s/g, '') : priceId;
    
    // Dynamic URL detection
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    console.log(`Setting up checkout for product: ${productId}, price: ${priceId}`);
    console.log(`Using App URL for redirect: ${appUrl}`);

    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }

    try {
      const stripeClient = getStripeInstance();
      
      // Basic validation of the key before calling Stripe
      const key = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KE;
      if (!key || !key.startsWith('sk_')) {
        throw new Error("Stripe secret key is not configured correctly (should start with sk_). Please check your Settings -> Secrets (Make sure name is STRIPE_SECRET_KEY).");
      }

      const session = await stripeClient.checkout.sessions.create({
        line_items: [
          {
            price: cleanPriceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/#/shop?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/#/shop?canceled=true`,
        metadata: {
          productId: productId || 'unknown',
        },
      });

      console.log("Session created successfully:", session.id);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error Details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to fetch YouTube subscribers
  app.get("/api/youtube-subscribers", async (req, res) => {
    // Check various common env var names for the API key
    const apiKey = process.env.YOUTUBE_API_KEY || 
                   process.env.VITE_YOUTUBE_API_KEY || 
                   process.env.VITE_YOUTUBE_API_KE ||
                   process.env.VITE_YOUTUBE_API_K;
    
    // Get handle from query or default
    const queryHandle = req.query.handle as string;
    const channelHandle = queryHandle || "@tackyosya955";

    if (!apiKey) {
      console.warn("YouTube API Key is missing in environment variables. Checked: YOUTUBE_API_KEY, VITE_YOUTUBE_API_KEY, VITE_YOUTUBE_API_KE");
      return res.status(400).json({ 
        error: "YouTube API Key is not configured."
      });
    }

    try {
      const handle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
      console.log(`Fetching statistics for YouTube handle: ${handle}`);
      
      const fetchHeaders = {
        'User-Agent': 'Room8App/1.0 YouTube Subscriber Counter',
        'Accept': 'application/json'
      };

      // 1. Try forHandle parameter (supported for handles like @tackyosya955)
      const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      channelUrl.searchParams.append('part', 'statistics,snippet');
      channelUrl.searchParams.append('forHandle', handle);
      channelUrl.searchParams.append('key', apiKey);

      const channelResponse = await fetch(channelUrl.toString(), { headers: fetchHeaders });
      
      if (channelResponse.ok) {
        const data = await channelResponse.json();
        if (data.items && data.items.length > 0) {
          const subscriberCount = parseInt(data.items[0].statistics.subscriberCount);
          console.log(`Successfully fetched ${subscriberCount} subscribers for ${handle} via forHandle`);
          return res.json({ subscriberCount });
        }
      } else {
        const errorData = await channelResponse.json().catch(() => ({}));
        console.error("YouTube API (forHandle) Error:", channelResponse.status, errorData);
      }

      // 2. Fallback: Search API to find channel ID
      console.log(`Search fallback for handle: ${handle}`);
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.append('part', 'snippet');
      searchUrl.searchParams.append('q', handle);
      searchUrl.searchParams.append('type', 'channel');
      searchUrl.searchParams.append('maxResults', '1');
      searchUrl.searchParams.append('key', apiKey);

      const searchResponse = await fetch(searchUrl.toString(), { headers: fetchHeaders });
      
      if (!searchResponse.ok) {
        const searchError = await searchResponse.json().catch(() => ({}));
        console.error("YouTube Search API Error:", searchResponse.status, searchError);
        throw new Error(`YouTube API returned ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.items && searchData.items.length > 0) {
        const channelId = searchData.items[0].snippet.channelId;
        console.log(`Found channelId via search: ${channelId}`);
        
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
        statsUrl.searchParams.append('part', 'statistics');
        statsUrl.searchParams.append('id', channelId);
        statsUrl.searchParams.append('key', apiKey);

        const statsResponse = await fetch(statsUrl.toString(), { headers: fetchHeaders });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.items && statsData.items.length > 0) {
            const subscriberCount = parseInt(statsData.items[0].statistics.subscriberCount);
            console.log(`Success via search fallback: ${subscriberCount} subscribers`);
            return res.json({ subscriberCount });
          }
        } else {
          const statsError = await statsResponse.json().catch(() => ({}));
          console.error("YouTube Stats API Error:", statsResponse.status, statsError);
        }
      }

      console.warn(`Channel "${handle}" not found via forHandle or Search API.`);
      return res.status(404).json({ 
        error: "Channel not found."
      });
    } catch (error) {
      console.error("Error fetching YouTube subscribers:", error);
      return res.status(500).json({ 
        error: "Failed to fetch subscriber count."
      });
    }
  });

  // Pre-render Apple Touch Icon and Favicon PNGs from SVG using Sharp on startup
  const generateIconsWithSharp = async () => {
    try {
      const fs = await import("fs/promises");
      const sharp = (await import("sharp")).default;
      
      const svgPath = path.join(process.cwd(), "public", "favicon.svg");
      const svgContent = await fs.readFile(svgPath);
      
      // Target PNG output file paths
      const publicApplePath = path.join(process.cwd(), "public", "apple-touch-icon.png");
      const publicFaviconPath = path.join(process.cwd(), "public", "favicon.png");
      
      // Pre-render 180x180 PNG for high-res Apple Devices (apple-touch-icon)
      await sharp(svgContent)
        .resize(180, 180)
        .png()
        .toFile(publicApplePath);
      console.log("Pre-rendered sharp: public/apple-touch-icon.png (180x180)");
      
      // Pre-render 192x192 PNG for Favicon
      await sharp(svgContent)
        .resize(192, 192)
        .png()
        .toFile(publicFaviconPath);
      console.log("Pre-rendered sharp: public/favicon.png (192x192)");
      
      // Also pre-render to dist/ if it exists so production can also serve them
      const distPath = path.join(process.cwd(), "dist");
      try {
        await fs.access(distPath);
        await sharp(svgContent)
          .resize(180, 180)
          .png()
          .toFile(path.join(distPath, "apple-touch-icon.png"));
        await sharp(svgContent)
          .resize(192, 192)
          .png()
          .toFile(path.join(distPath, "favicon.png"));
        console.log("Pre-rendered sharp files also copied to dist/");
      } catch {
        // dist/ directory doesn't exist yet (normal in dev mode)
      }
    } catch (e) {
      console.error("Failed to pre-render icons with Sharp:", e);
    }
  };

  // Run the generator immediately
  generateIconsWithSharp();

  // Stub save-icons endpoint for background capability
  app.post("/api/save-icons", (req, res) => {
    return res.json({ success: true, message: "Handled by sharp on startup" });
  });

  // Favicon update endpoint from Admin Dashboard (supports both current and fallback paths)
  const handleUpdateSiteIcon = async (req: express.Request, res: express.Response) => {
    try {
      const { fileData, mimeType } = req.body; // fileData is base64 string
      if (!fileData) {
        return res.status(400).json({ error: "fileData (base64 string) is required" });
      }

      const buffer = Buffer.from(fileData.split(",")[1] || fileData, "base64");
      const fs = await import("fs/promises");
      const sharp = (await import("sharp")).default;

      const publicDir = path.join(process.cwd(), "public");
      const distDir = path.join(process.cwd(), "dist");

      const publicApplePath = path.join(publicDir, "apple-touch-icon.png");
      const publicFaviconPath = path.join(publicDir, "favicon.png");
      const publicSvgPath = path.join(publicDir, "favicon.svg");

      let hasDist = false;
      try {
        await fs.access(distDir);
        hasDist = true;
      } catch {}

      if (mimeType === "image/svg+xml" || fileData.startsWith("data:image/svg+xml")) {
        // It's SVG
        const svgContent = buffer.toString("utf-8");
        
        // Write public/favicon.svg
        await fs.writeFile(publicSvgPath, svgContent);
        if (hasDist) {
          await fs.writeFile(path.join(distDir, "favicon.svg"), svgContent);
        }

        // Generate PNGs from SVG
        await sharp(Buffer.from(svgContent))
          .resize(180, 180)
          .png()
          .toFile(publicApplePath);
        
        await sharp(Buffer.from(svgContent))
          .resize(192, 192)
          .png()
          .toFile(publicFaviconPath);

        if (hasDist) {
          await sharp(Buffer.from(svgContent))
            .resize(180, 180)
            .png()
            .toFile(path.join(distDir, "apple-touch-icon.png"));
          
          await sharp(Buffer.from(svgContent))
            .resize(192, 192)
            .png()
            .toFile(path.join(distDir, "favicon.png"));
        }
      } else {
        // It's a standard raster image (PNG, JPEG, etc.)
        // Write the custom wrapped SVG so /favicon.svg works too!
        const resizedPngBufferBase64 = (await sharp(buffer)
          .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()).toString("base64");

        const svgWrapper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%"><image href="data:image/png;base64,${resizedPngBufferBase64}" width="512" height="512" /></svg>`;
        
        await fs.writeFile(publicSvgPath, svgWrapper);
        if (hasDist) {
          await fs.writeFile(path.join(distDir, "favicon.svg"), svgWrapper);
        }

        // Generate specific PNG outputs
        await sharp(buffer)
          .resize(180, 180)
          .png()
          .toFile(publicApplePath);
        
        await sharp(buffer)
          .resize(192, 192)
          .png()
          .toFile(publicFaviconPath);

        if (hasDist) {
          await sharp(buffer)
            .resize(180, 180)
            .png()
            .toFile(path.join(distDir, "apple-touch-icon.png"));
          
          await sharp(buffer)
            .resize(192, 192)
            .png()
            .toFile(path.join(distDir, "favicon.png"));
        }
      }

      console.log("Admin successfully updated favicon images across public and dist folders!");

      return res.json({ success: true, message: "Favicon updated successfully" });
    } catch (error: any) {
      console.error("Error updating favicon in API:", error);
      return res.status(500).json({ error: error.message || "Failed to update favicon" });
    }
  };

  app.post("/api/update-site-icon", handleUpdateSiteIcon);
  app.post("/api/update-favicon", handleUpdateSiteIcon);

  // Favicon and apple-touch-icon serving route with robust MIME-types and CORS support
  const handleServeFavicon = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Set CORS headers so standard crossorigin requests from iOS Safari don't get blocked
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    
    // Explicitly set correct content-types to guarantee the MIME property
    const ext = path.extname(req.path);
    if (ext === ".png") {
      res.setHeader("Content-Type", "image/png");
    } else if (ext === ".ico") {
      res.setHeader("Content-Type", "image/x-icon");
    } else if (ext === ".svg") {
      res.setHeader("Content-Type", "image/svg+xml");
    }

    const fs = await import("fs/promises");
    const filePath = path.join(process.cwd(), "public", req.path);
    try {
      await fs.access(filePath);
      // Serve the local generated or asset files directly
      res.sendFile(filePath);
    } catch {
      // Check dist next
      const distFilePath = path.join(process.cwd(), "dist", req.path);
      try {
        await fs.access(distFilePath);
        res.sendFile(distFilePath);
      } catch {
        if (req.path === "/favicon.svg") {
          res.status(404).send("Not found");
        } else {
          // Fallback to svg if somehow the PNG files are missing
          res.redirect("/favicon.svg?v=room8_v2");
        }
      }
    }
  };

  app.get("/favicon.ico", handleServeFavicon);
  app.get("/favicon.png", handleServeFavicon);
  app.get("/apple-touch-icon.png", handleServeFavicon);
  app.get("/favicon.svg", handleServeFavicon);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: process.cwd(),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
