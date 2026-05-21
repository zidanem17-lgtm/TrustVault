# TrustVault

AI-powered estate planning platform. Create legally structured documents — Last Will & Testament, Revocable Living Trust, Power of Attorney, and Healthcare Directive — through a guided AI interview.

> **Disclaimer:** TrustVault generates document drafts for informational purposes only. All output must be reviewed by a licensed attorney before execution.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Lucide React |
| Backend | Node.js, Express |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Fonts | Instrument Serif, Outfit, JetBrains Mono, Lora |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/trustvault.git
cd trustvault
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run

```bash
npm run dev
```

This starts both the Vite dev server (`localhost:5173`) and the Express proxy (`localhost:3001`) concurrently. Open [http://localhost:5173](http://localhost:5173).

---

## Production Build

```bash
npm run build       # Compiles frontend to /dist
NODE_ENV=production npm start   # Serves /dist + API proxy on port 3001
```

---

## Deploy to Railway

1. Push this repo to GitHub.
2. Create a new project at [railway.app](https://railway.app) → **Deploy from GitHub repo**.
3. In **Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
   - `NODE_ENV` = `production`
4. Railway auto-detects the `start` script and deploys.

The Express server serves the built frontend and handles API proxying in a single process — no separate static hosting needed.

---

## Project Structure

```
trustvault/
├── src/
│   ├── main.jsx          # React entry point
│   ├── index.css         # Global styles and animations
│   └── TrustVault.jsx    # Main application component
├── server/
│   └── index.js          # Express API proxy
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## How It Works

1. User selects a document type on the home screen.
2. The app initiates an AI-guided interview — Claude asks one question at a time, collecting all required fields.
3. When the interview completes, the user clicks **Generate Document**.
4. Claude drafts a complete, structured legal document based on the collected answers.
5. The user can download it as a print-ready `.html` file.

All Anthropic API calls are routed through the Express backend (`/api/claude`), keeping the API key server-side only.

---

## Document Types

| Document | Fields Collected |
|----------|-----------------|
| Last Will & Testament | Name, executor, beneficiaries, guardians, bequests, funeral wishes |
| Revocable Living Trust | Grantor, trustee, beneficiaries, assets, incapacity provisions |
| Power of Attorney | Principal, agent, scope, powers, durability, expiration |
| Healthcare Directive | Principal, agent, life support, CPR, organ donation, special instructions |

---

## License

MIT
