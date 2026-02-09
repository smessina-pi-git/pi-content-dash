# PI Content Dashboard

A dark-mode content calendar dashboard for The Predictive Index. Pulls live data from two public Google Sheets and displays it as a beautiful, read-only dashboard.

## Before You Start

Both Google Sheets must be **public**. In each sheet:
1. Click Share (top-right)
2. Under "General access", change to "Anyone with the link"
3. Set role to "Viewer"
4. Done.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Deploy to Vercel (recommended, free)

1. Push this folder to a GitHub repo
2. Go to vercel.com, sign in with GitHub
3. Click "New Project" > import your repo
4. Framework preset: Vite (auto-detected)
5. Click Deploy

You'll get a live URL like `pi-dashboard.vercel.app`.

## Deploy to Netlify (also free)

1. Push to GitHub
2. Go to netlify.com, connect repo
3. Build command: `npm run build`
4. Publish directory: `dist`

## How the Google Sheets connection works

The dashboard fetches each sheet as CSV using this public URL:
```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={TAB_GID}
```

No API key needed. It auto-detects your column headers (Title, Author, Status, etc.) and maps them to dashboard fields. It normalizes dates and statuses automatically.

Your two sheets are pre-configured in `src/App.jsx` under `SHEET_SOURCES`.

## Customization

- **Brand Bot URL**: Find `BRAND_BOT_URL="#"` in App.jsx, replace `#` with your Gemini gem link
- **Add more sheets**: Add entries to `SHEET_SOURCES` array
- **Sync interval**: Edit `autoSyncIntervalMs` (default: 300000ms = 5 min)
