# Najdi Arabic Tutor

Learn Najdi Arabic with structured drills (Sarf/Nahw), progress tracking, and Cursor Cloud Agent integration.

## What's included

- **Saudi-Arabic/** — learning content, tracker, framework
- **web/** — mobile PWA (install to home screen)
- **.cursor/rules/** — Cursor tutor rules for drills & passages

## Mobile PWA

```bash
cd web
npm install
npm run dev
```

Open on your phone (same Wi‑Fi) or deploy to GitHub Pages (automatic on push).

**Install:** browser menu → Add to Home Screen / Install app.

## Cursor Cloud (live drills)

1. Push this repo to GitHub
2. Open [cursor.com/agents](https://cursor.com/agents) on your phone
3. Connect repo `mfaisalext-afk/najdi-arabic`
4. Type commands: `drill verb قال`, `passage`, `coverage`

## Commands

| Command | Purpose |
|---------|---------|
| `drill word [word]` | Classify & drill any word |
| `drill root [root]` | Sarf root family |
| `drill verb [verb]` | Full conjugation |
| `passage` / `maqta` | Translation exercise |
| `coverage` / `stats` | Verb/root counts |

## Project size

~500 KB of learning content — well within free GitHub & Pages limits.
