import express from "express";
import fsp from "fs/promises";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import pkg from "youtube-dl-exec";
const { exec } = pkg;

const credFile = await fsp.readFile("config/google-auth.json", "utf-8");
const credentials = JSON.parse(credFile);

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

const oAuth2Client = new OAuth2Client({
  client_id: credentials.web.client_id,
  client_secret: credentials.web.client_secret,
  redirectUri: credentials.web.redirect_uris[0]
});

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const clients = [];
app.get("/sse", (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  

  req.on('close', () => {
    console.log('Client Disconnected!');
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });

  console.log('Client Connected!');
  
  clients.push(res);
  res.flushHeaders();
});

app.get("/login", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    response_type: 'code'
  });
  res.redirect(authUrl);
});


app.get("/", async (req, res) => {
  const validToken = await isValidAccessTokenAvailable();

  if(!validToken){
    return res.redirect("/login");
  }

  return res.render("index");
});

app.post("/download", async (req, res) => {
  const playlistId = extractPlalistId(req.body.playlistUrl);

  try {
    const playlistInfo = await getPlaylistInfo(playlistId);
    
    const playlistName = playlistInfo.items[0].snippet.title;
    const playlistItemCount = playlistInfo.items[0].contentDetails.itemCount;

    const playListItemInfo = await getPlaylistItems(playlistId, Math.min(50, playlistItemCount));
    const playlistItems = playListItemInfo.items.map(item => ({
      title: item.snippet.title,
      videoId: item.contentDetails.videoId,
      link: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      downloaded: false
    }));
    
    res.render("download", { playlistName, playlistItems  });

    // check if a folder named playlistName exists inside downloads, if not create it
    await fsp.mkdir(`downloads/${playlistName.replace(/[<>:"\/\\|?*]+/g, '_')}`, { recursive: true });

    for (let i = 0; i < playlistItems.length; i++) {
      broadcastMessage({ index: i, id: item.videoId, title: item.title, status: "downloading" });
      const item = playlistItems[i];
      try {
        await download(item.link, `downloads/${playlistName.replace(/[<>:"\/\\|?*]+/g, '_')}/${item.title}.mp3`);
        console.log(`Downloaded: ${item.title}`);
        item.downloaded = true;
        
        broadcastMessage({ index: i, id: item.videoId, title: item.title, status: "downloaded" });
      } catch (error) {
        console.log(`Error downloading ${item.title}:`, error);
        broadcastMessage({ index: i, id: item.videoId, title: item.title, status: "error" });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Failed to fetch playlist info");
  }

});

app.get("/auth/callback/google", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  try {

    await fsp.writeFile("tokens.json", JSON.stringify(tokens, null, 2), "utf-8");

    return res.redirect("/");
  } catch (error) {
    console.log(error);
    return res.send("Login Failed");
  }
});

async function isValidAccessTokenAvailable() {
  try {
    const credFile = await fsp.readFile("tokens.json", "utf-8");
    const tokens = JSON.parse(credFile);

    if(tokens.expiry_date && tokens.expiry_date > (Date.now() - (10 * 60 * 1000))) {
      return true;
    }

    if(tokens.refresh_token) {
      const refreshed = await refreshAccessToken();
      return refreshed;
    }

  } catch (error) {
    if(error.code === 'ENOENT') {
      console.log("No tokens.json file found.");
    } else {
      console.log(error);
    }
  }

  return false;
}


// ytdl(videoURL, { quality: "highestaudio" })
//   .pipe(fs.createWriteStream("temp_audio.webm"))
//   .on("finish", () => {
//     // Convert to mp3 using ffmpeg
//     ffmpeg("temp_audio.webm")
//       .audioBitrate(128)
//       .save(outputFile)
//       .on("end", () => {
//         console.log("✅ Audio downloaded and saved as", outputFile);
//         fs.unlinkSync("temp_audio.webm"); // delete temp file
//       })
//       .on("error", (err) => console.error("FFmpeg error:", err));
//   });


app.listen(5000, (error) => {
  if (error) {
    console.error("Failed to start server:", error);
    return;
  }
  console.log("Server started on http://localhost:5000");
});



// ------------ UTILS -------------
function broadcastMessage(message) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  });
}

function extractPlalistId(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("list");
}

function download(link, path) {
  return exec(link, {
    extractAudio: true,
    audioFormat: "mp3",
    output: path
  });
}

async function getAccessToken() {
  const credFile = await fsp.readFile("tokens.json", "utf-8");
  const tokens = JSON.parse(credFile);
  oAuth2Client.setCredentials(tokens);
  return tokens.access_token;
}

async function getPlaylistInfo(playlistId) {
  const accessToken = await getAccessToken();
  const response = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
    params: {
      part: 'snippet,contentDetails',
      id: playlistId
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response.data;
}

async function getPlaylistItems(playlistId, maxResults = 50, pageToken = null) {
  const accessToken = await getAccessToken();
  const params = {
    part: 'snippet,contentDetails',
    playlistId: playlistId,
    maxResults: maxResults
  };
  if(pageToken) {
    params.pageToken = pageToken;
  }
  const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: params,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response.data;
}

async function refreshAccessToken() {
  const credFile = await fsp.readFile("tokens.json", "utf-8");
  const tokens = JSON.parse(credFile);
  oAuth2Client.setCredentials(tokens);
  try {
    const newTokens = await oAuth2Client.refreshAccessToken();
    await fsp.writeFile("tokens.json", JSON.stringify(newTokens.credentials, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return false;    
  }
}