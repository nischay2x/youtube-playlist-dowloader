# YouTube Music Downloader

A self-hosted, web-based downloader for YouTube and YouTube Music. It allows you to download entire playlists or single tracks as high-quality `mp3` files, complete with a beautiful UI and real-time download progress tracking.

## Features
- **YouTube Playlist Downloader**: Fetches all videos from public or private playlists using the YouTube Data API.
- **Single Item Downloader**: Download individual videos/songs by URL with an optional custom folder destination.
- **Real-Time Progress Tracking**: Uses Server-Sent Events (SSE) to update the frontend UI with live download statuses (e.g., Pending, Downloading, Downloaded, Error). 
- **Google OAuth Login**: Authorize the app to read your personal YouTube playlists directly.
- **Folder Organization**: Automatically creates folders for playlists inside the `downloads/` directory to keep your music organized.

## Prerequisites
- **Node.js**: Requires Node > v16
- **FFmpeg**: Required by `youtube-dl-exec` for audio extraction and conversion. Ensure FFmpeg is installed and added to your system's PATH.
- **Google API Credentials**: You must configure a Google Cloud Project with the YouTube Data API v3 enabled (instructions below).

## Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/nischay2x/ytm-downloader.git
cd ytm-downloader
npm install
```

### 2. Google OAuth API Setup
To use the playlist downloader, the app needs permission to read YouTube data on your behalf. You must provide Google OAuth credentials.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** (or the project dropdown menu) at the top -> **New Project**. Give it a name like `ytm-downloader-app` and click **Create**.
3. In the left sidebar, go to **APIs & Services** -> **Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. In the left sidebar, go to **APIs & Services** -> **OAuth consent screen**.
   - Select **External** (or Internal if you have a Google Workspace) and click Create.
   - Fill out the App Name, Support email, and Developer contact information. Click **Save and Continue**.
   - Under Scopes, you can skip adding scopes here. Click **Save and Continue**.
   - **Crucial Step**: Under **Test users**, click **Add Users** and enter the Google Email address you will use to log into the downloader app. (While the app is in "Testing" mode, only these emails can log in). Click Save.
6. In the left sidebar, go to **APIs & Services** -> **Credentials**.
   - Click **+ CREATE CREDENTIALS** -> **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `YTM Downloader` (or whatever you prefer).
   - Under **Authorized redirect URIs**, click **+ ADD URI** and enter:
     `http://localhost:5000/auth/callback/google`
   - Click **Create**.
7. In the popup that appears, click **DOWNLOAD FULL JSON**.
8. Rename the downloaded file to `google-auth.json` and place it inside the `config/` directory of your project (e.g., `ytm-downloader/config/google-auth.json`).

*Note: If `config/google-auth.json` is missing, the app will crash on startup.*

### 3. Usage

Start the Node.js server:
```bash
npm start
```
1. Open up your browser and navigate to `http://localhost:5000`.
2. Upon your first visit, you will be redirected to the Google Login screen. Log in using the same email address you added to the "Test users" list in Step 2.
3. Once logged in, you can start pasting YouTube URLs and watching the real-time download magic happen! All `.mp3` files will be saved in the `downloads/` folder.

## Technologies Used
- Express.js
- EJS (Embedded JavaScript Templating)
- Bootstrap 4
- `youtube-dl-exec` (Wrapper for yt-dlp)
- Google Auth Library (`google-auth-library`) & Axios

## License
ISC