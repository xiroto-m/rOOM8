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
      console.warn("YouTube API Key is missing in environment variables.");
      return res.status(400).json({ 
        error: "YouTube API Key is not configured.",
        subscriberCount: 10
      });
    }

    try {
      const handle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
      console.log(`Fetching subscriber count for handle: ${handle}`);
      
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${handle}&key=${apiKey}`
      );
      
      if (!channelResponse.ok) {
        const errorData = await channelResponse.json();
        console.error("YouTube API Error Response:", errorData);
        throw new Error(`YouTube API returned ${channelResponse.status}`);
      }

      const data = await channelResponse.json();

      if (data.items && data.items.length > 0) {
        const subscriberCount = parseInt(data.items[0].statistics.subscriberCount);
        console.log(`Success: Found ${subscriberCount} subscribers via forHandle`);
        return res.json({ subscriberCount });
      }

      // Fallback: Try search to find channel ID
      console.log(`Handle search failed, trying search.list fallback for: ${handle}`);
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${apiKey}`
      );
      
      const searchData = await searchResponse.json();
      
      if (searchData.items && searchData.items.length > 0) {
        const channelId = searchData.items[0].snippet.channelId;
        console.log(`Found channelId via search: ${channelId}`);
        
        const statsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
        );
        const statsData = await statsResponse.json();
        
        if (statsData.items && statsData.items.length > 0) {
          const subscriberCount = parseInt(statsData.items[0].statistics.subscriberCount);
          console.log(`Success: Found ${subscriberCount} subscribers via search fallback`);
          return res.json({ subscriberCount });
        }
      }

      console.warn("Channel count not found via any method.");
      return res.status(404).json({ 
        error: "Channel not found.",
        subscriberCount: 10
      });
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
