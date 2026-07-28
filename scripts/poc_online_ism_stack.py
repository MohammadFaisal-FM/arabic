import bz2
import json
import re
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path


ROOT = Path(r"c:\Users\USER\Documents\Cursor\Personal Gigs\Arabic")
SAUDI = ROOT / "Saudi-Arabic"
VOCAB = SAUDI / "vocab"

WIKTIONARY_API = "https://en.wiktionary.org/w/api.php"
TATOEBA_BZ2 = "https://downloads.tatoeba.org/exports/per_language/ara/ara_sentences.tsv.bz2"

AR_ONLY = re.compile(r"[^\u0621-\u064A]")
UA = {"User-Agent": "ArabicIsmPoC/1.0 (local project script)"}


def normalize_ar(word: str) -> str:
    word = AR_ONLY.sub("", word)
    word = (
        word.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ى", "ي")
        .replace("ة", "ه")
    )
    return word.strip()


def load_existing_ism():
    data = json.loads((VOCAB / "ism-source.json").read_text(encoding="utf-8"))
    return {normalize_ar(i["arabic"]) for i in data["items"]}


def fetch_wiktionary_arabic_nouns(limit_pages=3, per_page=500):
    nouns = {}
    cmcontinue = None
    pages = 0
    while pages < limit_pages:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Arabic_nouns",
            "cmlimit": str(per_page),
            "format": "json",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue
        url = WIKTIONARY_API + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=45) as r:
            payload = json.loads(r.read().decode("utf-8", errors="ignore"))
        for item in payload.get("query", {}).get("categorymembers", []):
            title = item.get("title", "")
            n = normalize_ar(title)
            if len(n) >= 3 and n not in nouns:
                nouns[n] = title
        cmcontinue = payload.get("continue", {}).get("cmcontinue")
        pages += 1
        if not cmcontinue:
            break
    return nouns


def stream_tatoeba_word_counts(max_lines=120000):
    counts = Counter()
    example = {}
    req = urllib.request.Request(TATOEBA_BZ2, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        decompressor = bz2.BZ2Decompressor()
        pending = ""
        lines = 0
        while lines < max_lines:
            chunk = r.read(65536)
            if not chunk:
                break
            text = decompressor.decompress(chunk).decode("utf-8", errors="ignore")
            pending += text
            rows = pending.split("\n")
            pending = rows.pop() if rows else ""
            for row in rows:
                parts = row.split("\t")
                if len(parts) < 3:
                    continue
                sent = parts[2]
                lines += 1
                if lines > max_lines:
                    break
                for token in sent.split():
                    n = normalize_ar(token)
                    if len(n) < 3:
                        continue
                    counts[n] += 1
                    if n not in example and len(sent) <= 120:
                        example[n] = sent
    return counts, example


def main():
    existing_ism = load_existing_ism()
    wiki_nouns = fetch_wiktionary_arabic_nouns(limit_pages=3, per_page=500)
    counts, examples = stream_tatoeba_word_counts(max_lines=120000)

    candidates = []
    for noun, raw_title in wiki_nouns.items():
        if noun in existing_ism:
            continue
        c = counts.get(noun, 0)
        # POC confidence rule: noun in Wiktionary + used in Tatoeba sample >= 3
        if c >= 3:
            candidates.append(
                {
                    "arabic_norm": noun,
                    "wiktionary_title": raw_title,
                    "tatoeba_count": c,
                    "example": examples.get(noun, ""),
                    "sources": ["wiktionary:Category:Arabic_nouns", "tatoeba:ara_sentences.tsv"],
                    "confidence": "high-poc",
                }
            )

    candidates.sort(key=lambda x: (-x["tatoeba_count"], x["arabic_norm"]))
    top = candidates[:80]

    out = {
        "summary": {
            "wiktionary_nouns_collected": len(wiki_nouns),
            "tatoeba_lines_scanned": 120000,
            "existing_ism_count": len(existing_ism),
            "poc_candidates_found": len(candidates),
        },
        "candidates": candidates,
    }

    out_json = VOCAB / "ism-candidates-online-poc.json"
    out_json.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    out_md = VOCAB / "ism-candidates-online-poc.md"
    md_lines = [
        "# ISM Online PoC Candidates",
        "",
        f"- Wiktionary nouns collected: **{len(wiki_nouns)}**",
        "- Tatoeba lines scanned: **120000**",
        f"- Existing ism count: **{len(existing_ism)}**",
        f"- Verified candidates (Wiktionary + Tatoeba>=3): **{len(candidates)}**",
        "",
        "| # | Arabic (normalized) | Tatoeba count | Example |",
        "|---|---|---:|---|",
    ]
    for idx, c in enumerate(top, start=1):
        ex = c["example"].replace("|", "/")
        md_lines.append(f"| {idx} | {c['arabic_norm']} | {c['tatoeba_count']} | {ex} |")
    out_md.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")
    print(f"Candidates: {len(candidates)}")


if __name__ == "__main__":
    main()
