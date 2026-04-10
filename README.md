# AITaskFlo

**Automation. Intelligence. Scale.**

AITaskFlo is an AI-native platform powered by **Lyra** — a multi-agent assistant that thinks, trades, builds games, and learns alongside you.

🌐 **Live:** [aitaskflo.com](https://www.aitaskflo.com)

---

## What Lyra can do

| Capability | Description |
|---|---|
| **Chat & Agents** | Multi-model routing (Claude, Groq, Grok, OpenAI, Ollama) with full tool use |
| **Trading** | Alpaca stock trading + Oracle market intelligence + strategy backtester |
| **Game Dev** | Build & iterate Godot 4 games via natural language |
| **Browser Automation** | Playwright-powered autonomous browsing & game walkthroughs |
| **Knowledge Base** | RAG document store for white-label businesses |
| **Social Feed** | Auto-generate and post content to X from Lyra's learnings |
| **Adaptive Learning** | Lyra silently adapts her teaching style to each user over time |
| **PDF Generation** | Generate books, reports, and comics with React PDF |
| **White-label Chat** | Embed Lyra on any site with custom branding, tools, and a private KB |
| **CRM** | HubSpot integration — contacts, deals, tasks |
| **Google Workspace** | Gmail, Calendar, Drive via OAuth |
| **Media Generation** | Images, video, TTS, and music via fal.ai |
| **Logistics** | Trucker mode — load search + HOS compliance |

---

## Tech stack

- **Framework:** Next.js 16 (App Router, React 18)
- **AI:** Anthropic Claude, Groq, Grok, OpenAI, Ollama
- **Auth:** NextAuth v5
- **Database:** better-sqlite3
- **Payments:** Stripe
- **Styling:** Tailwind CSS v4, Framer Motion
- **Deployment:** Vercel

---

## Getting started

```bash
git clone https://github.com/rcastrejon91/aitaskflo-site.git
cd aitaskflo-site
npm install
cp .env.example .env.local
# Fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env vars

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Core AI (required) |
| `AUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Your deployment URL |

See `.env.example` for the full list of optional integrations (Stripe, fal.ai, HubSpot, Alpaca, Google OAuth, etc).

---

## White-label

Any business can embed Lyra with custom branding, a restricted tool set, and a private knowledge base:

```
POST /api/wl/[your-slug]/chat
```

Upload documents to `/api/kb` and Lyra automatically answers customer questions from them.

---

## License

MIT
