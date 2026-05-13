import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to fetch YouTube subscribers
  app.get("/api/youtube-subscribers", async (req, res) => {
    // Check various common env var names for the API key
    const apiKey = process.env.YOUTUBE_API_KEY || 
                   process.env.VITE_YOUTUBE_API_KEY || 
                   process.env.VITE_YOUTUBE_API_KE;
    
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
