# n8n Chat — React

A minimal React (Vite) app embedding the official `@n8n/chat` widget in
fullscreen mode — the whole page is the chat.

## Setup

1. Copy the env example and fill in your webhook URL:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and set:
   ```
   VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-path
   ```
   This is your n8n Chat Trigger node's **Production webhook URL**.
   `.env` is gitignored, so this value never gets committed.

2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL Vite prints (usually `http://localhost:5173`). The chat
   fills the whole page.

If `VITE_N8N_WEBHOOK_URL` isn't set, the app shows a setup message instead
of a broken chat.

## CORS

On the Chat Trigger node in n8n, add `http://localhost:5173` (or your dev
server's origin) to the Allowed Origins / CORS setting, or the browser will
block requests even with a correct webhook URL.

## Build for production

```bash
npm run build
npm run preview   # serve the production build locally to test it
```

The build output lands in `dist/` — deploy that folder anywhere that serves
static files. Set `VITE_N8N_WEBHOOK_URL` as an environment variable in your
hosting provider's build settings (Vercel, Netlify, etc.) rather than
relying on a local `.env` file in production.
