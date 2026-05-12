import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to fetch YouTube subscribers
  app.get("/api/youtube-subscribers", async (req, res) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelHandle = "@tackyosya955";

    if (!apiKey) {
      return res.status(400).json({ 
        error: "YouTube API Key is not configured.",
        subscriberCount: 10 // Fallback to manual value
      });
    }

    try {
      // First, get the channel ID from the handle
      // The handle usually starts with @
      const handle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
      
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${handle}&key=${apiKey}`
      );
      
      const data = await channelResponse.json();

      if (data.items && data.items.length > 0) {
        const subscriberCount = parseInt(data.items[0].statistics.subscriberCount);
        return res.json({ subscriberCount });
      } else {
        return res.status(404).json({ 
          error: "Channel not found.",
          subscriberCount: 10
        });
      }
    } catch (error) {
      console.error("Error fetching YouTube subscribers:", error);
      return res.status(500).json({ 
        error: "Failed to fetch subscriber count.",
        subscriberCount: 10
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
