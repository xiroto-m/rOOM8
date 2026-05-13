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
      console.log(`Fetching statistics for YouTube handle: ${handle}`);
      
      // Use forHandle parameter (supported since late 2023)
      const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      channelUrl.searchParams.append('part', 'statistics');
      channelUrl.searchParams.append('forHandle', handle);
      channelUrl.searchParams.append('key', apiKey);

      const channelResponse = await fetch(channelUrl.toString());
      
      if (!channelResponse.ok) {
        const errorData = await channelResponse.json().catch(() => ({}));
        console.error("YouTube API Error:", channelResponse.status, errorData);
        throw new Error(`YouTube API returned ${channelResponse.status}`);
      }

      const data = await channelResponse.json();

      if (data.items && data.items.length > 0) {
        const subscriberCount = parseInt(data.items[0].statistics.subscriberCount);
        console.log(`Successfully fetched ${subscriberCount} subscribers for ${handle}`);
        return res.json({ subscriberCount });
      }

      // If forHandle fails or returns no items, try search as fallback
      console.log(`Search fallback for handle: ${handle}`);
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.append('part', 'snippet');
      searchUrl.searchParams.append('q', handle);
      searchUrl.searchParams.append('type', 'channel');
      searchUrl.searchParams.append('maxResults', '1');
      searchUrl.searchParams.append('key', apiKey);

      const searchResponse = await fetch(searchUrl.toString());
      const searchData = await searchResponse.json().catch(() => ({}));
      
      if (searchData.items && searchData.items.length > 0) {
        const channelId = searchData.items[0].snippet.channelId;
        console.log(`Found channelId via search: ${channelId}`);
        
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
        statsUrl.searchParams.append('part', 'statistics');
        statsUrl.searchParams.append('id', channelId);
        statsUrl.searchParams.append('key', apiKey);

        const statsResponse = await fetch(statsUrl.toString());
        const statsData = await statsResponse.json().catch(() => ({}));
        
        if (statsData.items && statsData.items.length > 0) {
          const subscriberCount = parseInt(statsData.items[0].statistics.subscriberCount);
          console.log(`Success via search fallback: ${subscriberCount} subscribers`);
          return res.json({ subscriberCount });
        }
      }

      console.warn(`Channel "${handle}" not found via forHandle or Search API.`);
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
