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

### Turso Database Setup

1. Sign up at [turso.tech](https://turso.tech) and install the CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Create a database: `turso db create pokedoku`
3. Get the URL: `turso db show pokedoku --url`
4. Create a token: `turso db tokens create pokedoku`
5. Add both to your `.env` as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

> For local development without Turso, leave `TURSO_DATABASE_URL` unset and it will use a local SQLite file (`local.db`).

### Admin Access

Add your Discord user ID to `ADMIN_USER_IDS` in `.env` to access the admin panel at `/admin`. Find your ID by enabling Developer Mode in Discord settings, then right-clicking your name and copying your User ID.

## Deploy to Vercel

### First-time setup

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add environment variables in the Vercel dashboard:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `AUTH_SECRET` (generate with `npx auth secret`)
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_USER_IDS`
4. Deploy

### After deploying

- Update your Discord OAuth redirect URL to: `https://your-app.vercel.app/api/auth/callback/discord`
- Update `NEXTAUTH_URL` in Vercel env vars to your production URL

### CI/CD with GitHub Actions

Pushes to `main` auto-deploy via the included GitHub Actions workflow. To set it up:

1. Get a Vercel token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Add `VERCEL_TOKEN` as a secret in your repo: **Settings > Secrets > Actions**
3. Link your project: `vercel link` (this creates `.vercel/project.json`)
4. Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json` as repo secrets

## Tech Stack

- **Next.js** with App Router
- **TypeScript**
- **Tailwind CSS**
- **Turso** (hosted SQLite via @libsql/client)
- **NextAuth.js** with Discord provider
- **Vercel** for hosting
