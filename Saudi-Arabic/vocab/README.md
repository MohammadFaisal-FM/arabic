# Vocab libraries

Three word-type libraries used by the app tabs. They **overlap** with Roots for content words.

| Tab | Folder | Count | Notes |
|-----|--------|------:|-------|
| **Ism** | [ism/](ism/) | 3015 | Nouns + loanwords |
| **Fiʿl** | [fil/](fil/) | 121 | Verbs (from roots) |
| **Ḥarf** | [harf/](harf/) | 48 | Particles (no roots) |

Edit sources:
- `ism-source.json`
- `harf-source.json`
- Fiʿl is generated from `../roots/roots-source.json`

Then run:

```bash
node web/scripts/generate-roots.mjs
node web/scripts/generate-vocab.mjs
```
