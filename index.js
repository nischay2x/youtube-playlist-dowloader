// import { list } from "./string-to-json-online.js";
import { list } from "./list.js";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";

async function download(link, title) {
  return new Promise((resolve, reject) => {
    const videoUrl = link;

    const options = {
      filter: 'audioonly'
    };

    const formattedTitle = title.replace(/[^a-zA-Z0-9]/g, "-");
    const audioStream = ytdl(videoUrl, options);
    const outputPath = `output/${formattedTitle}.mp3`;

    const ffmpegProcess = ffmpeg(audioStream)
      .audioBitrate(320)
      .save(outputPath);

    ffmpegProcess.on('end', () => {
      console.log(`Audio downloaded and converted --> ${formattedTitle}`);
      resolve();
    });

    ffmpegProcess.on('error', (err) => {
      console.error('Error occurred during download and conversion:', err);
      reject();
    });
  })
}


async function start() {
  let total = list.length;
  for (let i = 0; i < total; i++) {
    try {
      await download(list[i].link, list[i].title)
      console.log(`${i + 1} Downloaded, ${total - i - 1} Remaining`);
    } catch (error) {
      console.log("Error at "+i);
      continue;
    }
  }
};
start();

/*
let list = []; 
document.querySelectorAll('a.yt-simple-endpoint').forEach(a => 
  { if(a.href.startsWith('https://music.youtube.com/watch?')) { 
    list.push({link: a.href, title: a.innerText}) 
  } 
});
*/