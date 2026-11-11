# PantryIQ 🧠🥗

> AI-powered pantry management and waste-aware recipe generation

## Tech Stack
- **Mobile:** React Native (Expo 51) + TypeScript + NativeWind v4
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **State:** Zustand + TanStack React Query v5
- **AI:** Google Gemini 2.5 Flash (multimodal vision + recipe gen)
- **Cache:** Upstash Redis

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Expo CLI

### Setup
1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your keys
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm db:migrate`
6. `pnpm api` — start backend
7. `pnpm mobile` — start Expo

## Project Structure
```
apps/
  mobile/   — Expo React Native app
  api/      — Express API server
packages/
  database/ — Prisma schema & client
```
