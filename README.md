# Trail Break

Professional sim‑racing telemetry analysis for Assetto Corsa.

## Overview
Trail Break is a full‑stack platform that captures telemetry from Assetto Corsa via a Windows client, stores it in the cloud, and renders interactive analysis tools on the web.

- **Frontend**: Next.js App Router, React 19, TailwindCSS
- **API**: tRPC 11, Next.js Route Handlers
- **Auth**: NextAuth (Credentials), Prisma Adapter
- **Database**: Postgres (Neon) via Prisma
- **Telemetry Storage**: Firebase Firestore (per‑lap segmented data)
- **Client**: Windows C# program reading Assetto Corsa UDP + Shared Memory

## Features
- Interactive track map with zoom/pan, hover/freeze, and arrow overlays
- Color‑mapped racing line (speed, pedals, g‑force, grip/performance)
- Authenticated dashboard with list/card views and delete
- Public leaderboard of user‑featured laps
- Publicly viewable lap pages with full analysis
- Account profile with username edits and featured lap selection

## Architecture
```
Assetto Corsa (UDP + Shared Memory)
        │
Windows C# Client (60 Hz capture) → HTTP POST → Next.js tRPC API
        │                                              │
        └──────────────► Firebase Firestore ◄──────────┘
                         (lap + telemetry)

NextAuth (Credentials) + Prisma + Postgres (users, sessions)
```

- Lap metadata and high‑volume telemetry chunks are kept in Firestore
- Users, sessions, and account settings are stored in Postgres via Prisma
- The UI fetches data via tRPC procedures

## Monorepo Layout
- `src/app/` — App Router pages (landing, auth, profile, data, leaderboard, settings)
- `src/server/api/` — tRPC routers (`lap`, `user`, `leaderboard`)
- `src/components/` — UI components (Sidebar, DashboardLayout, TrackMap, ProfileIcon, etc.)
- `src/lib/firebase.ts` — Firebase init and exports
- `prisma/` — Prisma schema and migrations
- `windows-client/` — Windows telemetry client (`Program.cs`)

## Prerequisites
- Node.js 20+
- npm 10+
- A Postgres database (Neon recommended)
- A Firebase project (Firestore enabled)

## Environment Variables
Create `.env.local` in the project root:

Required (server):
- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_SECRET` — Random secret for JWT/session
- `NEXTAUTH_URL` — Base URL (e.g. `http://localhost:3000`)

Firebase (client):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

If any Firebase values are missing, `src/lib/firebase.ts` will throw at startup.

## Install & Develop
```bash
npm install
npx prisma migrate dev
npm run dev
```
- App: `http://localhost:3000`
- Landing: `/landing`
- Sign in/up: `/auth/signin` (supports `?mode=signup`)

Useful scripts:
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run preview` — Build + start
- `npm run check` — Lint + typecheck
- `npm run lint:fix` — Autofix lint issues

## Database (Prisma + NextAuth)
`prisma/schema.prisma` defines:
- `User` — includes `username`, `password` (hash), `featuredLapIds` and timestamps
- `Session`, `Account`, `VerificationToken` — for NextAuth compatibility

Migrate and generate client:
```bash
npx prisma migrate dev
npx prisma generate
```

## Authentication
- Credentials (email/username + password) via NextAuth
- PrismaAdapter for persistence
- Users can sign in using either email or username
- Session is available in tRPC context and client via `useSession`

## Telemetry Client (Windows)
Folder: `windows-client/`
- Reads Assetto Corsa:
  - UDP Remote Telemetry (port 9996)
  - Shared Memory: `acpmf_static`, `acpmf_physics`, `acpmf_graphics`
- Samples at 60 Hz, aggregates points into a lap
- On lap complete: posts `LapData` to the web app at `/api/trpc/lap.create`

Build/Run (Windows):
- Open the solution in Visual Studio or `dotnet build`
- Configure `webAppUrl` in `Program.cs` to your app base URL

## Public Leaderboard & Lap Pages
- `GET` public featured laps via `leaderboard.getFeaturedLaps`
- Public lap detail via `leaderboard.getLapPublic`
- Leaderboard and lap pages are accessible without authentication

## Styling & UI
- TailwindCSS utility classes
- Responsive layouts (grid/list views)
- Sidebar with collapsible state persisted in `localStorage`

## Deployment
- Vercel recommended
- Ensure `postinstall` runs `prisma generate`
- Set env vars in the platform environment
- Add proper Firebase client env vars (NEXT_PUBLIC_*)

## Troubleshooting
- Build error: `useSearchParams() should be wrapped in a suspense boundary`
  - The `/auth/signin` page is wrapped in `<Suspense>` with a fallback to satisfy Next.js requirements
- Lint errors
  - Run `npm run check` and `npm run lint:fix`
- Firestore composite indexes
  - Some queries may require composite indexes; check Firebase console suggestions
- Telemetry not appearing
  - Verify `webAppUrl` in the client, that you’re authenticated, and that `/api/trpc/lap.create` returns success

## License
MIT (c) 2025 Trail Break
