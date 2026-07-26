# Najdi Arabic Tutor

Structured course for **English speakers**: script → parts of speech → Sarf/Nahw → conversational Najdi.

## Live app

**PWA:** https://mfaisalext-afk.github.io/najdi-arabic/

**Repo:** https://github.com/mfaisalext-afk/najdi-arabic

## Course structure

| Phase | Modules | What you learn |
|-------|---------|----------------|
| **Start** | 0 | How Arabic differs from English |
| **Basics** | 1–2 | Alphabet; **ism**, **fi'l**, **harf** (noun, verb, particle) |
| **Grammar** | 3–4 | **Sarf** (roots, verbs) + **Nahw** (sentences) |
| **Najdi** | 5–6 | Family vocabulary → conversation |

**Start here:** [Saudi-Arabic/course/00-start/00-welcome.md](Saudi-Arabic/course/00-start/00-welcome.md)

**Full map:** [Saudi-Arabic/course/COURSE-MAP.md](Saudi-Arabic/course/COURSE-MAP.md)

**Progress:** [Saudi-Arabic/course-progress.md](Saudi-Arabic/course-progress.md)

---

## English → Arabic grammar map

| English term | Arabic term |
|--------------|-------------|
| Noun, pronoun, adjective | **اسم** (ism) |
| Verb | **فعل** (fi'l) |
| Preposition, conjunction, negation | **حرف** (harf) |
| Word formation / morphology | **صرف** (Sarf) |
| Sentence grammar / syntax | **نحو** (Nahw) |
| Verbal noun | **مصدر** (masdar) |
| Active participle | **اسم فاعل** |
| Passive participle | **اسم مفعول** |
| Root | **جذر** (3-letter base) |

---

## Lyrics library

Songs shared or discovered on the journey live under `Saudi-Arabic/lyrics/` and on the app **Lyrics** tab.

Paste lyrics or a song name in chat (or type `add lyrics`) — they are saved, indexed, and **pushed to GitHub Pages**.

| Command | Purpose |
|---------|---------|
| `add lyrics` | Save a new song |
| `lyrics` / `list songs` | Show the library |

---

## Cursor Agent commands

| Command | Purpose |
|---------|---------|
| `next lesson` | Get next course lesson |
| `drill word [word]` | Classify & drill any word |
| `drill root [root]` | Root family (Sarf) |
| `drill verb [verb]` | Full conjugation |
| `passage` | Translation exercise |
| `coverage` | Verb/root counts |
| `add lyrics` | Add & publish a song |

**Mobile drills:** [cursor.com/agents](https://cursor.com/agents) → connect repo `najdi-arabic`

---

## Local development

```bash
cd web
npm install
npm run dev
```

Push to `main` auto-deploys PWA via GitHub Actions.

---

## Project layout

```
Saudi-Arabic/course/     ← 28 lessons (Start → Conversational)
Saudi-Arabic/lyrics/     ← song lyrics library (published to PWA)
Saudi-Arabic/course-progress.md
Saudi-Arabic/verb-root-tracker.md
web/                     ← mobile PWA
.cursor/rules/           ← Cursor tutor
```
