# Redeemy Admin

Internal admin dashboard for [Redeemy](https://github.com/MotiAtiya/Redeemy), the Hebrew-first iOS/Android app for managing personal financial records.

This is a separate Next.js web app that reads from the same Firebase project as the mobile app, gated by a single-email allowlist.

**Status:** V1 in progress. Story 18.1 (Foundation, Auth, Theme) — see `_bmad-output/implementation-artifacts/18-1-*.md` in the mobile-app repo.

---

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS 4 (CSS-first `@theme` config)
- Firebase Admin SDK (server-side reads)
- Firebase Web SDK (client login only)
- next-intl (Hebrew/English with RTL/LTR)
- jose (signed JWT session cookies, Edge-compatible)
- lucide-react (icons)

---

## Local development

### 1. Install

```bash
npm install
```

### 2. Configure `.env.local`

Copy `.env.example` to `.env.local` and fill in the values. The Firebase Admin credentials must come from a service account JSON downloaded from the Firebase Console.

> ⚠️ **Security:** the `FIREBASE_ADMIN_PRIVATE_KEY` grants full administrative access to your Firebase project. Treat it like a database password. Never commit it. If it ever leaks, immediately rotate it: Firebase Console → Project Settings → Service Accounts → Manage keys → delete the leaked key and generate a new one.

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>. You will be redirected to `/login`. Sign in with an email that is in `ADMIN_EMAILS`. Any other email is rejected with "Access denied."

### 4. Type-check + build

```bash
npx tsc --noEmit
npm run build
```

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Set every variable from `.env.example` in **Vercel → Project → Settings → Environment Variables → Production**. For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the value with literal `\n` characters (not real newlines).
4. Deploy. Vercel auto-builds on push to `main`.

---

## Architecture notes

- **Auth gate:** Firebase Auth (web SDK) on the client → ID token POSTed to `/api/auth/session` → server verifies via `firebase-admin`, checks `ADMIN_EMAILS` allowlist, sets a signed HTTP-only session cookie. Middleware enforces the cookie on every page except `/login` and `/api/auth/*`.
- **Data access:** all Firestore reads happen server-side via `firebaseAdmin`. The browser never reads Firestore directly.
- **i18n:** locale is stored in `NEXT_LOCALE` cookie; defaults to Hebrew. RTL/LTR is set on `<html dir>` per request.
- **Theme:** Sage palette (mirrors the mobile app's `src/constants/colors.ts`). Light mode only in V1.

---

## Roadmap

- ✅ Story 18.1 — Foundation, Auth & Theme
- ⏳ Story 18.2 — User List + Activity Feed (requires mobile-app `events/` collection + `logEvent` helper)
- ⏳ Story 18.3 — Health Banner + Cost Widget
- ⏳ Story 18.4 — Daily Digest Email + Mobile Polish
