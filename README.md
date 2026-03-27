# Pokédoku - Discord Edition

A Pokédoku clone where Discord server members create grids for each other to solve, then guess who made each one.

## How It Works

1. **Create** — Build a 3x3 Pokédoku grid by picking row/column categories and providing an example solution
2. **Manage** — View your grids, edit or delete them, and mark one as your submission for Guess Chat
3. **Play All** — Solve random grids from other users (non-submissions), with the creator shown
4. **Guess Chat** — Solve each player's submission grid and guess who created it. Review your guesses, submit, and see the reveal!

## Categories

Grids use a variety of Pokémon traits as row/column categories:
- **Types** — Fire, Water, Grass, etc.
- **Generations** — Gen 1 through Gen 9
- **Egg Groups** — Monster, Dragon, Field, etc.
- **Evolution Methods** — Stone, Trade, Friendship, Level Up, Mega
- **Status** — Legendary, Mythical, Starter, Fossil, Baby, Ultra Beast, Paradox

## Local Setup

1. Clone the repo
2. `npm install` (requires Node 20+, see `.nvmrc`)
3. Copy `.env.example` to `.env` and fill in your credentials (see below)
4. `npm run fetch-pokemon` — fetches the full Pokémon dataset from PokéAPI (~1000 Pokémon)
5. `npm run dev`

> The app works without step 4 using a curated fallback set (~150 Pokémon), but for the full experience run the fetch script.

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it
3. Go to **OAuth2** and copy the **Client ID** and **Client Secret** to your `.env`
4. Under **Redirects**, add: `http://localhost:3000/api/auth/callback/discord`
5. Generate an auth secret: `npx auth secret`

### Admin Access

Add your Discord user ID to `ADMIN_USER_IDS` in `.env` to access the admin panel at `/admin`. Find your ID by enabling Developer Mode in Discord settings, then right-clicking your name and copying your User ID.

## Deploy to Fly.io

### First-time setup

```bash
# 1. Install the Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Sign up or log in
fly auth signup   # or: fly auth login

# 3. Launch the app (from project root)
fly launch --no-deploy
# This creates the app on Fly.io. Edit fly.toml if you want to change the app name or region.

# 4. Create a persistent volume for the SQLite database
fly volumes create pokedoku_data --region iad --size 1

# 5. Set your secrets (these are your .env values, stored securely on Fly)
fly secrets set \
  DISCORD_CLIENT_ID=your_client_id \
  DISCORD_CLIENT_SECRET=your_client_secret \
  AUTH_SECRET=$(openssl rand -base64 32) \
  NEXTAUTH_URL=https://your-app-name.fly.dev \
  ADMIN_USER_IDS=your_discord_user_id

# 6. Deploy
fly deploy
```

### After deploying

- Update your Discord OAuth redirect URL to: `https://your-app-name.fly.dev/api/auth/callback/discord`
- The app auto-stops when idle and auto-starts on requests (free tier friendly)

### CI/CD with GitHub Actions

Pushes to `main` auto-deploy via the included GitHub Actions workflow. To set it up:

```bash
# Generate a deploy token
fly tokens create deploy -x 999999h
```

Then add `FLY_API_TOKEN` as a secret in your repo: **Settings > Secrets > Actions**.

## Tech Stack

- **Next.js** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SQLite** (via better-sqlite3, persisted on Fly.io volume)
- **NextAuth.js** with Discord provider
- **Fly.io** for hosting
