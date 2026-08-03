# Hans Wehr → App progress

Walk Hans Wehr in order. **Skip** roots not used in daily Saudi/Najdi (do not add to app). **Add** only daily-useful roots.

| Metric | Count |
|--------|------:|
| Hans Wehr roots (approx.) | **~3000** |
| Reviewed | 12 |
| Skipped (not daily) | 6 |
| Added to app | 6 |
| Already in app (passed) | 1 |
| Remaining (approx.) | ~2988 |

## Log

| # | Root | Wehr gloss | Daily Saudi? | Action |
|--:|------|------------|--------------|--------|
| 1 | أ-ب-ب | yearn / long for | no | skipped |
| 2 | أ-ب-د | eternity; **أبداً** never | yes (ism) | added `abd` (ism-only) |
| 3 | أ-ب-ر | needle / prick; **إبرة** | yes (ism) | added `abr` (ism-only) |
| 4 | أ-ب-ق | runaway / escape (slave) | no | skipped |
| 5 | أ-ب-ل | camels; **إبل** | maybe (ism) | added `abl` (ism-only) |
| 6 | إبليس | Satan / devil | no | skipped |
| 7 | أ-ب-ن | **ابن** son / bin | yes (ism) | added `abn` (ism-only) |
| 8 | أ-ب-ه | pay attention / pomp (**أبهة**) | no | skipped |
| 9 | أ-ب-و | **أب / أبو** father | yes (ism) | added `abw` (ism-only) |
| 10 | أ-ب-ي | **أبى / يأبى** refuse | no | skipped |
| 11 | أ-ت-ي | **أتى** come | yes | already `aty` — passed |
| 12 | أ-ث-ر | **أثر / أثّر** effect | yes | added `athr` (Form II fiʿl) |

## Status

**Paused** — focus on existing app roots (review / drill), not Wehr intake.

## Resume Wehr at

**#13 أ-ث-ل** — tamarisk / be firmly rooted (**أثل**) · daily: **no**  
Then **#14 أ-ث-م** — sin / guilt (**إثم**) · daily: **maybe** (religious)

## Rule

- Daily = yes → add to `roots-source.json` + `npm run content`
- Daily = no → log as skipped only
- **Fiʿl only if people actually conjugate it in Saudi talk.** Dictionary verbs that nobody uses stay off the Fiʿl tab (`formI: "—"`, `forms: []`) — ism/adverb only (like أب، ابن، إبرة، أبداً).
- Already in app → say **skip n next** (or **keep n next** to leave as-is and continue)
- **Root revisit workflow:** Root page is the hub. Everyday **fiʿl** → Fiʿl tab link; everyday **ism** → Ism tab link. On revisit/discovery, update `roots-source.json` (and forms/isms) so Fiʿl + Ism tabs stay in sync.
- **Fiʿl examples:** every pronoun × past/present/future (24 lines). Prefer curated `conjExamples` (length 24); otherwise short auto frames.
- MSA-only / displaced verbs (أتى، ذهب، رأى، رغب، وضع، وجد) stay **ism-only**; conjugate Najdi doubles (جا، راح، شاف، بغى، حط، لقى) instead.
