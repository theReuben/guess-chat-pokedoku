# Pokédoku - Discord Edition

A Pokédoku clone where Discord server members create grids for each other to solve, then guess who made each one.

## How It Works

1. **Create a Round** — Someone starts a new round
2. **Submit Grids** — Each player creates a 3x3 Pokédoku grid by picking row/column categories and filling in valid Pokémon answers
3. **Play** — Once submissions close, everyone solves each other's grids and guesses who created each one
4. **Reveal** — See the results: how many cells each player got right, and how many author guesses were correct

## Categories

Grids use a variety of Pokémon traits as row/column categories:
- **Types** — Fire, Water, Grass, etc.
- **Generations** — Gen 1 through Gen 9
- **Egg Groups** — Monster, Dragon, Field, etc.
- **Evolution Methods** — Stone, Trade, Friendship, Level Up, Mega
- **Status** — Legendary, Mythical, Starter, Fossil, Baby, Ultra Beast, Paradox

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your Discord OAuth credentials
4. `npm run dev`

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 and add redirect URL: `http://localhost:3000/api/auth/callback/discord`
4. Copy the Client ID and Client Secret to your `.env`
5. Generate an auth secret: `npx auth secret`

## Tech Stack

- **Next.js** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SQLite** (via better-sqlite3)
- **NextAuth.js** with Discord provider
